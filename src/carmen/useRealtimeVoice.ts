import { useCallback, useRef, useState } from 'react'
import { BACKEND_URL, DEV_JWT } from '../lib/config'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

// Lets Carmen silently signal her mood alongside her spoken reply — see the
// "Acciones disponibles" block in the backend's carmen.md prompt for when she's
// instructed to call it.
const SET_EXPRESSION_TOOL = {
  type: 'function',
  name: 'set_expression',
  description:
    "OBLIGATORIA en cada turno, sin excepción: cambia la expresión de tus ojos para reflejar tu estado de ánimo. Llamala SIEMPRE justo antes o en paralelo a cada respuesta hablada, incluso cuando el resultado es 'neutral' — nunca respondas sin haberla llamado primero. No es una acción real, es puramente visual y silenciosa.",
  parameters: {
    type: 'object',
    properties: {
      mood: {
        type: 'string',
        enum: ['happy', 'concerned', 'neutral'],
        description: 'El estado de ánimo a reflejar en tus ojos ahora mismo.',
      },
    },
    required: ['mood'],
  },
}

export type VoiceExpression = 'happy' | 'concerned' | 'neutral'

function describeVoiceError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotFoundError') {
      return 'No microphone found on this device/browser.'
    }
    if (err.name === 'NotAllowedError') {
      return 'Microphone access was blocked. Allow it in the browser site settings and try again.'
    }
    if (err.name === 'NotReadableError') {
      return 'The microphone is in use by another app or unavailable.'
    }
  }
  return err instanceof Error ? err.message : 'Failed to connect'
}

export function useRealtimeVoice(options?: { onExpressionChange?: (mood: VoiceExpression) => void }) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // ref (not a dep of connect) so the callback can change across renders without reconnecting
  const onExpressionChangeRef = useRef(options?.onExpressionChange)
  onExpressionChangeRef.current = options?.onExpressionChange

  // audio amplitude of Carmen's live reply, smoothed 0..1 — read every frame by CarmenFace
  const speakRef = useRef(0)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null

    dcRef.current?.close()
    dcRef.current = null

    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop())
    pcRef.current?.close()
    pcRef.current = null

    micStreamRef.current?.getTracks().forEach((track) => track.stop())
    micStreamRef.current = null

    if (audioElRef.current) {
      audioElRef.current.pause()
      audioElRef.current.srcObject = null
      audioElRef.current = null
    }

    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null

    speakRef.current = 0
  }, [])

  const disconnect = useCallback(() => {
    teardown()
    setStatus('idle')
  }, [teardown])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return
    setError(null)
    setStatus('connecting')

    // Create + "unlock" the audio element synchronously, still inside the click
    // gesture that called connect(). iOS Safari blocks .play() on elements whose
    // playback wasn't associated with a user gesture — and the real srcObject
    // only becomes available later inside pc.ontrack, well after every await
    // below has left that gesture's call stack.
    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    audioElRef.current = audioEl
    audioEl.play().catch(() => {})

    try {
      const tokenRes = await fetch(`${BACKEND_URL}/api/realtime/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEV_JWT}`,
        },
      })
      if (!tokenRes.ok) {
        throw new Error(`Backend session request failed (${tokenRes.status})`)
      }
      const tokenData = await tokenRes.json()
      const ephemeralKey: string | undefined = tokenData.value
      if (!ephemeralKey) throw new Error('Backend did not return a realtime token')

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams
        audioEl.srcObject = remoteStream
        audioEl.play().catch(() => {})

        const audioCtx = new AudioContext()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(remoteStream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          analyser.getByteFrequencyData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) sum += data[i]
          const level = sum / data.length / 255
          speakRef.current += (level - speakRef.current) * 0.35
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
      }

      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = micStream
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream))

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc
      dc.addEventListener('open', () => {
        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              turn_detection: { type: 'server_vad' },
              tools: [SET_EXPRESSION_TOOL],
              // Without this explicit, tools may be *defined* but not actually
              // callable — which would explain the model narrating the tool's
              // name in speech instead of invoking it as a real function call.
              tool_choice: 'auto',
            },
          }),
        )
      })
      dc.addEventListener('message', (event) => {
        let msg: any
        try {
          msg = JSON.parse(event.data)
        } catch {
          return // non-JSON payload, ignore
        }

        if (msg.type === 'error') {
          console.error('[realtime event error]', msg)
          return
        }

        if (msg.type === 'response.done') {
          const outputItems = msg.response?.output ?? []
          // Visibility into what the model actually sent, not just what we handle —
          // if "function_call" never appears here, she's narrating the tool instead
          // of invoking it, whatever the transcript/audio sounds like.
          console.debug(
            '[useRealtimeVoice] response.done output types:',
            outputItems.map((i: any) => i?.type),
          )
          for (const item of outputItems) {
            if (item?.type !== 'function_call' || item?.name !== 'set_expression') continue

            let mood: VoiceExpression | undefined
            try {
              mood = JSON.parse(item.arguments ?? '{}').mood
            } catch {
              console.error('[useRealtimeVoice] bad set_expression arguments:', item.arguments)
            }
            console.debug('[useRealtimeVoice] set_expression called with mood:', mood)
            if (mood === 'happy' || mood === 'concerned' || mood === 'neutral') {
              onExpressionChangeRef.current?.(mood)
            }

            // acknowledge so the call doesn't dangle in conversation state — no
            // response.create after it, since she shouldn't say anything about it
            dc.send(
              JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: item.call_id,
                  output: '{"ok":true}',
                },
              }),
            )
          }
        }
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(OPENAI_REALTIME_CALLS_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      })
      if (!sdpRes.ok) {
        throw new Error(`OpenAI SDP exchange failed (${sdpRes.status})`)
      }
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setStatus('connected')
    } catch (err) {
      console.error('[useRealtimeVoice] connect failed:', err)
      teardown()
      setError(describeVoiceError(err))
      setStatus('error')
    }
  }, [status, teardown])

  return { status, error, connect, disconnect, speakRef }
}
