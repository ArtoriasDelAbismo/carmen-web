export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// Temporary stopgap: paste a JWT from cuidarte-ia-backend's existing /api/auth login flow
// into .env.local as VITE_DEV_JWT. Replace with a real login screen before shipping.
export const DEV_JWT = import.meta.env.VITE_DEV_JWT ?? ''

// Temporary, until it's decided how a Carmen session is tied to a patient: which
// patient Carmen talks to. Empty → the backend's CARMEN_DEFAULT_PATIENT_ID (or no
// patient data at all). The caregiver behind DEV_JWT must be assigned to it.
export const PATIENT_ID: string | undefined = import.meta.env.VITE_PATIENT_ID || undefined

// "carmen-test" points the ElevenLabs path at the test copy of Carmen's agent;
// empty → the production agent.
export const ELEVENLABS_ASSISTANT: string | undefined = import.meta.env.VITE_ELEVENLABS_ASSISTANT || undefined

// Body for the backend's session endpoints (/api/elevenlabs/signed-url, /api/realtime/session).
export function carmenSessionBody(assistant?: string): string {
  return JSON.stringify({
    ...(assistant && { assistant }),
    ...(PATIENT_ID && { patientId: PATIENT_ID }),
  })
}

// Which voice provider CarmenScene connects to. Defaults to the known-working
// OpenAI path — VITE_VOICE_PROVIDER must be set to "elevenlabs" explicitly to
// opt into the accent-quality experiment, so a missing/misconfigured env var
// fails safe to OpenAI rather than silently trying the newer, less-proven path.
export type VoiceProvider = 'openai' | 'elevenlabs'
export const VOICE_PROVIDER: VoiceProvider =
  import.meta.env.VITE_VOICE_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'openai'
