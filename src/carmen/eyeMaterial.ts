import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

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
    vec2 p = (vUv * 2.0 - 1.0) / 0.66;
    // Figma's eyes are much wider relative to their height than this started out —
    // stretch every x-dependent shape (body, pupil, highlights, reflections) uniformly.
    p.x /= 1.73;
    float blink = clamp(uBlink, 0.0, 1.0);

    // eyelid: outer glowing body squashes vertically to blink
    float bodyH = mix(1.0, 0.04, blink);
    vec2 bodyHalf = vec2(0.56, bodyH);
    float bodyR = min(0.52, bodyHalf.y * 0.95 + 0.02);
    float dBody = sdRoundBox(p, bodyHalf, bodyR);

    float speak = clamp(uSpeak, 0.0, 1.0);

    float bodyMask = smoothstep(0.015, -0.015, dBody);
    float outerGlow = exp(-max(dBody, 0.0) * 3.6) * 0.75 * (1.0 - blink * 0.6) * (1.0 + speak * 0.5);

    vec2 gradCenter = vec2(0.0, -0.08);
    float gradT = clamp(1.0 - length((p - gradCenter) / vec2(0.62, 1.1)), 0.0, 1.0);
    vec3 bodyColor = mix(uColorOuter, uColorInner, gradT);

    float happy = clamp(uHappy, 0.0, 1.0);

    // pupil, follows uLook
    vec2 look = uLook * 0.10;
    vec2 pp = p - vec2(0.0, -0.18) - look;
    float blinkSquash = mix(1.0, 0.05, blink);

    // neutral pupil: a capsule
    float pupilH = mix(0.40, 0.01, blink) * (1.0 + speak * 0.22);
    vec2 pupilHalf = vec2(0.235 * (1.0 + speak * 0.1), pupilH);
    float pupilR = min(0.22, pupilHalf.y * 0.95 + 0.015);
    float dPupilBase = sdRoundBox(pp, pupilHalf, pupilR);
    float baseMask = smoothstep(0.02, -0.02, dPupilBase);
    float baseGlow = exp(-max(dPupilBase, 0.0) * 3.5);

    // happy pupil: an upward-arching smile, squashed by blink like the base pupil
    vec2 ppSmileCenter = p - vec2(0.0, -0.02) - look;
    vec2 ppArc = vec2(ppSmileCenter.x, ppSmileCenter.y / blinkSquash);
    float dSmile = sdArc(ppArc, vec2(sin(1.1), cos(1.1)), 0.33, 0.085 * (1.0 + speak * 0.3));
    float smileMask = smoothstep(0.02, -0.02, dSmile);
    float smileGlow = exp(-max(dSmile, 0.0) * 3.5);

    float pupilMask = mix(baseMask, smileMask, happy);
    float pupilGlow = mix(baseGlow, smileGlow, happy);

    // top specular highlight
    vec2 hp = p - vec2(0.30, 0.55) - look * 0.4;
    float hDist = length(hp / vec2(0.15, 0.13));
    float highlight = smoothstep(1.0, 0.0, hDist) * (1.0 - blink);

    // glossy side reflections
    float sideL = smoothstep(1.0, 0.0, length((p - vec2(-0.44, 0.0)) / vec2(0.05, 0.34))) * 0.55 * (1.0 - blink);
    float sideR = smoothstep(1.0, 0.0, length((p - vec2(0.44, 0.05)) / vec2(0.055, 0.30))) * 0.35 * (1.0 - blink);

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
    float edgeMask = 1.0 - smoothstep(0.7, 0.98, length(uvC));
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
    uColorOuter: new THREE.Color('#8a3a05'),
    uColorInner: new THREE.Color('#ffb84d'),
    uPupil: new THREE.Color('#fff8ec'),
    uGlow: new THREE.Color('#ff9a33'),
  },
  vertexShader,
  fragmentShader,
)
