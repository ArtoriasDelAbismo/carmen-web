import { CarmenScene } from './carmen/CarmenScene'

// Corners of the tilted phone screen, measured directly against the 1600x692
// source image (device-mockup.jpg) by scanning the dark screen region for its
// x+y / x-y extremes (the standard trick for finding a rotated quad's 4
// vertices from a silhouette). The screen is a tilted trapezoid in this
// render — narrower at the top than the bottom — so a plain axis-aligned
// rectangle sized to fit the wider bottom edge always pokes past the real,
// narrower top-left/top-right corners onto the bezel, more visibly so the
// larger the mockup renders. Each point is inset ~8px toward the shape's
// centroid to stay clear of the bezel edge highlight.
const IMG_W = 1600
const IMG_H = 692
const CORNERS = {
  topLeft: { x: 593.1, y: 82.6 },
  topRight: { x: 1033.8, y: 83.5 },
  bottomRight: { x: 1041.8, y: 309.4 },
  bottomLeft: { x: 575.3, y: 299.7 },
}

const boxLeft = Math.min(CORNERS.topLeft.x, CORNERS.bottomLeft.x)
const boxRight = Math.max(CORNERS.topRight.x, CORNERS.bottomRight.x)
const boxTop = Math.min(CORNERS.topLeft.y, CORNERS.topRight.y)
const boxBottom = Math.max(CORNERS.bottomLeft.y, CORNERS.bottomRight.y)
const boxWidth = boxRight - boxLeft
const boxHeight = boxBottom - boxTop

// Crop container's position/size as a percentage of the full image (its bounding box).
const SCREEN = {
  left: (boxLeft / IMG_W) * 100,
  top: (boxTop / IMG_H) * 100,
  width: (boxWidth / IMG_W) * 100,
  height: (boxHeight / IMG_H) * 100,
}

// Builds a closed polygon path with rounded corners: each vertex is replaced
// by a quadratic-bezier curve between two points inset `radius` along its
// adjacent edges. Rounding is computed in image-pixel space (isotropic)
// before `toPathSpace` converts each point to the crop box's fractional
// coordinates, so the rounding comes out circular rather than stretched by
// the box's non-square aspect ratio.
function roundedPolygonPath(
  points: { x: number; y: number }[],
  radius: number,
  toPathSpace: (p: { x: number; y: number }) => { x: number; y: number },
) {
  const n = points.length
  const edgePoint = (from: { x: number; y: number }, to: { x: number; y: number }, dist: number) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy)
    return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist }
  }
  const fmt = (p: { x: number; y: number }) => {
    const s = toPathSpace(p)
    return `${s.x} ${s.y}`
  }

  const commands: string[] = []
  for (let i = 0; i < n; i++) {
    const curr = points[i]
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    const p1 = edgePoint(curr, prev, radius)
    const p2 = edgePoint(curr, next, radius)
    commands.push(i === 0 ? `M ${fmt(p1)}` : `L ${fmt(p1)}`)
    commands.push(`Q ${fmt(curr)} ${fmt(p2)}`)
  }
  commands.push('Z')
  return commands.join(' ')
}

// clipPathUnits="objectBoundingBox" wants plain 0..1 fractions of the crop
// container's own box (not the full image, and not percentages) — this is
// what actually keeps content from spilling onto the bezel at the tapered
// top corners, at any render size, while still rounding the corners like a
// real phone screen.
const CORNER_RADIUS_PX = 22 // in the same 1600x692 image-pixel space as CORNERS above
const CLIP_PATH_ID = 'carmen-screen-clip'
const CLIP_PATH_D = roundedPolygonPath(
  [CORNERS.topLeft, CORNERS.topRight, CORNERS.bottomRight, CORNERS.bottomLeft],
  CORNER_RADIUS_PX,
  (p) => ({ x: (p.x - boxLeft) / boxWidth, y: (p.y - boxTop) / boxHeight }),
)

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
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id={CLIP_PATH_ID} clipPathUnits="objectBoundingBox">
            <path d={CLIP_PATH_D} />
          </clipPath>
        </defs>
      </svg>
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
            clipPath: `url(#${CLIP_PATH_ID})`,
            background: '#141414',
          }}
        >
          <CarmenScene compact />
        </div>
      </div>
    </div>
  )
}
