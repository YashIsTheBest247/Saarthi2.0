import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { avatarState } from "../lib/avatarState";

/* ─────────────────────────────────────────────────────────────────────────────
 * Avatar3D — a complete, live 3D character. Loads a Ready Player Me avatar
 * (self-hosted /avatar.glb, rigged with ARKit + Oculus-viseme blendshapes) and:
 *   • LIP-SYNC: while avatarState.speaking, the 3D mouth opens with jaw + viseme
 *     morphs (read from the shared flag each frame — reliable, not React-timed).
 *   • MOVEMENTS: natural blinking, a resting smile, and gentle head/body sway
 *     (livelier while talking) so she feels alive.
 * Free, real-time, client-side. Swap /avatar.glb for any avatar from readyplayer.me.
 * ────────────────────────────────────────────────────────────────────────────*/

const GLB = "/avatar.glb";
useGLTF.preload(GLB);

const VISEMES = ["viseme_aa", "viseme_O", "viseme_E", "viseme_U", "viseme_I", "viseme_CH", "viseme_SS", "viseme_nn"];

function Model() {
  const { scene } = useGLTF(GLB);

  const meshes = useMemo(() => {
    const list: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((m as unknown as { isMesh?: boolean }).isMesh) {
        m.frustumCulled = false;
        if (m.morphTargetDictionary && m.morphTargetInfluences) list.push(m);
      }
    });
    return list;
  }, [scene]);

  const head = useMemo(() => scene.getObjectByName("Head"), [scene]);
  const spine = useMemo(() => scene.getObjectByName("Spine2") || scene.getObjectByName("Spine1") || scene.getObjectByName("Spine"), [scene]);

  const targets = useRef<Record<string, number>>({});
  const blinkT = useRef(1.4 + Math.random() * 2.5);
  const vIdx = useRef(0);
  const vTimer = useRef(0);
  const set = (n: string, v: number) => { targets.current[n] = v; };

  useFrame((state, dt) => {
    const d = Math.min(0.05, dt);
    const t = state.clock.elapsedTime;
    const spk = avatarState.speaking;

    // rest pose: closed mouth + gentle smile
    for (const v of VISEMES) set(v, 0);
    set("jawOpen", 0);
    set("mouthSmileLeft", 0.09); set("mouthSmileRight", 0.09);

    if (spk) {
      // natural, moderate mouth motion (layered sines, not exaggerated)
      const amp = Math.abs(Math.sin(t * 9)) * 0.55 + Math.abs(Math.sin(t * 5.7 + 1)) * 0.45;
      set("jawOpen", 0.04 + amp * 0.2);
      vTimer.current += d;
      if (vTimer.current > 0.1) { vTimer.current = 0; vIdx.current = (vIdx.current + 1 + (Math.floor(t * 13) % 2)) % VISEMES.length; }
      set(VISEMES[vIdx.current], 0.22 + amp * 0.38);
      set("mouthSmileLeft", 0.04); set("mouthSmileRight", 0.04);
    }

    // blink
    blinkT.current -= d;
    let blink = 0;
    if (blinkT.current < 0) {
      blink = 1 - Math.min(1, Math.abs(blinkT.current + 0.06) / 0.06);
      if (blinkT.current < -0.12) blinkT.current = 1.6 + Math.random() * 3;
    }
    set("eyeBlinkLeft", blink); set("eyeBlinkRight", blink);

    // apply morphs, damped for smoothness
    for (const m of meshes) {
      const dict = m.morphTargetDictionary!, inf = m.morphTargetInfluences!;
      for (const n in targets.current) {
        const i = dict[n];
        if (i !== undefined) inf[i] = THREE.MathUtils.damp(inf[i], targets.current[n], 16, d);
      }
    }

    // movements: gentle head + body sway (a touch livelier while speaking)
    if (head) {
      head.rotation.y = Math.sin(t * 0.5) * 0.06 + (spk ? Math.sin(t * 2.3) * 0.03 : 0);
      head.rotation.x = Math.sin(t * 0.4 + 1) * 0.035;
      head.rotation.z = Math.sin(t * 0.32) * 0.02;
    }
    if (spine) {
      spine.rotation.y = Math.sin(t * 0.45) * 0.028;
      spine.rotation.x = Math.sin(t * 1.05) * 0.012; // subtle breathing
    }
  });

  return <primitive object={scene} position={[0, -1.32, 0]} />;
}

export function Avatar3D() {
  return (
    <Canvas camera={{ position: [0, 0.05, 1.85], fov: 33 }} gl={{ alpha: true, antialias: true }} dpr={[1, 2]} style={{ background: "transparent" }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 3, 3]} intensity={1.9} />
      <directionalLight position={[-2, 1, 2]} intensity={0.6} />
      <Model />
    </Canvas>
  );
}
