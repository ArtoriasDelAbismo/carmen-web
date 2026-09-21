import { useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { EyeMaterial } from './eyeMaterial'

type CarmenEyeProps = {
  x: number
  blinkRef: MutableRefObject<number>
  lookRef: MutableRefObject<[number, number]>
}

export function CarmenEye({ x, blinkRef, lookRef }: CarmenEyeProps) {
  const material = useMemo(
    () => new EyeMaterial({ transparent: true, depthWrite: false }),
    [],
  )

  useFrame(() => {
    material.uniforms.uBlink.value = blinkRef.current
    material.uniforms.uLook.value.set(lookRef.current[0], lookRef.current[1])
  })

  return (
    <mesh position={[x, 0, 0]} material={material}>
      <planeGeometry args={[2.42, 3.03]} />
    </mesh>
  )
}
