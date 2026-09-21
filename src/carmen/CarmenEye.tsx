import { useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { EyeMaterial } from './eyeMaterial'

type CarmenEyeProps = {
  x: number
  blinkRef: MutableRefObject<number>
  lookRef: MutableRefObject<[number, number]>
  speakRef: MutableRefObject<number>
  happyRef: MutableRefObject<number>
}

export function CarmenEye({ x, blinkRef, lookRef, speakRef, happyRef }: CarmenEyeProps) {
  const material = useMemo(
    () => new EyeMaterial({ transparent: true, depthWrite: false }),
    [],
  )

  useFrame(() => {
    material.uniforms.uBlink.value = blinkRef.current
    material.uniforms.uSpeak.value = speakRef.current
    material.uniforms.uHappy.value = happyRef.current
    material.uniforms.uLook.value.set(lookRef.current[0], lookRef.current[1])
  })

  return (
    <mesh position={[x, 0, 0]} material={material}>
      <planeGeometry args={[3.03, 3.03]} />
    </mesh>
  )
}
