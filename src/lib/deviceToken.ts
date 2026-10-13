import { BACKEND_URL, DEV_JWT } from './config'

// The device token this Carmen got by pairing with a familiar (see PairingScreen),
// kept across reloads. localStorage can be unavailable (private mode, blocked
// storage) — then pairing just doesn't survive a reload.
const STORAGE_KEY = 'carmen.deviceToken'

// Fired when the backend reports this device's pairing is no longer valid, so the
// app can go back to the pairing screen.
export const UNPAIRED_EVENT = 'carmen:unpaired'

export function getStoredDeviceToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeDeviceToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // ignore — see above
  }
}

export function clearDeviceToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Token for the backend's session endpoints: the paired device token if there is
// one, else the build-time VITE_DEV_JWT (demos/testing).
export function getSessionToken(): { token: string; fromPairing: boolean } {
  const stored = getStoredDeviceToken()
  return stored ? { token: stored, fromPairing: true } : { token: DEV_JWT, fromPairing: false }
}

// Call when a session request fails: a 401 on a paired token means the familiar
// unpaired this device (or its token expired) — forget it and show pairing again.
export function handleSessionAuthFailure(status: number, fromPairing: boolean): void {
  if (status === 401 && fromPairing) {
    clearDeviceToken()
    window.dispatchEvent(new Event(UNPAIRED_EVENT))
  }
}

// While idle, asks the backend whether this paired device is still paired, so an
// unpairing from the mobile app shows here without waiting for a conversation.
// Network errors are ignored (the next check, or the next conversation, retries).
export async function checkDevicePairing(): Promise<void> {
  const token = getStoredDeviceToken()
  if (!token) return
  try {
    const res = await fetch(`${BACKEND_URL}/api/carmen/device/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    handleSessionAuthFailure(res.status, true)
  } catch {
    // offline or backend down — not an unpairing
  }
}
