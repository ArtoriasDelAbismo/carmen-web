export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000'

// Optional token set at build time, to skip pairing (demos/testing): a Carmen device
// token from cuidarte-ia-backend's POST /api/carmen/device-token, or a familiar or
// caregiver login JWT (24h). A token from pairing (PairingScreen) takes precedence —
// see lib/deviceToken.ts.
export const DEV_JWT = import.meta.env.VITE_DEV_JWT ?? ''

// Which Carmen to talk to. "classic" (default) is Carmen as she's always been: no
// patient data, she doesn't know who she's talking to. "data" is Carmen with the
// patient's profile and her MCP health-data tools (a separate agent/prompt on the
// backend). Anything other than "data" fails safe to classic.
export type CarmenMode = 'classic' | 'data'
export const CARMEN_MODE: CarmenMode = import.meta.env.VITE_CARMEN_MODE === 'data' ? 'data' : 'classic'

// Only used in "data" mode, and not needed with a device token (it already carries
// the patient) or a familiar with a single patient. Otherwise: which patient Carmen
// talks to — it must be linked to the familiar, or assigned to the caregiver
// (empty → the backend's CARMEN_DEFAULT_PATIENT_ID).
export const PATIENT_ID: string | undefined = import.meta.env.VITE_PATIENT_ID || undefined

// Body for the backend's session endpoints (/api/elevenlabs/signed-url, /api/realtime/session).
// Classic sends nothing, exactly as before the data integration.
export function carmenSessionBody(): string {
  if (CARMEN_MODE !== 'data') return '{}'
  return JSON.stringify({ assistant: 'carmen-data', ...(PATIENT_ID && { patientId: PATIENT_ID }) })
}

// Which voice provider CarmenScene connects to. Defaults to the known-working
// OpenAI path — VITE_VOICE_PROVIDER must be set to "elevenlabs" explicitly to
// opt into the accent-quality experiment, so a missing/misconfigured env var
// fails safe to OpenAI rather than silently trying the newer, less-proven path.
export type VoiceProvider = 'openai' | 'elevenlabs'
export const VOICE_PROVIDER: VoiceProvider =
  import.meta.env.VITE_VOICE_PROVIDER === 'elevenlabs' ? 'elevenlabs' : 'openai'
