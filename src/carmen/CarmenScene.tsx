import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CarmenFace } from './CarmenFace'

export function CarmenScene() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#141414' }}>
      <Canvas orthographic camera={{ zoom: 140, position: [0, 0, 10] }} dpr={[1, 2]}>
        <color attach="background" args={['#141414']} />
        <CarmenFace />
        <EffectComposer>
          <Bloom
            mipmapBlur={false}
            intensity={0.8}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.15}
            radius={0.4}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
