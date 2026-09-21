import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

type BlinkState = 'open' | 'closing' | 'closed' | 'opening'

export function useBlink() {
  const blink = useRef(0)
  const state = useRef<BlinkState>('open')
  const timer = useRef(0)
  const nextBlinkAt = useRef(2 + Math.random() * 3)

  const closeSpeed = 14
  const openSpeed = 10
  const closedHold = 0.08

  useFrame((_, delta) => {
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
