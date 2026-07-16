import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { avatarState } from "../lib/avatarState";

/* ─────────────────────────────────────────────────────────────────────────────
 * TalkingHead — a 3D render of a real photo, done robustly. A single flat quad
 * fills the frame (never culled); the 3D comes from DEPTH-PARALLAX in the
 * fragment shader: each pixel is shifted by its depth (public/host-depth.png) as
 * an animated virtual viewpoint moves, so the face gains real, moving 3D relief.
 * The mouth opens/darkens in real time while `speaking`. Photorealistic (it IS
 * the photo) + real 3D depth + lip-sync. Free, client-side, works on any WebGL.
 * ────────────────────────────────────────────────────────────────────────────*/

const IMG_ASPECT = 640 / 800; // 0.8

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  uniform sampler2D uDepth;
  uniform vec2  uParallax;      // animated virtual-viewpoint offset
  uniform float uMouthOpen;     // 0..1
  uniform vec2  uMouthCenter;   // uv (origin bottom-left)
  uniform float uMouthWidth;
  uniform float uMouthHeight;
  varying vec2 vUv;
  void main() {
    // depth-parallax: nearer pixels (higher depth) shift more → 3D relief
    float d = texture2D(uDepth, vUv).r;
    vec2 uv = vUv + uParallax * (d - 0.45);

    // jaw drop: pull the lower face down while the mouth is open
    float jaw = smoothstep(uMouthCenter.y + 0.02, uMouthCenter.y - 0.22, uv.y);
    uv.y += uMouthOpen * 0.07 * jaw;

    vec4 col = texture2D(uTex, uv);

    // dark mouth interior that grows with the opening
    vec2 m = (vUv - uMouthCenter);
    m.x /= uMouthWidth;
    m.y /= (uMouthHeight * (0.3 + uMouthOpen * 1.8));
    float inside = 1.0 - smoothstep(0.55, 1.05, length(m));
    col.rgb = mix(col.rgb, vec3(0.14, 0.04, 0.05), inside * uMouthOpen);
    // a hint of lower teeth at the top of the opening so it reads as a mouth
    float teeth = (1.0 - smoothstep(0.0, 0.35, length(vec2(m.x, (vUv.y - uMouthCenter.y) / (uMouthHeight * 0.6) + 0.6)))) * uMouthOpen;
    col.rgb = mix(col.rgb, vec3(0.9, 0.88, 0.85), teeth * 0.5);

    gl_FragColor = col;
  }
`;

function Head({ speaking }: { speaking: boolean }) {
  const [tex, depth] = useTexture(["/host.jpg", "/host-depth.png"]);
  tex.colorSpace = THREE.SRGBColorSpace;
  depth.colorSpace = THREE.NoColorSpace;

  const { viewport } = useThree();
  // cover the frame like CSS object-fit: cover
  const [w, h] = useMemo(() => {
    const va = viewport.width / viewport.height;
    return va > IMG_ASPECT ? [viewport.width, viewport.width / IMG_ASPECT] : [viewport.height * IMG_ASPECT, viewport.height];
  }, [viewport.width, viewport.height]);

  const openRef = useRef(0);
  const uniforms = useMemo(() => ({
    uTex: { value: tex },
    uDepth: { value: depth },
    uParallax: { value: new THREE.Vector2(0, 0) },
    uMouthOpen: { value: 0 },
    uMouthCenter: { value: new THREE.Vector2(0.5, 0.52) }, // her lips
    uMouthWidth: { value: 0.1 },
    uMouthHeight: { value: 0.05 },
  }), [tex, depth]);

  useFrame((state, dt) => {
    const d = Math.min(0.05, dt);
    const t = state.clock.elapsedTime;
    // read the live flag from the shared signal (bypasses React→R3F prop timing)
    const spk = avatarState.speaking || speaking;
    // gentle circular viewpoint drift → moving 3D parallax (livelier while speaking)
    const k = spk ? 0.05 : 0.035;
    uniforms.uParallax.value.set(Math.sin(t * 0.6) * k, Math.cos(t * 0.5) * k * 0.6);
    // mouth amplitude from layered sines while speaking
    const amp = Math.abs(Math.sin(t * 11)) * 0.6 + Math.abs(Math.sin(t * 6.7 + 1)) * 0.4;
    const target = spk ? 0.55 + amp * 0.45 : 0;
    openRef.current += (target - openRef.current) * Math.min(1, d * 22);
    uniforms.uMouthOpen.value = openRef.current;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[w, h]} />
      <shaderMaterial vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
    </mesh>
  );
}

export function TalkingHead({ speaking = false }: { speaking?: boolean }) {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]} style={{ background: "transparent" }}>
      <Head speaking={speaking} />
    </Canvas>
  );
}
