import { useMemo, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { EyeMaterial } from './eyeMaterial'

type CarmenEyeProps = {
  x: number
  blinkRef: MutableRefObject<number>
  lookRef: MutableRefObject<[number, number]>
  speakRef: MutableRefObject<number>
  happyRef: MutableRefObject<number>
  concernedRef: MutableRefObject<number>
  sadRef: MutableRefObject<number>
}

export function CarmenEye({ x, blinkRef, lookRef, speakRef, happyRef, concernedRef, sadRef }: CarmenEyeProps) {
  const material = useMemo(() => {
    const mat = new EyeMaterial({ transparent: true, depthWrite: false })
    // Which side of the face this eye is on — the sad expression's brow-chamfer
    // mirrors off this so both inner (nose-side) corners droop symmetrically.
    mat.uniforms.uSide.value = Math.sign(x)
    return mat
  }, [x])

  useFrame(() => {
    material.uniforms.uBlink.value = blinkRef.current
    material.uniforms.uSpeak.value = speakRef.current
    material.uniforms.uHappy.value = happyRef.current
    material.uniforms.uConcerned.value = concernedRef.current
    material.uniforms.uSad.value = sadRef.current
    material.uniforms.uLook.value.set(lookRef.current[0], lookRef.current[1])
  })

  return (
    <mesh position={[x, 0, 0]} material={material}>
      <planeGeometry args={[3.03, 3.03]} />
    </mesh>
  )
}
