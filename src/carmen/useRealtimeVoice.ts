import { useCallback, useRef, useState } from 'react'
import { BACKEND_URL, DEV_JWT } from '../lib/config'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls'

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

export function useRealtimeVoice() {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)

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

      const audioEl = document.createElement('audio')
      audioEl.autoplay = true
      audioElRef.current = audioEl

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
            session: { turn_detection: { type: 'server_vad' } },
          }),
        )
      })
      dc.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'error') console.error('[realtime event error]', msg)
        } catch {
          // non-JSON payload, ignore
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
