import { CarmenScene } from './carmen/CarmenScene'

// Screen quad measured directly against the 1600x900 source image (device-mockup.jpg)
// by detecting the black screen region's pixel bounds, then expressed as percentages
// so it stays correct regardless of how large the device image is rendered.
const SCREEN = {
  left: (450 / 1600) * 100,
  top: (110 / 900) * 100,
  width: ((1150 - 450) / 1600) * 100,
  height: ((445 - 110) / 900) * 100,
}

export function DeviceMockup() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#141414',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(90vw, 160vh)',
          aspectRatio: '16 / 9',
        }}
      >
        <img
          src="/device-mockup.jpg"
          alt="Cuidarte IA device"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${SCREEN.left}%`,
            top: `${SCREEN.top}%`,
            width: `${SCREEN.width}%`,
            height: `${SCREEN.height}%`,
            overflow: 'hidden',
            borderRadius: '4%',
            background: '#141414',
          }}
        >
          <CarmenScene />
        </div>
      </div>
    </div>
  )
}
