import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DESIGN_HAIR, DESIGN_SKIN, OUTFIT_COLORS, parseDesign, parseOutfit } from "@/lib/avatar-design";

// Builds the 3D figure: sculpted body, a real jacket (open front, collar, lapels, zip, pockets, cuffs), a kimono robe, apron, hoodie and tee,
// glossy hair, a face with brows and a nose, and a soft ink outline around every big shape for a clean toy-like look.
const INK = "#2a1f17";

export const shade = (hex: string, amt: number) => {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
};

export function build(code: string) {
  const parts = parseDesign(code)!;
  const [, skin, hs, hc, eyes, mouth, extra] = parts;
  const [style, ci] = parseOutfit(code);
  const S = DESIGN_SKIN[skin], H = DESIGN_HAIR[hc], C = OUTFIT_COLORS[ci], Cd = shade(C, -0.14), Cl = shade(C, 0.1);
  const g = new THREE.Group();

  // ---- materials and outlines
  const phys = (color: string, o: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0, ...o });
  const cloth = (c: string) => phys(c, { roughness: 0.88, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(shade(c, 0.2)), side: THREE.DoubleSide });
  const skinM = phys(S, { roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color("#ffd2bd"), sheenRoughness: 0.6 });
  const hairM = phys(H, { roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.DoubleSide });
  const inkM = phys(INK, { roughness: 0.4 });
  const outlines = new Map<number, THREE.ShaderMaterial>();
  const outlineMat = (t: number) => {
    let m = outlines.get(t);
    if (!m) {
      m = new THREE.ShaderMaterial({
        uniforms: { t: { value: t }, c: { value: new THREE.Color(INK) } },
        vertexShader: "uniform float t; void main(){ vec3 p = position + normalize(normal) * t; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }",
        fragmentShader: "uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }",
        side: THREE.BackSide,
      });
      outlines.set(t, m);
    }
    return m;
  };
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = g, line = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (line) m.add(new THREE.Mesh(geo, outlineMat(line)));
    parent.add(m);
    return m;
  };

  const pants = style === 3 ? "#3e5c8a" : style === 4 || style === 1 ? "#3b3f4a" : Cd;
  const shirt = style === 1 || style === 4 ? "#f3efe4" : C;
  const armIsSkin = style === 3;

  // ---- legs and shoes
  for (const sx of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.175, 0.14, 1.0, 22), cloth(pants), sx * 0.2, 0.56, 0, g, 0.018);
    add(new THREE.TorusGeometry(0.145, 0.03, 10, 24), cloth(shade(pants, -0.08)), sx * 0.2, 0.1, 0).rotation.x = Math.PI / 2;
    const shoe = add(new THREE.SphereGeometry(0.22, 24, 16), phys(style === 3 ? "#f1ece0" : "#5a4330", { roughness: 0.4, clearcoat: 0.3 }), sx * 0.2, 0.1, 0.09, g, 0.02);
    shoe.scale.set(1, 0.58, 1.5);
    const sole = add(new THREE.SphereGeometry(0.22, 20, 10), phys("#f4efe4", { roughness: 0.6 }), sx * 0.2, 0.045, 0.09);
    sole.scale.set(1.04, 0.2, 1.54);
  }

  // ---- torso: a lathe profile gives shoulders, chest, waist and hips
  const prof = (grow = 0) => [[0.345, 0], [0.38, 0.1], [0.35, 0.34], [0.36, 0.55], [0.405, 0.78], [0.425, 0.92], [0.37, 1.02], [0.23, 1.08], [0.17, 1.1]].map(([r, y]) => new THREE.Vector2(r + grow * (y > 1.05 ? 0.3 : 1), y));
  const shell = (mat: THREE.Material, grow = 0, line = 0, gap = 0) => {
    const geo = new THREE.LatheGeometry(prof(grow), 44, gap, Math.PI * 2 - gap * 2);
    const m = add(geo, mat, 0, 1.0, 0, g, line);
    m.scale.set(1, 1, 0.76);
    return m;
  };
  shell(cloth(shirt), 0, 0.02);
  const front = 0.32;

  // ---- arms hang from shoulder pivots so they can be raised
  const sleeveCol = style === 4 ? C : style === 1 ? "#f3efe4" : style === 3 ? C : C;
  const arms = [-1, 1].map((sx) => {
    const piv = new THREE.Group();
    piv.position.set(sx * 0.58, 1.9, 0);
    g.add(piv);
    const long = !armIsSkin;
    add(new THREE.CylinderGeometry(0.13, 0.105, 0.74, 20), long ? cloth(sleeveCol) : skinM, sx * 0.03, -0.38, 0, piv, 0.018).rotation.z = sx * 0.08;
    add(new THREE.SphereGeometry(0.135, 16, 12), long ? cloth(sleeveCol) : skinM, sx * 0.0, 0.0, 0, piv);
    add(new THREE.SphereGeometry(0.115, 18, 14), skinM, sx * 0.095, -0.8, 0.02, piv, 0.018);
    add(new THREE.SphereGeometry(0.046, 10, 8), skinM, sx * 0.04, -0.77, 0.1, piv);
    return piv;
  });

  // ---- outfits
  if (style === 0) {
    // kimono robe: closed wrap, crossed collar over a white under-collar, wide sash with a bow, flared sleeves
    shell(cloth(C), 0.035, 0.02);
    for (const sx of [-1, 1]) {
      const under = add(new THREE.BoxGeometry(0.075, 0.62, 0.025), cloth("#f3efe4"), sx * 0.07, 1.74, front + 0.04);
      under.rotation.z = sx * 0.5;
      const lap = add(new THREE.BoxGeometry(0.1, 0.66, 0.03), cloth(sx > 0 ? Cl : Cd), sx * 0.12, 1.72, front + 0.07);
      lap.rotation.z = sx * 0.46;
    }
    add(new THREE.CylinderGeometry(0.392, 0.385, 0.22, 36, 1, true), cloth(shade(C, -0.22)), 0, 1.3, 0, g, 0.012).scale.set(1, 1, 0.76);
    add(new THREE.BoxGeometry(0.2, 0.2, 0.05), cloth(shade(C, -0.3)), 0, 1.3, front + 0.08);
    for (const sx of [-1, 1]) {
      const tail = add(new THREE.BoxGeometry(0.1, 0.34, 0.03), cloth(shade(C, -0.3)), sx * 0.11, 1.12, -front - 0.06);
      tail.rotation.z = sx * 0.2;
      add(new THREE.SphereGeometry(0.1, 14, 10), cloth(shade(C, -0.3)), sx * 0.09, 1.34, -front - 0.04).scale.set(1.2, 0.7, 0.6);
    }
    arms.forEach((a, k) => {
      const sx = k === 0 ? -1 : 1;
      add(new THREE.CylinderGeometry(0.17, 0.235, 0.58, 22, 1, true), cloth(C), sx * 0.04, -0.34, 0, a, 0.014);
      add(new THREE.TorusGeometry(0.2, 0.025, 8, 28), cloth("#f3efe4"), sx * 0.04, -0.63, 0, a).rotation.x = Math.PI / 2;
    });
  } else if (style === 1) {
    // apron over a white shirt: a bib and a skirt that wrap the body, a pocket, a neck strap and a waist tie
    const A = cloth(C), Ad = cloth(Cd);
    const wrap = (pts: [number, number][], phi: number, mat: THREE.Material) => {
      const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28, -phi, phi * 2);
      const m = add(geo, mat, 0, 1.0, 0, g, 0.014);
      m.scale.set(1, 1, 0.76);
      return m;
    };
    wrap([[0.368, 0.56], [0.41, 0.78], [0.425, 0.94], [0.405, 1.0]], 0.62, A);
    wrap([[0.355, 0.4], [0.385, 0.18], [0.41, -0.06], [0.42, -0.22]], 1.05, A);
    add(new THREE.TorusGeometry(0.385, 0.035, 8, 40, 2.3), Ad, 0, 1.4, 0).rotation.set(Math.PI / 2, 0, Math.PI / 2 - 1.15);
    add(new RoundedBoxGeometry(0.26, 0.17, 0.04, 4, 0.04), Ad, 0, 1.12, front + 0.085);
    for (const sx of [-1, 1]) {
      const strap = add(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 8), Ad, sx * 0.17, 1.9, 0.12);
      strap.rotation.set(0.15, 0, sx * 0.22);
      const tie = add(new THREE.BoxGeometry(0.09, 0.3, 0.025), Ad, sx * 0.1, 1.2, -front - 0.04);
      tie.rotation.z = sx * 0.3;
    }
    add(new THREE.SphereGeometry(0.07, 12, 8), Ad, 0, 1.4, -front - 0.03);
  } else if (style === 2) {
    // hoodie: hood, kangaroo pocket, drawstrings, ribbed cuffs and hem
    shell(cloth(C), 0.03, 0.02);
    const hood = add(new THREE.TorusGeometry(0.3, 0.14, 14, 32), cloth(Cd), 0, 2.0, -0.07, g, 0.016);
    hood.rotation.x = Math.PI / 2 - 0.38;
    add(new THREE.CircleGeometry(0.22, 24), phys(shade(Cd, -0.12)), 0, 2.0, -0.04).rotation.x = -Math.PI / 2 + 0.3;
    add(new RoundedBoxGeometry(0.5, 0.26, 0.05, 4, 0.05), cloth(Cd), 0, 1.22, front + 0.04, g, 0.012);
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), cloth("#f3efe4"), sx * 0.085, 1.76, front + 0.05);
      add(new THREE.SphereGeometry(0.026, 8, 6), phys("#d9d4c6", { metalness: 0.5 }), sx * 0.085, 1.56, front + 0.05);
    }
    add(new THREE.TorusGeometry(0.385, 0.045, 10, 36), cloth(shade(C, -0.1)), 0, 1.02, 0).rotation.x = Math.PI / 2;
    arms.forEach((a, k) => add(new THREE.TorusGeometry(0.108, 0.04, 8, 20), cloth(shade(C, -0.1)), (k === 0 ? -1 : 1) * 0.06, -0.72, 0, a).rotation.x = Math.PI / 2);
  } else if (style === 3) {
    // tee: crew neck and short sleeves (bare forearms)
    shell(cloth(C), 0.02, 0.02);
    add(new THREE.TorusGeometry(0.19, 0.032, 10, 28), cloth(shade(C, -0.12)), 0, 2.07, 0.015).rotation.x = Math.PI / 2;
    arms.forEach((a, k) => {
      const sx = k === 0 ? -1 : 1;
      add(new THREE.CylinderGeometry(0.15, 0.14, 0.3, 20), cloth(C), sx * 0.012, -0.12, 0, a, 0.016);
      add(new THREE.TorusGeometry(0.143, 0.025, 8, 22), cloth(shade(C, -0.1)), sx * 0.025, -0.27, 0, a).rotation.x = Math.PI / 2;
    });
    // jeans: stitched seams
    for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.009, 0.009, 0.96, 6), phys("#d9c28a"), sx * 0.37, 0.56, 0.02);
  } else {
    // jacket: open front over a tee, stand-up collar, folded lapels, zip piping, pockets with flaps, ribbed hem and cuffs
    const gap = 0.36;
    const J = cloth(C), Jd = cloth(Cd);
    shell(J, 0.05, 0.02, gap);
    // front edges: piping and zip tape follow the profile
    for (const sx of [-1, 1]) {
      const pts = prof(0.05).map((p) => new THREE.Vector3(p.x * Math.sin(sx * gap), p.y + 1.0, p.x * Math.cos(gap) * 0.76));
      const curve = new THREE.CatmullRomCurve3(pts);
      add(new THREE.TubeGeometry(curve, 24, 0.02, 8), Jd);
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x * 0.94, p.y, p.z + 0.012))), 24, 0.008, 6), phys("#cfcfcf", { metalness: 0.85, roughness: 0.3 }));
    }
    // collar and lapels
    const collar = add(new THREE.CylinderGeometry(0.235, 0.265, 0.15, 30, 1, true, 0.42, Math.PI * 2 - 0.84), J, 0, 2.08, 0, g, 0.014);
    collar.scale.set(1, 1, 0.9);
    add(new THREE.TorusGeometry(0.25, 0.022, 8, 30, Math.PI * 2 - 0.84), Jd, 0, 2.005, 0).rotation.set(Math.PI / 2, 0, Math.PI / 2 + 0.42);
    for (const sx of [-1, 1]) {
      const lapel = add(new RoundedBoxGeometry(0.13, 0.42, 0.04, 3, 0.02), Jd, sx * 0.17, 1.83, front + 0.05, g, 0.012);
      lapel.rotation.z = sx * 0.42;
      lapel.rotation.y = sx * -0.35;
    }
    // inner tee neckline
    add(new THREE.TorusGeometry(0.185, 0.026, 8, 26), cloth("#d8d2c4"), 0, 2.06, 0.03).rotation.x = Math.PI / 2;
    // pockets with flaps
    for (const sx of [-1, 1]) {
      add(new RoundedBoxGeometry(0.2, 0.19, 0.045, 3, 0.03), Jd, sx * 0.235, 1.27, front + 0.025, g, 0.01);
      add(new RoundedBoxGeometry(0.22, 0.055, 0.055, 3, 0.02), J, sx * 0.235, 1.375, front + 0.035);
    }
    // ribbed hem and cuffs
    add(new THREE.TorusGeometry(0.385, 0.04, 10, 40, Math.PI * 2 - gap * 2), Jd, 0, 1.03, 0).rotation.set(Math.PI / 2, 0, -Math.PI / 2 + gap);
    arms.forEach((a, k) => {
      const sx = k === 0 ? -1 : 1;
      add(new THREE.TorusGeometry(0.113, 0.04, 8, 22), Jd, sx * 0.07, -0.75, 0, a, 0.012).rotation.x = Math.PI / 2;
      add(new THREE.TorusGeometry(0.137, 0.012, 6, 22), phys("#cfcfcf", { metalness: 0.8 }), sx * 0.0, -0.04, 0, a).rotation.x = Math.PI / 2;
    });
  }

  // ---- neck and head
  add(new THREE.CylinderGeometry(0.155, 0.18, 0.24, 20), skinM, 0, 2.03);
  const headY = 2.45;
  const head = add(new THREE.SphereGeometry(0.58, 48, 36), skinM, 0, headY, 0, g, 0.02);
  head.scale.set(0.95, 1.06, 0.98);
  for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.085, 14, 12), skinM, sx * 0.56, headY - 0.02, 0, g, 0.012);
  const surf = (x: number, y: number) => 0.58 * 0.98 * Math.sqrt(Math.max(0, 1 - (x / (0.58 * 0.95)) ** 2 - ((y - headY) / (0.58 * 1.06)) ** 2));

  // ---- face: eyes with a glint, brows, a small nose
  const ey = headY + 0.04, ex = 0.2;
  const glint = (x: number, y: number, z: number, r = 0.016) => add(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), x, y, z);
  for (const sx of [-1, 1]) {
    const z = surf(sx * ex, ey);
    if (eyes === 0) { add(new THREE.SphereGeometry(0.056, 16, 12), inkM, sx * ex, ey, z); glint(sx * ex + 0.018, ey + 0.02, z + 0.045); }
    else if (eyes === 1) add(new THREE.TorusGeometry(0.07, 0.019, 8, 18, Math.PI), inkM, sx * ex, ey - 0.02, z);
    else if (eyes === 2) { add(new THREE.SphereGeometry(0.1, 18, 14), phys("#ffffff", { roughness: 0.25 }), sx * ex, ey, z - 0.01); add(new THREE.SphereGeometry(0.052, 14, 12), inkM, sx * ex, ey, z + 0.07); glint(sx * ex + 0.02, ey + 0.025, z + 0.115); }
    else if (eyes === 3) add(new THREE.CapsuleGeometry(0.014, 0.12, 4, 8), inkM, sx * ex, ey, z + 0.01).rotation.z = Math.PI / 2;
    else if (eyes === 4) { add(new THREE.TorusGeometry(0.13, 0.017, 8, 28), inkM, sx * ex, ey, z + 0.02); add(new THREE.SphereGeometry(0.036, 10, 8), inkM, sx * ex, ey, z + 0.02); glint(sx * ex + 0.012, ey + 0.015, z + 0.055, 0.012); }
    else { const lens = add(new THREE.SphereGeometry(0.13, 18, 12), phys("#1d1d22", { roughness: 0.15, clearcoat: 1 }), sx * ex, ey, z + 0.03); lens.scale.set(1, 0.68, 0.3); }
    if (eyes !== 5) { const brow = add(new THREE.CapsuleGeometry(0.014, 0.1, 4, 8), phys(shade(H, -0.06)), sx * ex, ey + 0.135, surf(sx * ex, ey + 0.135) + 0.008); brow.rotation.z = Math.PI / 2 + sx * 0.14; }
  }
  if (eyes === 4) add(new THREE.BoxGeometry(0.12, 0.016, 0.016), inkM, 0, ey, surf(0, ey) + 0.02);
  if (eyes === 5) add(new THREE.BoxGeometry(0.1, 0.02, 0.03), phys("#1d1d22"), 0, ey, surf(0, ey) + 0.03);
  add(new THREE.SphereGeometry(0.04, 12, 10), phys(shade(S, -0.07), { roughness: 0.6 }), 0, headY - 0.07, surf(0, headY - 0.07) + 0.025).scale.set(1, 0.9, 0.8);

  // ---- mouth (kept in a list so a big celebration smile can replace it for a moment)
  const my = headY - 0.23, mz = surf(0, my);
  const before = g.children.length;
  if (mouth === 0) { const m = add(new THREE.TorusGeometry(0.11, 0.019, 8, 22, Math.PI), inkM, 0, my + 0.06, mz); m.rotation.z = Math.PI; }
  else if (mouth === 1) { const m = add(new THREE.CircleGeometry(0.13, 24, Math.PI, Math.PI), phys("#ffffff", { roughness: 0.3, side: THREE.DoubleSide }), 0, my + 0.05, mz + 0.005); m.position.z = mz + 0.005; add(new THREE.TorusGeometry(0.13, 0.015, 8, 22, Math.PI), inkM, 0, my + 0.05, mz + 0.007).rotation.z = Math.PI; }
  else if (mouth === 2) add(new THREE.CapsuleGeometry(0.012, 0.13, 4, 8), inkM, 0, my, mz + 0.005).rotation.z = Math.PI / 2;
  else if (mouth === 3) { const m = add(new THREE.SphereGeometry(0.06, 16, 12), phys("#7a2b2b"), 0, my, mz); m.scale.set(1, 1.2, 0.4); }
  else if (mouth === 4) { const m = add(new THREE.TorusGeometry(0.05, 0.017, 8, 16, Math.PI), inkM, 0, my + 0.02, mz); m.rotation.z = Math.PI; }
  else { const m = add(new THREE.TorusGeometry(0.1, 0.017, 8, 16, Math.PI * 0.7), inkM, 0.02, my + 0.05, mz); m.rotation.z = Math.PI * 1.15; }
  const mouths = g.children.slice(before);
  const grin = new THREE.Group();
  {
    const inside = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: "#7a2b2b", roughness: 0.5, side: THREE.DoubleSide }));
    inside.position.set(0, my + 0.07, mz + 0.01);
    const teeth = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28, Math.PI + 0.35, Math.PI - 0.7), new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.3, side: THREE.DoubleSide }));
    teeth.position.set(0, my + 0.071, mz + 0.012);
    teeth.scale.set(1, 0.4, 1);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.017, 8, 24, Math.PI), inkM);
    lip.position.set(0, my + 0.07, mz + 0.014);
    lip.rotation.z = Math.PI;
    grin.add(inside, teeth, lip);
    grin.visible = false;
    g.add(grin);
  }

  // ---- hair and hats
  const cap = (r = 0.62, phi = Math.PI * 0.46) => {
    const m = add(new THREE.SphereGeometry(r, 40, 28, 0, Math.PI * 2, 0, phi), hairM, 0, headY + 0.03, -0.05, g, 0.018);
    m.rotation.x = -0.5; // tilted back so the forehead and eyes stay clear
    m.scale.set(0.97, 1.06, 1.0);
    return m;
  };
  if (hs === 1) { cap(); for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.09, 12, 10), hairM, sx * 0.5, headY + 0.12, 0.08).scale.set(0.8, 1.2, 0.8); }
  else if (hs === 2) { cap(0.63, Math.PI * 0.5); add(new THREE.CapsuleGeometry(0.46, 0.7, 10, 24), hairM, 0, headY - 0.42, -0.14, g, 0.018).scale.set(1, 1, 0.55); }
  else if (hs === 3) { cap(); add(new THREE.SphereGeometry(0.2, 22, 18), hairM, 0, headY + 0.68, -0.05, g, 0.016); add(new THREE.TorusGeometry(0.15, 0.03, 8, 20), phys(shade(H, -0.1)), 0, headY + 0.56, -0.05).rotation.x = Math.PI / 2; }
  else if (hs === 4) { cap(0.63, Math.PI * 0.5); const back = add(new THREE.CylinderGeometry(0.6, 0.55, 0.5, 30, 1, true, 0.95, Math.PI * 2 - 1.9), hairM, 0, headY - 0.18, -0.04, g, 0.016); back.scale.set(0.97, 1, 1); }
  else if (hs === 5) { for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, b = Math.random() * 1.15; const x = Math.sin(b) * Math.cos(a) * 0.52, z = Math.sin(b) * Math.sin(a) * 0.52 - 0.04, y = Math.cos(b) * 0.58; if (z > 0.3 && y < 0.3) continue; add(new THREE.SphereGeometry(0.16, 14, 10), hairM, x, headY + y, z, g, 0.012); } }
  else if (hs === 6) { cap(0.62, Math.PI * 0.4); const brim = add(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 28, 1, false, -Math.PI / 2, Math.PI), hairM, 0, headY + 0.2, 0.5, g, 0.012); brim.scale.set(1, 1, 0.55); brim.rotation.x = 0.15; }
  else if (hs === 7) { add(new THREE.ConeGeometry(0.62, 0.42, 32), phys("#e6c47a", { roughness: 0.8 }), 0, headY + 0.58, 0, g, 0.016); add(new THREE.CylinderGeometry(0.78, 0.78, 0.045, 36), phys("#d9b46a", { roughness: 0.8 }), 0, headY + 0.36, 0, g, 0.014); }
  else if (hs === 8) { cap(); const band = add(new THREE.TorusGeometry(0.58, 0.045, 10, 40), phys("#c0577a"), 0, headY + 0.22, 0); band.rotation.x = Math.PI / 2; band.scale.set(0.97, 1, 1); }
  else if (hs === 9) { const b = add(new THREE.SphereGeometry(0.5, 28, 18), phys("#3f7d3a", { roughness: 0.8 }), 0.04, headY + 0.5, 0, g, 0.016); b.scale.set(1.15, 0.3, 1.05); add(new THREE.SphereGeometry(0.045, 10, 8), phys("#3f7d3a"), 0.04, headY + 0.67, 0); }

  // ---- extras
  if (extra === 1) {
    add(new THREE.CylinderGeometry(0.17, 0.12, 0.2, 24), phys("#3f7d3a", { roughness: 0.35, clearcoat: 0.5 }), 0.12, -0.76, 0.2, arms[1], 0.012);
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 24), phys("#8fbf7a", { roughness: 0.5 }), 0.12, -0.66, 0.2, arms[1]);
  } else if (extra === 2) {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10), phys("#8a6a3a"), 0.12, -0.66, 0.14, arms[1]);
    add(new THREE.SphereGeometry(0.11, 16, 12), phys("#c9a86a", { roughness: 0.7 }), 0.12, -0.88, 0.14, arms[1]).scale.set(1, 1.2, 1);
  } else if (extra === 3) {
    const l = add(new THREE.SphereGeometry(0.15, 16, 12), phys("#4a9a4a"), 0.5, headY + 0.45, 0.1, g, 0.01);
    l.scale.set(1, 0.3, 0.55);
    l.rotation.z = -0.6;
  } else if (extra === 4) {
    for (const sx of [-1, 1]) { const b = add(new THREE.CircleGeometry(0.075, 18), new THREE.MeshBasicMaterial({ color: "#f08a9a", transparent: true, opacity: 0.55 }), sx * 0.32, headY - 0.1, surf(sx * 0.32, headY - 0.1) + 0.01); b.lookAt(sx * 0.6, headY - 0.1, 1.2); }
  } else if (extra === 5) {
    for (const [x, y, z] of [[-0.75, headY + 0.5, 0.1], [0.78, headY + 0.75, 0.1]]) add(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: "#e6b93a" }), x, y, z);
  }
  return { g, arms, mouths, grin };
}
