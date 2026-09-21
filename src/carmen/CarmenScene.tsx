import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { CarmenFace } from './CarmenFace'
import { useRealtimeVoice } from './useRealtimeVoice'

export function CarmenScene() {
  const { status, error, connect, disconnect, speakRef } = useRealtimeVoice()

  const label =
    status === 'connected'
      ? 'End conversation'
      : status === 'connecting'
        ? 'Connecting…'
        : 'Talk to Carmen'

  return (
    <div style={{ width: '100%', height: '100%', background: '#141414', position: 'relative' }}>
      <Canvas orthographic camera={{ zoom: 140, position: [0, 0, 10] }} dpr={[1, 2]}>
        <color attach="background" args={['#141414']} />
        <CarmenFace speakRef={speakRef} />
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

      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <button
          type="button"
          onClick={status === 'connected' ? disconnect : connect}
          disabled={status === 'connecting'}
          style={{
            padding: '12px 28px',
            borderRadius: 999,
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: status === 'connecting' ? 'default' : 'pointer',
            background: status === 'connected' ? '#e05a3a' : '#ff9a33',
            color: '#1a1200',
            opacity: status === 'connecting' ? 0.7 : 1,
          }}
        >
          {label}
        </button>
        {error && <span style={{ color: '#ff8080', fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  )
}
