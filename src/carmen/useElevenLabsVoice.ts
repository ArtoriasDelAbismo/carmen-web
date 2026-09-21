import { useCallback, useRef, useState } from 'react'
import { Conversation, type Conversation as ConversationInstance } from '@elevenlabs/client'
import { BACKEND_URL, DEV_JWT } from '../lib/config'

export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'
export type VoiceExpression = 'happy' | 'neutral'

function describeVoiceError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotFoundError') return 'No microphone found on this device/browser.'
    if (err.name === 'NotAllowedError') {
      return 'Microphone access was blocked. Allow it in the browser site settings and try again.'
    }
    if (err.name === 'NotReadableError') return 'The microphone is in use by another app or unavailable.'
  }
  return err instanceof Error ? err.message : 'Failed to connect'
}

// Parallel implementation of useRealtimeVoice, swapped in for the ElevenLabs
// accent evaluation branch — same external shape (status/error/connect/
// disconnect/speakRef) so CarmenScene barely has to change to A/B the two.
export function useElevenLabsVoice(options?: { onExpressionChange?: (mood: VoiceExpression) => void }) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const onExpressionChangeRef = useRef(options?.onExpressionChange)
  onExpressionChangeRef.current = options?.onExpressionChange

  // output-audio amplitude of Carmen's live reply, smoothed 0..1 — read every frame by CarmenFace
  const speakRef = useRef(0)

  const conversationRef = useRef<ConversationInstance | null>(null)
  const rafRef = useRef<number | null>(null)

  const teardown = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    speakRef.current = 0
  }, [])

  const disconnect = useCallback(async () => {
    await conversationRef.current?.endSession()
    conversationRef.current = null
    teardown()
    setStatus('idle')
  }, [teardown])

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return
    setError(null)
    setStatus('connecting')

    try {
      // Request permission explicitly first for a clean, mapped error if denied —
      // the SDK captures the mic itself internally once the session starts.
      await navigator.mediaDevices.getUserMedia({ audio: true })

      const tokenRes = await fetch(`${BACKEND_URL}/api/elevenlabs/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEV_JWT}`,
        },
      })
      if (!tokenRes.ok) {
        throw new Error(`Backend signed-url request failed (${tokenRes.status})`)
      }
      const tokenData = await tokenRes.json()
      const signedUrl: string | undefined = tokenData.signedUrl
      if (!signedUrl) throw new Error('Backend did not return a signed URL')

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        clientTools: {
          set_expression: async ({ mood }: { mood?: string }) => {
            if (mood === 'happy' || mood === 'neutral') {
              onExpressionChangeRef.current?.(mood)
            }
          },
        },
        onStatusChange: ({ status: sdkStatus }) => {
          if (sdkStatus === 'connected') setStatus('connected')
          else if (sdkStatus === 'connecting') setStatus('connecting')
          else if (sdkStatus === 'disconnected') {
            setStatus((current) => (current === 'error' ? current : 'idle'))
          }
        },
        onDisconnect: () => teardown(),
        onError: (message) => {
          console.error('[useElevenLabsVoice] error:', message)
          setError(message)
          setStatus('error')
        },
      })

      conversationRef.current = conversation

      const tick = () => {
        const level = conversationRef.current?.getOutputVolume() ?? 0
        speakRef.current += (level - speakRef.current) * 0.35
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('[useElevenLabsVoice] connect failed:', err)
      teardown()
      setError(describeVoiceError(err))
      setStatus('error')
    }
  }, [status, teardown])

  return { status, error, connect, disconnect, speakRef }
}
