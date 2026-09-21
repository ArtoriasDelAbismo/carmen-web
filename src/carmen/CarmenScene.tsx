import { useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CarmenFace } from './CarmenFace'
import { useRealtimeVoice, type VoiceExpression } from './useRealtimeVoice'

export function CarmenScene() {
  const happyTargetRef = useRef(0)
  const happyTimeoutRef = useRef<number | null>(null)

  // Driven by Carmen's own set_expression tool calls (see useRealtimeVoice) — this
  // is the real signal; it persists until she calls the tool again, no timeout.
  const handleExpressionChange = useCallback((mood: VoiceExpression) => {
    if (happyTimeoutRef.current != null) {
      clearTimeout(happyTimeoutRef.current)
      happyTimeoutRef.current = null
    }
    happyTargetRef.current = mood === 'happy' ? 1 : 0
  }, [])

  const { status, error, connect, disconnect, speakRef } = useRealtimeVoice({
    onExpressionChange: handleExpressionChange,
  })

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

  const label =
    status === 'connected'
      ? 'End conversation'
      : status === 'connecting'
        ? 'Connecting…'
        : 'Talk to Carmen'

  return (
    <div style={{ width: '100%', height: '100%', background: '#141414', position: 'relative' }}>
      <Canvas orthographic camera={{ zoom: 140, position: [0, 0, 10] }} dpr={[1, 2]}>
        <color attach="background" args={['#141414']} />
        <CarmenFace speakRef={speakRef} happyTargetRef={happyTargetRef} />
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

      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={status === 'connected' ? disconnect : connect}
            disabled={status === 'connecting'}
            style={{
              padding: '12px 28px',
              borderRadius: 999,
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: status === 'connecting' ? 'default' : 'pointer',
              background: status === 'connected' ? '#e05a3a' : '#ff9a33',
              color: '#1a1200',
              opacity: status === 'connecting' ? 0.7 : 1,
            }}
          >
            {label}
          </button>
          <button
            type="button"
            onClick={() => triggerHappy()}
            title="Temporary manual trigger for the happy-eyes animation"
            style={{
              padding: '12px 20px',
              borderRadius: 999,
              border: '1px solid #ff9a33',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              color: '#ff9a33',
            }}
          >
            😊
          </button>
          <button
            type="button"
            onClick={() => triggerTestSpeaking()}
            title="Temporary manual trigger for the speaking look-around animation"
            style={{
              padding: '12px 20px',
              borderRadius: 999,
              border: '1px solid #ff9a33',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              color: '#ff9a33',
            }}
          >
            🗣️
          </button>
        </div>
        {error && <span style={{ color: '#ff8080', fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  )
}
