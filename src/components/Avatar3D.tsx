"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DESIGN_HAIR, DESIGN_SKIN, OUTFIT_COLORS, parseDesign, parseOutfit } from "@/lib/avatar-design";

// A real 3D figure built from simple shapes, using the same parts as the round avatar (skin, hair, eyes, mouth, extra) plus the outfit.
// It spins once all the way round when it appears, turns slowly on its own, and can be dragged to look from any side.
const std = (color: string, rough = 0.62) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
const shade = (hex: string, amt: number) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
};

function build(code: string) {
  const parts = parseDesign(code)!;
  const [, skin, hs, hc, eyes, mouth, extra] = parts;
  const [style, ci] = parseOutfit(code);
  const S = DESIGN_SKIN[skin], H = DESIGN_HAIR[hc], C = OUTFIT_COLORS[ci], Cd = shade(C, -0.14);
  const ink = "#2b2118";
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const skinM = std(S, 0.7), hairM = std(H, 0.55), inkM = std(ink, 0.5);
  const pants = style === 3 ? "#3e5c8a" : style === 4 || style === 1 ? "#3b3f4a" : Cd;
  const shirt = style === 1 || style === 4 ? "#f3efe4" : C;
  const armCol = style === 3 ? S : shirt;

  // legs and shoes
  for (const sx of [-1, 1]) {
    add(new THREE.CapsuleGeometry(0.17, 0.72, 8, 16), std(pants), sx * 0.2, 0.62);
    const shoe = add(new THREE.SphereGeometry(0.22, 20, 14), std(style === 3 ? "#e9e4d6" : "#4a3a2a", 0.5), sx * 0.2, 0.1, 0.08);
    shoe.scale.set(1, 0.55, 1.45);
  }
  // torso
  const torso = add(new THREE.CapsuleGeometry(0.42, 0.62, 10, 24), std(shirt), 0, 1.5);
  torso.scale.set(1, 1, 0.74);
  // arms and hands hang from shoulder pivots so they can be raised
  const arms = [-1, 1].map((sx) => {
    const piv = new THREE.Group();
    piv.position.set(sx * 0.58, 1.88, 0);
    g.add(piv);
    const arm = add(new THREE.CapsuleGeometry(0.115, 0.62, 8, 16), std(armCol), sx * 0.02, -0.38, 0, piv);
    arm.rotation.z = sx * 0.1;
    add(new THREE.SphereGeometry(0.135, 16, 12), skinM, sx * 0.08, -0.8, 0.02, piv);
    return piv;
  });
  // outfit details
  const front = 0.33;
  if (style === 0) {
    const sash = add(new THREE.TorusGeometry(0.42, 0.075, 10, 32), std(Cd), 0, 1.22);
    sash.rotation.x = Math.PI / 2;
    sash.scale.set(1, 0.78, 1);
    add(new THREE.BoxGeometry(0.2, 0.22, 0.07), std(shade(C, -0.24)), 0, 1.2, front + 0.06);
    for (const sx of [-1, 1]) {
      const lapel = add(new THREE.BoxGeometry(0.09, 0.52, 0.05), std(Cd), sx * 0.12, 1.72, front + 0.02);
      lapel.rotation.z = sx * -0.42;
    }
  } else if (style === 1) {
    add(new THREE.BoxGeometry(0.62, 0.78, 0.06), std(C), 0, 1.4, front + 0.03);
    add(new THREE.BoxGeometry(0.3, 0.2, 0.05), std(Cd), 0, 1.2, front + 0.08);
    const strap = add(new THREE.TorusGeometry(0.26, 0.025, 8, 24, Math.PI), std(Cd), 0, 1.78, 0.2);
    strap.rotation.x = -0.4;
  } else if (style === 2) {
    const hood = add(new THREE.TorusGeometry(0.34, 0.15, 12, 28), std(Cd), 0, 1.92, -0.06);
    hood.rotation.x = Math.PI / 2 - 0.35;
    add(new THREE.BoxGeometry(0.5, 0.22, 0.06), std(Cd), 0, 1.22, front + 0.03);
    for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 6), std("#f3efe4"), sx * 0.09, 1.7, front + 0.03);
  } else if (style === 3) {
    [-1, 1].forEach((sx, k) => {
      const sleeve = add(new THREE.CapsuleGeometry(0.125, 0.12, 8, 16), std(C), sx * 0.02, -0.08, 0, arms[k]);
      sleeve.rotation.z = sx * 0.1;
    });
  } else if (style === 4) {
    for (const sx of [-1, 1]) {
      const flap = add(new THREE.BoxGeometry(0.4, 1.0, 0.06), std(C), sx * 0.22, 1.5, front + 0.02);
      flap.rotation.z = sx * 0.03;
    }
    add(new THREE.BoxGeometry(0.015, 0.95, 0.02), std(Cd), 0, 1.5, front + 0.06);
  }

  // neck and head
  add(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 16), skinM, 0, 2.05);
  const headY = 2.45;
  const head = add(new THREE.SphereGeometry(0.58, 40, 32), skinM, 0, headY);
  head.scale.set(0.95, 1.06, 0.98);
  for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.085, 12, 10), skinM, sx * 0.56, headY - 0.02);
  const surf = (x: number, y: number) => 0.58 * 0.98 * Math.sqrt(Math.max(0.0, 1 - (x / (0.58 * 0.95)) ** 2 - ((y - headY) / (0.58 * 1.06)) ** 2));

  // eyes
  const ey = headY + 0.04, ex = 0.2;
  for (const sx of [-1, 1]) {
    const z = surf(sx * ex, ey);
    if (eyes === 0) add(new THREE.SphereGeometry(0.052, 12, 10), inkM, sx * ex, ey, z);
    else if (eyes === 1) { const a = add(new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI), inkM, sx * ex, ey - 0.02, z); a.rotation.z = 0; }
    else if (eyes === 2) { add(new THREE.SphereGeometry(0.1, 16, 12), std("#fff", 0.3), sx * ex, ey, z - 0.01); add(new THREE.SphereGeometry(0.05, 12, 10), inkM, sx * ex, ey, z + 0.07); }
    else if (eyes === 3) add(new THREE.BoxGeometry(0.15, 0.025, 0.03), inkM, sx * ex, ey, z + 0.005);
    else if (eyes === 4) { add(new THREE.TorusGeometry(0.13, 0.016, 8, 24), inkM, sx * ex, ey, z + 0.02); add(new THREE.SphereGeometry(0.035, 10, 8), inkM, sx * ex, ey, z + 0.02); }
    else add(new THREE.BoxGeometry(0.24, 0.12, 0.05), inkM, sx * ex, ey, z + 0.03).geometry.translate(0, 0, 0);
  }
  if (eyes === 4) add(new THREE.BoxGeometry(0.12, 0.016, 0.016), inkM, 0, ey, surf(0, ey) + 0.02);
  if (eyes === 5) add(new THREE.BoxGeometry(0.1, 0.02, 0.03), inkM, 0, ey, surf(0, ey) + 0.03);

  // mouth (kept in a list so a big celebration smile can replace it for a moment)
  const my = headY - 0.22, mz = surf(0, my);
  const before = g.children.length;
  if (mouth === 0) { const m = add(new THREE.TorusGeometry(0.11, 0.018, 8, 20, Math.PI), inkM, 0, my + 0.06, mz); m.rotation.z = Math.PI; }
  else if (mouth === 1) { const m = add(new THREE.CircleGeometry(0.13, 24, Math.PI, Math.PI), std("#fff", 0.35), 0, my + 0.05, mz + 0.005); m.material.side = THREE.DoubleSide; add(new THREE.TorusGeometry(0.13, 0.014, 8, 20, Math.PI), inkM, 0, my + 0.05, mz + 0.007).rotation.z = Math.PI; }
  else if (mouth === 2) add(new THREE.BoxGeometry(0.15, 0.022, 0.02), inkM, 0, my, mz + 0.005);
  else if (mouth === 3) { const m = add(new THREE.SphereGeometry(0.06, 14, 12), std("#7a2b2b"), 0, my, mz); m.scale.set(1, 1.2, 0.4); }
  else if (mouth === 4) { const m = add(new THREE.TorusGeometry(0.05, 0.016, 8, 16, Math.PI), inkM, 0, my + 0.02, mz); m.rotation.z = Math.PI; }
  else { const m = add(new THREE.TorusGeometry(0.1, 0.016, 8, 16, Math.PI * 0.7), inkM, 0.02, my + 0.05, mz); m.rotation.z = Math.PI * 1.15; }

  const mouths = g.children.slice(before);
  const grin = new THREE.Group();
  {
    const mouthIn = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: "#7a2b2b", roughness: 0.5, side: THREE.DoubleSide }));
    mouthIn.position.set(0, my + 0.07, mz + 0.01);
    const teeth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28, Math.PI + 0.35, Math.PI - 0.7), new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.3, side: THREE.DoubleSide }));
    teeth.position.set(0, my + 0.071, mz + 0.012);
    teeth.scale.set(1, 0.4, 1);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.016, 8, 24, Math.PI), inkM);
    lip.position.set(0, my + 0.07, mz + 0.014);
    lip.rotation.z = Math.PI;
    grin.add(mouthIn, teeth, lip);
    grin.visible = false;
    g.add(grin);
  }

  // hair and hats
  const cap = (r = 0.62, phi = Math.PI * 0.46) => {
    const m = add(new THREE.SphereGeometry(r, 36, 24, 0, Math.PI * 2, 0, phi), hairM, 0, headY + 0.03, -0.05);
    m.rotation.x = -0.5; // tilted back so the forehead and eyes stay clear
    m.scale.set(0.97, 1.06, 1.0);
    m.material.side = THREE.DoubleSide;
    return m;
  };
  if (hs === 1) cap();
  else if (hs === 2) { cap(0.63, Math.PI * 0.5); const back = add(new THREE.CapsuleGeometry(0.46, 0.7, 8, 20), hairM, 0, headY - 0.42, -0.14); back.scale.set(1, 1, 0.55); }
  else if (hs === 3) { cap(); add(new THREE.SphereGeometry(0.2, 20, 16), hairM, 0, headY + 0.68, -0.05); }
  else if (hs === 4) { cap(0.63, Math.PI * 0.5); const back = add(new THREE.CylinderGeometry(0.6, 0.55, 0.5, 28, 1, true), hairM, 0, headY - 0.18, -0.04); back.scale.set(0.97, 1, 1); back.material.side = THREE.DoubleSide; }
  else if (hs === 5) { for (let i = 0; i < 34; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.15; const x = Math.sin(b) * Math.cos(a) * 0.52, z = Math.sin(b) * Math.sin(a) * 0.52 - 0.04, y = Math.cos(b) * 0.58; if (z > 0.3 && y < 0.3) continue; add(new THREE.SphereGeometry(0.16, 12, 10), hairM, x, headY + y, z); } }
  else if (hs === 6) { cap(0.62, Math.PI * 0.4); const brim = add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24, 1, false, -Math.PI / 2, Math.PI), hairM, 0, headY + 0.2, 0.5); brim.scale.set(1, 1, 0.55); brim.rotation.x = 0.15; }
  else if (hs === 7) { add(new THREE.ConeGeometry(0.62, 0.42, 28), std("#e6c47a", 0.8), 0, headY + 0.58, 0); add(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 32), std("#d9b46a", 0.8), 0, headY + 0.36, 0); }
  else if (hs === 8) { cap(); const band = add(new THREE.TorusGeometry(0.58, 0.04, 8, 36), std("#c0577a"), 0, headY + 0.22, 0); band.rotation.x = Math.PI / 2; band.scale.set(0.97, 1, 1); }
  else if (hs === 9) { const b = add(new THREE.SphereGeometry(0.5, 24, 16), std("#3f7d3a", 0.8), 0.04, headY + 0.5, 0); b.scale.set(1.15, 0.3, 1.05); add(new THREE.SphereGeometry(0.04, 8, 8), std("#3f7d3a"), 0.04, headY + 0.67, 0); }

  // extras
  if (extra === 1) {
    add(new THREE.CylinderGeometry(0.17, 0.12, 0.2, 20), std("#3f7d3a", 0.4), 0.12, -0.76, 0.2, arms[1]);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 20), std("#8fbf7a", 0.5), 0.12, -0.66, 0.2, arms[1]);
  } else if (extra === 2) {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), std("#8a6a3a"), 0.12, -0.66, 0.14, arms[1]);
    add(new THREE.SphereGeometry(0.11, 14, 10), std("#c9a86a", 0.7), 0.12, -0.88, 0.14, arms[1]).scale.set(1, 1.2, 1);
  } else if (extra === 3) {
    const l = add(new THREE.SphereGeometry(0.15, 14, 10), std("#4a9a4a"), 0.5, headY + 0.45, 0.1);
    l.scale.set(1, 0.3, 0.55);
    l.rotation.z = -0.6;
  } else if (extra === 4) {
    for (const sx of [-1, 1]) { const b = add(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: "#f08a9a", transparent: true, opacity: 0.55 }), sx * 0.32, headY - 0.1, surf(sx * 0.32, headY - 0.1) + 0.01); b.lookAt(sx * 0.6, headY - 0.1, 1.2); }
  } else if (extra === 5) {
    for (const [x, y, z] of [[-0.75, headY + 0.5, 0.1], [0.78, headY + 0.75, 0.1]]) add(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: "#e6b93a" }), x, y, z);
  }
  return { g, arms, mouths, grin };
}

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
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "pan-y";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 50);
    camera.position.set(0, 1.55, 8.4);
    camera.lookAt(0, 1.45, 0);
    scene.add(new THREE.HemisphereLight("#ffffff", "#cdbfa0", 1.5));
    const key = new THREE.DirectionalLight("#ffffff", 2.1);
    key.position.set(2.5, 5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#cfe8ff", 0.9);
    rim.position.set(-3, 2, -4);
    scene.add(rim);

    const pivot = new THREE.Group();
    const { g: fig, arms, mouths, grin } = build(code);
    pivot.add(fig);
    scene.add(pivot);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.16 }));
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
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [code, height, onFail]);

  return <div ref={host} style={{ width: Math.round(height * 0.6), height }} aria-label="Your 3D avatar. Drag to turn it." role="img" />;
}
