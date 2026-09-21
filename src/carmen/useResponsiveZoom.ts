import { useThree } from '@react-three/fiber'

// The eyes' glow spans roughly this many world units — tuned against the
// desktop zoom (140 @ 1280x757) this project was built at. Fitting the
// camera to these instead of a fixed zoom keeps the same framing across
// different canvas sizes instead of cropping the eyes off-screen.
const CONTENT_WIDTH_UNITS = 4.6
const CONTENT_HEIGHT_UNITS = 3.4
const FIT_FRACTION = 0.82 // leave margin so the glow's soft edge doesn't touch the canvas edge

export function computeZoom(width: number, height: number) {
  const zoomForWidth = (width / CONTENT_WIDTH_UNITS) * FIT_FRACTION
  const zoomForHeight = (height / CONTENT_HEIGHT_UNITS) * FIT_FRACTION
  return Math.min(zoomForWidth, zoomForHeight)
}

// Must be called inside <Canvas>. Tracks the canvas's own rendered size (which
// R3F keeps in sync with its containing DOM element via ResizeObserver), not
// the browser window — so this frames correctly both full-viewport and when
// the canvas is embedded in a small container, like the phone screen cutout
// in DeviceMockup.
export function useResponsiveZoom() {
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  return computeZoom(width, height)
}
