import { useCallback, useEffect, useState } from 'react'
import { CARMEN_MODE, DEV_JWT } from '../lib/config'
import { UNPAIRED_EVENT, checkDevicePairing, clearDeviceToken, getStoredDeviceToken } from '../lib/deviceToken'
import { CarmenScene } from './CarmenScene'
import { PairingScreen } from './PairingScreen'

// How often an idle, paired Carmen checks she's still paired.
const PAIRING_CHECK_INTERVAL_MS = 60_000

// "?desvincular" in the URL forgets this device's pairing (local only — the familiar
// unpairs it for good from the mobile app). For demos and testing.
const RESET_PARAM = 'desvincular'

function consumeResetParam() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(RESET_PARAM)) return
  clearDeviceToken()
  url.searchParams.delete(RESET_PARAM)
  window.history.replaceState(null, '', url)
}

// Classic Carmen needs no patient, so she starts right away. Carmen with data
// needs the device paired with a familiar's patient: without a paired token (or a
// VITE_DEV_JWT set by hand) she shows the pairing screen instead.
function needsPairing(): boolean {
  return CARMEN_MODE === 'data' && !getStoredDeviceToken() && !DEV_JWT
}

export function CarmenDevice(props: Parameters<typeof CarmenScene>[0]) {
  const [pairing, setPairing] = useState(() => {
    consumeResetParam()
    return needsPairing()
  })

  const handlePaired = useCallback(() => setPairing(false), [])

  // The backend said this device's pairing is no longer valid (unpaired or expired).
  useEffect(() => {
    const onUnpaired = () => setPairing(needsPairing())
    window.addEventListener(UNPAIRED_EVENT, onUnpaired)
    return () => window.removeEventListener(UNPAIRED_EVENT, onUnpaired)
  }, [])

  // While paired, check now, every minute, and whenever the page becomes visible
  // again — an unpairing from the app shows the pairing screen within a minute.
  useEffect(() => {
    if (pairing) return
    void checkDevicePairing()
    const interval = window.setInterval(() => void checkDevicePairing(), PAIRING_CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkDevicePairing()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pairing])

  return pairing ? <PairingScreen onPaired={handlePaired} /> : <CarmenScene {...props} />
}
