import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CarmenEye } from './CarmenEye'
import { useBlink } from './useBlink'

type CarmenFaceProps = {
  speakRef: MutableRefObject<number>
  happyTargetRef: MutableRefObject<number>
}

export function CarmenFace({ speakRef, happyTargetRef }: CarmenFaceProps) {
  const blink = useBlink()
  const happy = useRef(0)
  const look = useRef<[number, number]>([0, 0])
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    look.current[0] += (state.pointer.x - look.current[0]) * 0.08
    look.current[1] += (state.pointer.y - look.current[1]) * 0.08

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
      <CarmenEye x={-1.2} blinkRef={blink} lookRef={look} speakRef={speakRef} happyRef={happy} />
      <CarmenEye x={1.2} blinkRef={blink} lookRef={look} speakRef={speakRef} happyRef={happy} />
    </group>
  )
}
