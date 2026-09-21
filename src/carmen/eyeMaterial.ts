import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// All offsets/sizes below are pulled from the real Figma pixel data for the
// "Ojos neutros" node (body solid-shape bbox: 450x521px) and expressed as
// fractions of the body's own half-width/half-height, so they stay correct
// regardless of overall scale. Plane geometry must be square for bodyHalf's
// x:y ratio to render as the correct on-screen aspect.
const fragmentShader = /* glsl */ `
  uniform float uBlink;
  uniform float uSpeak;
  uniform float uHappy;
  uniform vec2 uLook;
  uniform vec3 uColorOuter;
  uniform vec3 uColorInner;
  uniform vec3 uPupil;
  uniform vec3 uGlow;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  // rounded arc: sc = (sin(aperture), cos(aperture)), ra = centerline radius, rb = half-thickness
  float sdArc(vec2 p, vec2 sc, float ra, float rb) {
    p.x = abs(p.x);
    return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
  }

  void main() {
    // shrink the shape into the UV square so the outer glow has margin to fade out in
    vec2 p = (vUv * 2.0 - 1.0) / 0.58;
    float blink = clamp(uBlink, 0.0, 1.0);
    float speak = clamp(uSpeak, 0.0, 1.0);
    float happy = clamp(uHappy, 0.0, 1.0);

    // body: exact 450x521px silhouette bbox aspect (0.8637), eyelid squashes bodyHalf.y to blink
    float bodyH = mix(1.0, 0.04, blink);
    vec2 bodyHalf = vec2(0.8637, bodyH);
    float bodyR = min(bodyHalf.x, bodyHalf.y) * 0.92;
    float dBody = sdRoundBox(p, bodyHalf, bodyR);

    float bodyMask = smoothstep(0.015, -0.015, dBody);
    float outerGlow = exp(-max(dBody, 0.0) * 3.6) * 0.75 * (1.0 - blink * 0.6) * (1.0 + speak * 0.5);

    // radial gradient lifted straight from the fill's paint0_radial: flat bright center
    // until 62% of its radius, then fades to the dark edge color by 97%.
    vec2 gradCenter = vec2(0.0526 * bodyHalf.x, -0.2136 * bodyHalf.y);
    vec2 gradRadius = vec2(0.9783 * bodyHalf.x, 1.1976 * bodyHalf.y);
    float gradDist = length((p - gradCenter) / gradRadius);
    float gradBlend = smoothstep(0.62, 0.97, gradDist);
    vec3 bodyColor = mix(uColorInner, uColorOuter, gradBlend);

    // pupil, follows uLook — offset/size as fractions of bodyHalf (IRIS: 377x506px within 450x521px body)
    vec2 look = uLook * 0.10;
    vec2 pupilCenter = vec2(-0.0289 * bodyHalf.x, -0.3282 * bodyHalf.y);
    vec2 pp = p - pupilCenter - look;
    float blinkSquash = mix(1.0, 0.05, blink);

    // Measured the real IRIS raster's alpha channel directly: it's a blurred solid
    // shape whose opaque core only reaches ~43-59% of the raw bbox half-extent, and
    // fades to fully transparent by ~74-82% — the raw bbox itself is NOT the visible
    // shape's true size, it includes a soft transparent falloff margin.
    vec2 pupilRadius = vec2(
      0.8378 * 0.74 * bodyHalf.x * (1.0 + speak * 0.1),
      0.9712 * 0.82 * bodyHalf.y * (1.0 + speak * 0.22)
    );
    float pupilDist = length(pp / pupilRadius);
    float baseMask = 1.0 - smoothstep(0.65, 1.0, pupilDist);
    float baseGlow = baseMask;

    // happy pupil: an upward-arching smile, squashed by blink like the base pupil
    vec2 ppSmileCenter = p - vec2(0.0, -0.02 * bodyHalf.y) - look;
    vec2 ppArc = vec2(ppSmileCenter.x, ppSmileCenter.y / blinkSquash);
    float dSmile = sdArc(ppArc, vec2(sin(1.1), cos(1.1)), 0.33 * bodyHalf.y, 0.085 * bodyHalf.y * (1.0 + speak * 0.3));
    float smileMask = smoothstep(0.02, -0.02, dSmile);
    float smileGlow = exp(-max(dSmile, 0.0) * 3.5);

    float pupilMask = mix(baseMask, smileMask, happy);
    float pupilGlow = mix(baseGlow, smileGlow, happy);

    // top specular highlight (Reflejosup: 135x125px, offset from body center)
    vec2 highlightOffset = vec2(0.362 * bodyHalf.x, 0.6104 * bodyHalf.y);
    vec2 highlightRadius = vec2(0.30 * bodyHalf.x, 0.24 * bodyHalf.y);
    vec2 hp = p - highlightOffset - look * 0.4;
    float hDist = length(hp / highlightRadius);
    float highlight = smoothstep(1.0, 0.0, hDist) * (1.0 - blink);

    // glossy side reflections (ReflejoIZ / ReflejoDL)
    vec2 sideLOffset = vec2(-0.8365 * bodyHalf.x, -0.1841 * bodyHalf.y);
    vec2 sideLRadius = vec2(0.0662 * bodyHalf.x, 0.3854 * bodyHalf.y);
    float sideL = smoothstep(1.0, 0.0, length((p - sideLOffset) / sideLRadius)) * 0.55 * (1.0 - blink);

    vec2 sideROffset = vec2(0.910 * bodyHalf.x, -0.1572 * bodyHalf.y);
    vec2 sideRRadius = vec2(0.0659 * bodyHalf.x, 0.4138 * bodyHalf.y);
    float sideR = smoothstep(1.0, 0.0, length((p - sideROffset) / sideRRadius)) * 0.35 * (1.0 - blink);

    vec3 color = vec3(0.0);
    float alpha = 0.0;

    color += uGlow * outerGlow;
    alpha += outerGlow;

    color = mix(color, bodyColor, bodyMask);
    alpha = max(alpha, bodyMask);

    color += uGlow * pupilGlow * 0.5 * bodyMask;

    color = mix(color, uPupil, pupilMask);
    alpha = max(alpha, pupilMask);

    color += vec3(1.0) * highlight * 0.9;
    color += vec3(1.0, 0.85, 0.6) * (sideL + sideR) * bodyMask;

    // hard-zero the far tail of the glow so the plane's own edge never shows
    vec2 uvC = vUv * 2.0 - 1.0;
    float edgeMask = 1.0 - smoothstep(0.72, 0.98, length(uvC));
    alpha *= edgeMask;

    gl_FragColor = vec4(color, alpha);
  }
`

export const EyeMaterial = shaderMaterial(
  {
    uBlink: 0,
    uSpeak: 0,
    uHappy: 0,
    uLook: new THREE.Vector2(0, 0),
    // exact stops from the body fill's paint0_radial gradient
    uColorOuter: new THREE.Color('#7A4300'),
    uColorInner: new THREE.Color('#FF9B00'),
    uPupil: new THREE.Color('#fff8ec'),
    uGlow: new THREE.Color('#FF9B00'),
  },
  vertexShader,
  fragmentShader,
)
