import { useEffect, useState, type CSSProperties } from 'react'
import { CarmenScene } from './carmen/CarmenScene'

type Point = { x: number; y: number }
type Corners = { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }

// The living-room scene from cuidarte-app's Home, laid out exactly as there:
// the landscape photo centered with "cover" sizing on desktop (≥1024px, the
// app's desktop breakpoint), the portrait crop pinned to the bottom on phones.
//
// Screen corners are in each photo's own pixel space (sizes are the source
// dimensions, so percentages hold whatever the file's resolution). Measured by
// flood-filling the near-black screen and taking the x+y / x-y extremes (the
// standard trick for a rotated quad's 4 vertices), then inset ~7px toward the
// centre to stay clear of the bezel. The screen is a slight trapezoid, wider at
// the bottom. The portrait photo is a 1473x2620 crop of a taller render of the
// same shot, 639.5px further left and 544px lower, so its corners are shifted.
const DESKTOP_CORNERS: Corners = {
  topLeft: { x: 978, y: 358 },
  topRight: { x: 1795, y: 363 },
  bottomRight: { x: 1807, y: 738 },
  bottomLeft: { x: 959, y: 741 },
}

function shift(corners: Corners, dx: number, dy: number): Corners {
  const move = (p: Point) => ({ x: p.x + dx, y: p.y + dy })
  return {
    topLeft: move(corners.topLeft),
    topRight: move(corners.topRight),
    bottomRight: move(corners.bottomRight),
    bottomLeft: move(corners.bottomLeft),
  }
}

type Scene = {
  id: string
  src: string
  width: number
  height: number
  corners: Corners
  // CSS for the photo-sized box that gets "cover"ed over the viewport
  boxStyle: CSSProperties
}

const DESKTOP_SCENE: Scene = {
  id: 'carmen-screen-clip-desktop',
  src: '/scene-desktop.jpg',
  width: 2752,
  height: 1536,
  corners: DESKTOP_CORNERS,
  // centered, covering the viewport on both axes (cuidarte-app's desktop stage)
  boxStyle: {
    top: '50%',
    left: '50%',
    width: 'max(100vw, calc(100dvh * 2752 / 1536))',
    transform: 'translate(-50%, -50%)',
  },
}

const MOBILE_SCENE: Scene = {
  id: 'carmen-screen-clip-mobile',
  src: '/scene-mobile.jpg',
  width: 1473,
  height: 2620,
  corners: shift(DESKTOP_CORNERS, -639.5, 544),
  // bottom-centred, 994/917 of the screen height (cuidarte-app's mobile stage,
  // from its 412x917 Figma frame), or the width if the screen is wider
  boxStyle: {
    bottom: 0,
    left: '50%',
    height: 'max(calc(100dvh * 994 / 917), calc(100vw * 2620 / 1473))',
    transform: 'translateX(-50%)',
  },
}

const DESKTOP_QUERY = '(min-width: 1024px)'
const SCREEN_COLOR = '#040406' // the photo's own screen black, so the clip edge doesn't show
const CORNER_RADIUS_PX = 36 // in photo pixels

// Builds a closed polygon path with rounded corners: each vertex is replaced
// by a quadratic-bezier curve between two points inset `radius` along its
// adjacent edges. Rounding is computed in image-pixel space (isotropic)
// before `toPathSpace` converts each point to the crop box's fractional
// coordinates, so the rounding comes out circular rather than stretched by
// the box's non-square aspect ratio.
function roundedPolygonPath(points: Point[], radius: number, toPathSpace: (p: Point) => Point) {
  const n = points.length
  const edgePoint = (from: Point, to: Point, dist: number) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy)
    return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist }
  }
  const fmt = (p: Point) => {
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

// Crop box (bounding box of the screen, as % of the photo) and the clip path in
// clipPathUnits="objectBoundingBox" (0..1 fractions of that crop box), which is
// what keeps content off the bezel at the tapered corners at any render size.
function screenLayout({ width, height, corners }: Scene) {
  const left = Math.min(corners.topLeft.x, corners.bottomLeft.x)
  const right = Math.max(corners.topRight.x, corners.bottomRight.x)
  const top = Math.min(corners.topLeft.y, corners.topRight.y)
  const bottom = Math.max(corners.bottomLeft.y, corners.bottomRight.y)
  const boxWidth = right - left
  const boxHeight = bottom - top
  return {
    box: {
      left: `${(left / width) * 100}%`,
      top: `${(top / height) * 100}%`,
      width: `${(boxWidth / width) * 100}%`,
      height: `${(boxHeight / height) * 100}%`,
    },
    clipPath: roundedPolygonPath(
      [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft],
      CORNER_RADIUS_PX,
      (p) => ({ x: (p.x - left) / boxWidth, y: (p.y - top) / boxHeight }),
    ),
  }
}

const LAYOUTS = {
  desktop: screenLayout(DESKTOP_SCENE),
  mobile: screenLayout(MOBILE_SCENE),
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export function DeviceMockup() {
  const isDesktop = useIsDesktop()
  const scene = isDesktop ? DESKTOP_SCENE : MOBILE_SCENE
  const { box, clipPath } = isDesktop ? LAYOUTS.desktop : LAYOUTS.mobile

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: SCREEN_COLOR,
        overflow: 'hidden',
      }}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id={scene.id} clipPathUnits="objectBoundingBox">
            <path d={clipPath} />
          </clipPath>
        </defs>
      </svg>
      {/* Photo-sized box ("cover" over the viewport), so the screen's
          percentages, measured against the real photo, stay correct. */}
      <div
        style={{
          position: 'absolute',
          aspectRatio: `${scene.width} / ${scene.height}`,
          ...scene.boxStyle,
        }}
      >
        <img
          src={scene.src}
          alt="Cuidarte IA device"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            ...box,
            overflow: 'hidden',
            clipPath: `url(#${scene.id})`,
            background: SCREEN_COLOR,
          }}
        >
          <CarmenScene compact background={SCREEN_COLOR} />
        </div>
      </div>
    </div>
  )
}
