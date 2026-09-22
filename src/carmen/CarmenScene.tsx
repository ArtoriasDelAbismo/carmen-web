import { useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CarmenFace } from './CarmenFace'
import { useElevenLabsVoice } from './useElevenLabsVoice'
import { useRealtimeVoice, type VoiceExpression } from './useRealtimeVoice'
import { useResponsiveZoom } from './useResponsiveZoom'
import { VOICE_PROVIDER } from '../lib/config'
import './CarmenScene.css'

function ResponsiveCamera() {
  const zoom = useResponsiveZoom()
  return <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={zoom} />
}

type CarmenSceneProps = {
  // Shrinks the "Talk to Carmen" button, for when CarmenScene is rendered inside
  // a small container (e.g. embedded in a phone-screen cutout) rather than
  // filling the viewport.
  compact?: boolean
}

export function CarmenScene({ compact = false }: CarmenSceneProps) {
  const happyTargetRef = useRef(0)
  const happyTimeoutRef = useRef<number | null>(null)
  const concernedTargetRef = useRef(0)
  const concernedTimeoutRef = useRef<number | null>(null)
  const sadTargetRef = useRef(0)
  const sadTimeoutRef = useRef<number | null>(null)

  // Driven by Carmen's own set_expression tool calls (see useRealtimeVoice /
  // useElevenLabsVoice) — this is the real signal; it persists until she calls
  // the tool again, no timeout. happy/concerned/sad are mutually exclusive:
  // whichever mood she reports wins, the others snap back to neutral.
  const handleExpressionChange = useCallback((mood: VoiceExpression) => {
    if (happyTimeoutRef.current != null) {
      clearTimeout(happyTimeoutRef.current)
      happyTimeoutRef.current = null
    }
    if (concernedTimeoutRef.current != null) {
      clearTimeout(concernedTimeoutRef.current)
      concernedTimeoutRef.current = null
    }
    if (sadTimeoutRef.current != null) {
      clearTimeout(sadTimeoutRef.current)
      sadTimeoutRef.current = null
    }
    happyTargetRef.current = mood === 'happy' ? 1 : 0
    concernedTargetRef.current = mood === 'concerned' ? 1 : 0
    sadTargetRef.current = mood === 'sad' ? 1 : 0
  }, [])

  // Both hooks are always called (Rules of Hooks) — neither opens a connection
  // until connect() is invoked by a click, so mounting both idle is harmless.
  // VOICE_PROVIDER picks which one actually gets wired up to the UI below.
  const openaiVoice = useRealtimeVoice({ onExpressionChange: handleExpressionChange })
  const elevenLabsVoice = useElevenLabsVoice({ onExpressionChange: handleExpressionChange })
  const { status, error, connect, disconnect, speakRef } =
    VOICE_PROVIDER === 'elevenlabs' ? elevenLabsVoice : openaiVoice

  // Test-only triggers (😊 / 😟 / 🗣️ buttons) — lets you preview expressions
  // without burning voice-API tokens on a live connection.

  // Temporary manual trigger for demoing the happy-eyes animation without a live
  // voice connection — pulses happy for a bit, then reverts. The real signal above
  // (handleExpressionChange) overrides this the moment Carmen calls the tool.
  const triggerHappy = useCallback((durationMs = 2400) => {
    happyTargetRef.current = 1
    if (happyTimeoutRef.current != null) clearTimeout(happyTimeoutRef.current)
    happyTimeoutRef.current = window.setTimeout(() => {
      happyTargetRef.current = 0
    }, durationMs)
  }, [])

  // Same, for the concerned-eyes animation.
  const triggerConcerned = useCallback((durationMs = 2400) => {
    concernedTargetRef.current = 1
    if (concernedTimeoutRef.current != null) clearTimeout(concernedTimeoutRef.current)
    concernedTimeoutRef.current = window.setTimeout(() => {
      concernedTargetRef.current = 0
    }, durationMs)
  }, [])

  // Same, for the sad-eyes animation.
  const triggerSad = useCallback((durationMs = 2400) => {
    sadTargetRef.current = 1
    if (sadTimeoutRef.current != null) clearTimeout(sadTimeoutRef.current)
    sadTimeoutRef.current = window.setTimeout(() => {
      sadTargetRef.current = 0
    }, durationMs)
  }, [])

  const testSpeakRafRef = useRef<number | null>(null)

  // Temporary manual trigger for demoing the speaking look-around animation without a
  // live voice connection. Feeds a synthetic amplitude into the same speakRef the real
  // WebRTC audio analyser drives, so CarmenFace can't tell the difference.
  const triggerTestSpeaking = useCallback(
    (durationMs = 6000) => {
      if (testSpeakRafRef.current != null) cancelAnimationFrame(testSpeakRafRef.current)
      const start = performance.now()
      const tick = (now: number) => {
        const elapsed = now - start
        if (elapsed > durationMs) {
          speakRef.current = 0
          testSpeakRafRef.current = null
          return
        }
        speakRef.current = 0.18 + 0.12 * Math.abs(Math.sin(elapsed * 0.012))
        testSpeakRafRef.current = requestAnimationFrame(tick)
      }
      testSpeakRafRef.current = requestAnimationFrame(tick)
    },
    [speakRef],
  )

  // Whole-screen tap target: tap anywhere to wake Carmen and start talking, tap
  // anywhere again to send her back to sleep. 'error' is treated like 'idle' (tap
  // retries); 'connecting' ignores taps — the overlay button is disabled then.
  const handleTap = useCallback(() => {
    if (status === 'connected') disconnect()
    else if (status !== 'connecting') connect()
  }, [status, connect, disconnect])

  const tapAriaLabel = status === 'connected' ? 'Terminar conversación con Carmen' : 'Hablar con Carmen'

  return (
    <div style={{ width: '100%', height: '100%', background: '#141414', position: 'relative' }}>
      <Canvas orthographic dpr={[1, 2]}>
        <ResponsiveCamera />
        <color attach="background" args={['#141414']} />
        <CarmenFace
          speakRef={speakRef}
          happyTargetRef={happyTargetRef}
          concernedTargetRef={concernedTargetRef}
          sadTargetRef={sadTargetRef}
          asleep={status === 'idle'}
        />
        <EffectComposer>
          <Bloom
            mipmapBlur={false}
            intensity={0.8}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.15}
            radius={0.4}
          />
        </EffectComposer>
      </Canvas>

      <button
        type="button"
        onClick={handleTap}
        disabled={status === 'connecting'}
        aria-label={tapAriaLabel}
        className="carmen-tap-overlay"
      />

      <div className={`carmen-controls ${compact ? 'carmen-controls--compact' : ''}`}>
        {status === 'connecting' && (
          <div className="carmen-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}
        <div className="carmen-controls__row">
          <button
            type="button"
            onClick={() => triggerHappy()}
            title="Temporary manual trigger for the happy-eyes animation"
            className="carmen-btn carmen-btn--ghost"
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => triggerConcerned()}
            title="Temporary manual trigger for the concerned-eyes animation"
            className="carmen-btn carmen-btn--ghost"
          >
            😟
          </button>
          <button
            type="button"
            onClick={() => triggerSad()}
            title="Temporary manual trigger for the sad-eyes animation"
            className="carmen-btn carmen-btn--ghost"
          >
            😢
          </button>
          <button
            type="button"
            onClick={() => triggerTestSpeaking()}
            title="Temporary manual trigger for the speaking look-around animation"
            className="carmen-btn carmen-btn--ghost"
          >
            🗣️
          </button>
        </div>
        {error && <span className="carmen-error">{error}</span>}
      </div>
    </div>
  )
}
