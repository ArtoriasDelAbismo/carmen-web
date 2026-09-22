import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CarmenEye } from './CarmenEye'
import { useBlink } from './useBlink'

type CarmenFaceProps = {
  speakRef: MutableRefObject<number>
  happyTargetRef: MutableRefObject<number>
}

// center -> left -> center -> right -> (loops back to center), from the Figma
// "Ojos izquierda" / "Ojos derecha" look states.
const GLANCE_TARGETS = [0, -1, 0, 1]
const GLANCE_STEP_SECONDS = 0.9
const SPEAKING_ON_THRESHOLD = 0.06
const SPEAKING_ON_DELAY = 0.15
const SPEAKING_OFF_DELAY = 0.5

export function CarmenFace({ speakRef, happyTargetRef }: CarmenFaceProps) {
  const blink = useBlink()
  const happy = useRef(0)
  const look = useRef<[number, number]>([0, 0])
  const group = useRef<THREE.Group>(null)

  const isSpeaking = useRef(false)
  const voiceTimer = useRef(0)
  const silenceTimer = useRef(0)
  const glancePhase = useRef(0)
  const glanceTimer = useRef(0)

  useFrame((state, delta) => {
    // hysteresis so isolated loud/quiet frames don't flicker the gesture on and off
    if (speakRef.current > SPEAKING_ON_THRESHOLD) {
      voiceTimer.current += delta
      silenceTimer.current = 0
    } else {
      silenceTimer.current += delta
      voiceTimer.current = 0
    }
    if (!isSpeaking.current && voiceTimer.current > SPEAKING_ON_DELAY) isSpeaking.current = true
    if (isSpeaking.current && silenceTimer.current > SPEAKING_OFF_DELAY) isSpeaking.current = false

    let targetX: number
    let targetY: number

    if (isSpeaking.current) {
      glanceTimer.current += delta
      if (glanceTimer.current > GLANCE_STEP_SECONDS) {
        glanceTimer.current = 0
        glancePhase.current = (glancePhase.current + 1) % GLANCE_TARGETS.length
      }
      targetX = GLANCE_TARGETS[glancePhase.current]
      targetY = 0
    } else {
      glanceTimer.current = 0
      glancePhase.current = 0
      targetX = state.pointer.x
      targetY = state.pointer.y
    }

    look.current[0] += (targetX - look.current[0]) * 0.08
    look.current[1] += (targetY - look.current[1]) * 0.08

    happy.current += (happyTargetRef.current - happy.current) * Math.min(1, delta * 7)

    if (group.current) {
      const speak = speakRef.current
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.04
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.01
      // tiny extra bob while Carmen is speaking, on top of the idle motion
      group.current.position.y += Math.sin(state.clock.elapsedTime * 9.0) * 0.012 * speak
      // a little lift while happy
      group.current.position.y += happy.current * 0.03
    }
  })

  return (
    <group ref={group}>
      <CarmenEye x={-1.13} blinkRef={blink} lookRef={look} speakRef={speakRef} happyRef={happy} />
      <CarmenEye x={1.13} blinkRef={blink} lookRef={look} speakRef={speakRef} happyRef={happy} />
    </group>
  )
}
