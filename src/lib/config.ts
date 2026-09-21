export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// Temporary stopgap: paste a JWT from cuidarte-ia-backend's existing /api/auth login flow
// into .env.local as VITE_DEV_JWT. Replace with a real login screen before shipping.
export const DEV_JWT = import.meta.env.VITE_DEV_JWT ?? ''

// Which voice provider CarmenScene connects to. Defaults to the known-working
// OpenAI path — VITE_VOICE_PROVIDER must be set to "elevenlabs" explicitly to
// opt into the accent-quality experiment, so a missing/misconfigured env var
// fails safe to OpenAI rather than silently trying the newer, less-proven path.
export type VoiceProvider = 'openai' | 'elevenlabs'
export const VOICE_PROVIDER: VoiceProvider =
  import.meta.env.VITE_VOICE_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'openai'
