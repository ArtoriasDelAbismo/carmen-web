import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { BACKEND_URL } from '../lib/config'
import { storeDeviceToken } from '../lib/deviceToken'
import './PairingScreen.css'

type Pairing = {
  deviceCode: string
  userCode: string
  qrPayload: string
  expiresAt: number
  interval: number
}

const RETRY_DELAY_MS = 5000

// Shown on an unpaired Carmen: a code (and QR) for a familiar to confirm from the
// Cuidarte mobile app ("Vincular Carmen"). The backend side is the device
// authorization flow in cuidarte-ia-backend's src/carmen/pairing.js: start a
// pairing, then poll with the secret deviceCode until the familiar confirms.
export function PairingScreen({ onPaired }: { onPaired: () => void }) {
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Bumped to start a new pairing (after expiry or an error).
  const [attempt, setAttempt] = useState(0)
  const restart = useCallback(() => {
    setPairing(null)
    setAttempt((n) => n + 1)
  }, [])

  // Start a pairing.
  useEffect(() => {
    let cancelled = false
    fetch(`${BACKEND_URL}/api/carmen/pairing`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`pairing request failed (${res.status})`)
        const data = await res.json()
        if (cancelled) return
        setError(null)
        setPairing({
          deviceCode: data.deviceCode,
          userCode: data.userCode,
          qrPayload: data.qrPayload,
          expiresAt: Date.now() + data.expiresIn * 1000,
          interval: data.interval,
        })
      })
      .catch((err) => {
        console.error('[PairingScreen]', err)
        if (cancelled) return
        setError('No me pude conectar. Reintentando…')
        setTimeout(() => !cancelled && restart(), RETRY_DELAY_MS)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, restart])

  // Poll until the familiar confirms or the code expires.
  useEffect(() => {
    if (!pairing) return
    let cancelled = false
    let timer: number

    const poll = async () => {
      if (Date.now() > pairing.expiresAt) {
        restart()
        return
      }
      try {
        const res = await fetch(`${BACKEND_URL}/api/carmen/pairing/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceCode: pairing.deviceCode }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'approved' && data.deviceToken) {
          storeDeviceToken(data.deviceToken)
          onPaired()
          return
        }
        if (data.status === 'expired') {
          restart()
          return
        }
      } catch (err) {
        console.error('[PairingScreen] poll failed', err) // transient — keep polling
      }
      if (!cancelled) timer = window.setTimeout(poll, pairing.interval * 1000)
    }

    timer = window.setTimeout(poll, pairing.interval * 1000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pairing, onPaired, restart])

  return (
    <div className="pairing">
      <h1 className="pairing__title">Vinculá a Carmen</h1>
      {pairing ? (
        <>
          <p className="pairing__text">
            En la app Cuidarte, entrá a <strong>Vincular Carmen</strong> y escaneá este código.
          </p>
          <div className="pairing__qr">
            <QRCodeSVG value={pairing.qrPayload} size={180} marginSize={2} />
          </div>
          <p className="pairing__text">O ingresá el código:</p>
          <p className="pairing__code">{pairing.userCode}</p>
        </>
      ) : (
        <p className="pairing__text">{error ?? 'Preparando el código…'}</p>
      )}
    </div>
  )
}
