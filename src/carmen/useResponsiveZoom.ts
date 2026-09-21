import { useEffect, useState } from 'react'

// The eyes' glow spans roughly this many world units — tuned against the
// desktop zoom (140 @ 1280x757) this project was built at. Fitting the
// camera to these instead of a fixed zoom keeps the same framing across
// phone-width viewports instead of cropping the eyes off-screen.
const CONTENT_WIDTH_UNITS = 4.6
const CONTENT_HEIGHT_UNITS = 3.4
const FIT_FRACTION = 0.82 // leave margin so the glow's soft edge doesn't touch the screen edge

function computeZoom(width: number, height: number) {
  const zoomForWidth = (width / CONTENT_WIDTH_UNITS) * FIT_FRACTION
  const zoomForHeight = (height / CONTENT_HEIGHT_UNITS) * FIT_FRACTION
  return Math.min(zoomForWidth, zoomForHeight)
}

export function useResponsiveZoom() {
  const [zoom, setZoom] = useState(() => computeZoom(window.innerWidth, window.innerHeight))

  useEffect(() => {
    const onResize = () => setZoom(computeZoom(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return zoom
}
