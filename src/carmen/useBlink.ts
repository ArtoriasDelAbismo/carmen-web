import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

type BlinkState = 'open' | 'closing' | 'closed' | 'opening'

// asleep overrides the normal random-blink cycle: eyes ease shut and hold
// closed while true (Carmen idle, not listening), and ease back open —
// resuming normal blinking — the moment it flips false (user tapped "Hablar").
export function useBlink(asleep: boolean) {
  const blink = useRef(asleep ? 1 : 0)
  const state = useRef<BlinkState>(asleep ? 'closed' : 'open')
  const timer = useRef(0)
  const nextBlinkAt = useRef(2 + Math.random() * 3)
  const wasAsleep = useRef(asleep)

  const closeSpeed = 14
  const openSpeed = 10
  const closedHold = 0.08

  useFrame((_, delta) => {
    if (asleep !== wasAsleep.current) {
      wasAsleep.current = asleep
      state.current = asleep ? 'closing' : 'opening'
    }

    if (asleep) {
      if (state.current === 'closing') {
        blink.current = Math.min(1, blink.current + delta * closeSpeed)
        if (blink.current >= 1) state.current = 'closed'
      }
      return
    }

    timer.current += delta

    switch (state.current) {
      case 'open':
        if (timer.current >= nextBlinkAt.current) {
          state.current = 'closing'
        }
        break
      case 'closing':
        blink.current = Math.min(1, blink.current + delta * closeSpeed)
        if (blink.current >= 1) state.current = 'closed'
        break
      case 'closed':
        if (timer.current >= nextBlinkAt.current + closedHold) {
          state.current = 'opening'
        }
        break
      case 'opening':
        blink.current = Math.max(0, blink.current - delta * openSpeed)
        if (blink.current <= 0) {
          state.current = 'open'
          timer.current = 0
          nextBlinkAt.current = 2.5 + Math.random() * 3.5
        }
        break
    }
  })

  return blink
}
