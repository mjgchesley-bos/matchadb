"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { build } from "@/lib/avatar3d-build";
import { parseDesign } from "@/lib/avatar-design";

// The 3D figure on a stage: soft studio lighting (an environment map plus a key and a rim light), filmic tone mapping, and a contact shadow.
// It spins once with a celebration when it appears, then sways gently, and can be dragged to look from any side.
export default function Avatar3D({ code, height, onFail }: { code: string; height: number; onFail: () => void }) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !parseDesign(code)) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      onFail();
      return;
    }
    const w = Math.round(height * 0.6), h = height;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "pan-y";
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = 0.75;
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 50);
    camera.position.set(0, 1.55, 8.4);
    camera.lookAt(0, 1.45, 0);
    scene.add(new THREE.HemisphereLight("#fff6ea", "#cdbfa0", 0.55));
    const key = new THREE.DirectionalLight("#fff4e6", 2.2);
    key.position.set(2.5, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#cfe8ff", 1.1);
    rim.position.set(-3, 2.5, -4);
    scene.add(rim);

    const pivot = new THREE.Group();
    const { g: fig, arms, mouths, grin } = build(code);
    pivot.add(fig);
    scene.add(pivot);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 40), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.18 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    scene.add(shadow);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Arrival: one big 360 spin with both arms thrown up and a big smile, then a gentle 45-degree sway left and right.
    const SPIN_MS = 2300, CELEBRATE_MS = 3400, SWAY = Math.PI / 4;
    let t0 = reduce ? 0 : performance.now(), dragging = false, lastX = 0, vel = 0, raf = 0, idle = 0;
    const smooth = (x: number) => x * x * (3 - 2 * x);
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; t0 = 0; renderer.domElement.setPointerCapture(e.pointerId); renderer.domElement.style.cursor = "grabbing"; };
    const move = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; pivot.rotation.y += dx * 0.012; vel = dx * 0.012; };
    const up = () => { dragging = false; renderer.domElement.style.cursor = "grab"; };
    const dbl = () => { t0 = performance.now(); pivot.rotation.y = 0; };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    renderer.domElement.addEventListener("dblclick", dbl);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      let armUp = 0, jump = 0, celebrating = false;
      if (t0) {
        const el = now - t0;
        if (el < CELEBRATE_MS) {
          celebrating = true;
          const p = Math.min(1, el / SPIN_MS);
          pivot.rotation.y = (1 - Math.pow(1 - p, 3)) * Math.PI * 2;
          jump = Math.sin(Math.min(1, el / 1400) * Math.PI) * 0.22;
          // arms up fast, held, then lowered
          armUp = el < 600 ? smooth(el / 600) : el < 2700 ? 1 : 1 - smooth((el - 2700) / (CELEBRATE_MS - 2700));
          if (el > 450 && el < 2700) armUp += Math.sin(el / 90) * 0.06; // a little wave of the arms
        } else {
          t0 = 0;
          idle = now;
        }
      }
      if (!t0 && !dragging) {
        if (reduce) {
          pivot.rotation.y *= 0.9;
        } else {
          vel *= 0.9;
          const target = Math.sin((now - idle) / 1500) * SWAY;
          // glide to the sway position, wherever a drag left the figure
          let cur = pivot.rotation.y % (Math.PI * 2);
          if (cur > Math.PI) cur -= Math.PI * 2;
          if (cur < -Math.PI) cur += Math.PI * 2;
          pivot.rotation.y = cur + (target - cur) * 0.06 + vel;
        }
      }
      arms[0].rotation.z = -armUp * 2.75;
      arms[1].rotation.z = armUp * 2.75;
      mouths.forEach((m) => (m.visible = !celebrating));
      grin.visible = celebrating;
      fig.position.y = jump + Math.sin(now / 600) * 0.012;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("dblclick", dbl);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      (scene.environment as THREE.Texture | null)?.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [code, height, onFail]);

  return <div ref={host} style={{ width: Math.round(height * 0.6), height }} aria-label="Your 3D avatar. Drag to turn it." role="img" />;
}
