import { CarmenScene } from './carmen/CarmenScene'

// Screen quad measured directly against the 1600x692 source image (device-mockup.jpg,
// the product render) by scanning for the black screen region's pixel bounds, then
// expressed as percentages so it stays correct regardless of how large the device
// image is rendered. The phone is shown at a slight perspective tilt, so this is a
// tight axis-aligned box inset from the true (trapezoidal) screen edge — harmless
// since the crop's own background (#141414) is near-black like the bezel around it.
const SCREEN = {
  left: (522 / 1600) * 100,
  top: (63 / 692) * 100,
  width: ((1036 - 522) / 1600) * 100,
  height: ((303 - 63) / 692) * 100,
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
          width: 'min(90vw, 208vh)',
          aspectRatio: '1600 / 692',
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
            borderRadius: '18px',
            background: '#141414',
          }}
        >
          <CarmenScene compact />
        </div>
      </div>
    </div>
  )
}
