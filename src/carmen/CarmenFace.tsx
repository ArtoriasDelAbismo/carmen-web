import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CarmenEye } from './CarmenEye'
import { useBlink } from './useBlink'

type CarmenFaceProps = {
  speakRef: MutableRefObject<number>
}

export function CarmenFace({ speakRef }: CarmenFaceProps) {
  const blink = useBlink()
  const look = useRef<[number, number]>([0, 0])
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    look.current[0] += (state.pointer.x - look.current[0]) * 0.08
    look.current[1] += (state.pointer.y - look.current[1]) * 0.08

    if (group.current) {
      const speak = speakRef.current
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.04
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.01
      // tiny extra bob while Carmen is speaking, on top of the idle motion
      group.current.position.y += Math.sin(state.clock.elapsedTime * 9.0) * 0.012 * speak
    }
  })

  return (
    <group ref={group}>
      <CarmenEye x={-1.0} blinkRef={blink} lookRef={look} speakRef={speakRef} />
      <CarmenEye x={1.0} blinkRef={blink} lookRef={look} speakRef={speakRef} />
    </group>
  )
}
