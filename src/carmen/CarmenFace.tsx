import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CarmenEye } from './CarmenEye'
import { useBlink } from './useBlink'

export function CarmenFace() {
  const blink = useBlink()
  const look = useRef<[number, number]>([0, 0])
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    look.current[0] += (state.pointer.x - look.current[0]) * 0.08
    look.current[1] += (state.pointer.y - look.current[1]) * 0.08

    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.04
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6) * 0.01
    }
  })

  return (
    <group ref={group}>
      <CarmenEye x={-1.0} blinkRef={blink} lookRef={look} />
      <CarmenEye x={1.0} blinkRef={blink} lookRef={look} />
    </group>
  )
}
