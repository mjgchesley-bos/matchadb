import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { DESIGN_HAIR, DESIGN_SKIN, OUTFIT_COLORS, SHOE_COLORS, parseDesign, parseOutfit } from "@/lib/avatar-design";

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
  const [style, ci, shoeStyle, shoeCi] = parseOutfit(code);
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

  const pants = style === 3 || style === 7 || style === 9 ? "#3e5c8a" : style === 4 || style === 1 ? "#3b3f4a" : style === 5 || style === 6 ? S : style === 8 ? C : style === 10 || style === 13 ? "#3b3f4a" : style === 11 ? "#3e5c8a" : Cd;
  const shirt = style === 1 || style === 4 || style === 8 || style === 12 || style === 13 ? "#f3efe4" : style === 6 ? Cl : C;
  const armIsSkin = style === 3 || style === 5 || style === 6 || style === 8 || style === 9 || style === 11;

  // ---- legs and shoes
  for (const sx of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.175, 0.14, 1.0, 22), cloth(pants), sx * 0.2, 0.56, 0, g, 0.018);
    add(new THREE.TorusGeometry(0.145, 0.03, 10, 24), cloth(shade(pants, -0.08)), sx * 0.2, 0.1, 0).rotation.x = Math.PI / 2;
    // shoes: style and colour are the wearer's pick; "Classic" in the first colour keeps the old look (white with a tee, brown otherwise)
    const sc = shoeStyle === 0 && shoeCi === 0 ? (style === 3 || style === 9 ? "#f1ece0" : "#5a4330") : SHOE_COLORS[shoeCi];
    const x = sx * 0.2;
    const body = (sy = 0.58, y = 0.1, mat?: THREE.Material, sxs = 1, sz = 1.5) => { const m = add(new THREE.SphereGeometry(0.22, 24, 16), mat ?? phys(sc, { roughness: 0.4, clearcoat: 0.3 }), x, y, 0.09, g, 0.02); m.scale.set(sxs, sy, sz); return m; };
    const sole = (h = 0.2, col = "#f4efe4", y = 0.045) => { const m = add(new THREE.SphereGeometry(0.22, 20, 10), phys(col, { roughness: 0.6 }), x, y, 0.09); m.scale.set(1.04, h, 1.54); };
    if (shoeStyle === 1) { body(0.6); sole(0.34, "#f4efe4", 0.05); const cap = add(new THREE.SphereGeometry(0.12, 14, 10), phys("#f4efe4", { roughness: 0.5 }), x, 0.1, 0.27); cap.scale.set(1.1, 0.7, 0.9); add(new THREE.BoxGeometry(0.16, 0.012, 0.012), phys("#f4efe4"), x, 0.19, 0.12); }
    else if (shoeStyle === 2) { body(0.6); sole(0.34, "#f4efe4", 0.05); add(new THREE.CylinderGeometry(0.15, 0.16, 0.2, 20), phys(sc, { roughness: 0.4, clearcoat: 0.3 }), x, 0.24, 0, g, 0.016); add(new THREE.TorusGeometry(0.152, 0.02, 8, 20), phys("#f4efe4"), x, 0.34, 0).rotation.x = Math.PI / 2; }
    else if (shoeStyle === 3) { body(0.55); sole(0.26, "#2b2118", 0.045); add(new THREE.CylinderGeometry(0.19, 0.2, 0.56, 24), phys(sc, { roughness: 0.5, clearcoat: 0.25 }), x, 0.38, -0.01, g, 0.018); add(new THREE.TorusGeometry(0.19, 0.022, 8, 24), phys(shade(sc, -0.1)), x, 0.66, -0.01).rotation.x = Math.PI / 2; }
    else if (shoeStyle === 4) { body(0.46, 0.14, undefined, 0.88, 1.45); const sl = add(new THREE.CylinderGeometry(0.028, 0.02, 0.12, 10), phys(sc, { roughness: 0.3, clearcoat: 0.5 }), x, 0.06, -0.06); sl.rotation.x = 0.1; }
    else if (shoeStyle === 5) { sole(0.12, sc, 0.04); const ft = add(new THREE.SphereGeometry(0.2, 18, 12), skinM, x, 0.1, 0.1); ft.scale.set(0.85, 0.5, 1.4); for (const z of [0.0, 0.2]) { const st = add(new THREE.TorusGeometry(0.16, 0.018, 8, 20), phys(sc), x, 0.12, z); st.scale.set(1, 0.5, 1); } }
    else if (shoeStyle === 6) { body(0.55, 0.1, phys(sc, { roughness: 0.2, clearcoat: 0.8 })); sole(0.2, "#2b2118"); add(new THREE.BoxGeometry(0.1, 0.03, 0.03), phys("#d9b46a", { metalness: 0.7, roughness: 0.3 }), x, 0.19, 0.14); }
    else if (shoeStyle === 7) { body(0.7, 0.11, phys(sc, { roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(shade(sc, 0.2)) }), 1.08, 1.4); add(new THREE.TorusGeometry(0.14, 0.04, 8, 20), phys(shade(sc, 0.12), { roughness: 0.95 }), x, 0.22, 0.02).rotation.x = Math.PI / 2; }
    else { body(); sole(); }
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
  const wrap = (pts: [number, number][], phi: number, mat: THREE.Material) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28, -phi, phi * 2);
    const m = add(geo, mat, 0, 1.0, 0, g, 0.014);
    m.scale.set(1, 1, 0.76);
    return m;
  };
  // a flared skirt: a lathe from the waist down to the hem (world heights), with a hem trim
  const skirt = (pts: [number, number][], col: string, trim: string, hemY: number, hemR: number) => {
    const m = add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 40), cloth(col), 0, 0, 0, g, 0.016);
    m.scale.set(1, 1, 0.8);
    add(new THREE.TorusGeometry(hemR, 0.028, 8, 44), cloth(trim), 0, hemY, 0).rotation.x = Math.PI / 2;
    (g.children[g.children.length - 1] as THREE.Mesh).scale.set(1, 0.8, 1);
  };
  const shortSleeves = (col: string, cuff: string) => arms.forEach((a, k) => {
    const sx = k === 0 ? -1 : 1;
    add(new THREE.CylinderGeometry(0.15, 0.14, 0.3, 20), cloth(col), sx * 0.012, -0.12, 0, a, 0.016);
    add(new THREE.TorusGeometry(0.143, 0.025, 8, 22), cloth(cuff), sx * 0.025, -0.27, 0, a).rotation.x = Math.PI / 2;
  });
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
  } else if (style === 5) {
    // dress: fitted top, belt and a flared skirt to the knee, bare arms and legs
    shell(cloth(C), 0.02, 0.02);
    add(new THREE.TorusGeometry(0.2, 0.03, 10, 28), cloth(Cd), 0, 2.07, 0.015).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.385, 0.035, 10, 36), cloth(Cd), 0, 1.36, 0).rotation.x = Math.PI / 2;
    (g.children[g.children.length - 1] as THREE.Mesh).scale.set(1, 0.76, 1);
    skirt([[0.37, 1.38], [0.44, 1.2], [0.52, 0.95], [0.6, 0.72], [0.64, 0.56]], C, Cl, 0.56, 0.64);
  } else if (style === 6) {
    // skirt and top: a short-sleeved top over a pleated mini skirt
    shell(cloth(Cl), 0.02, 0.02);
    add(new THREE.TorusGeometry(0.19, 0.032, 10, 28), cloth(shade(Cl, -0.12)), 0, 2.07, 0.015).rotation.x = Math.PI / 2;
    shortSleeves(Cl, shade(Cl, -0.1));
    skirt([[0.4, 1.14], [0.47, 1.0], [0.55, 0.84], [0.6, 0.7]], C, Cd, 0.7, 0.6);
    add(new THREE.TorusGeometry(0.4, 0.03, 8, 36), cloth(Cd), 0, 1.14, 0).rotation.x = Math.PI / 2;
    (g.children[g.children.length - 1] as THREE.Mesh).scale.set(1, 0.76, 1);
  } else if (style === 7) {
    // chunky sweater: turtleneck, ribbed hem and cuffs
    shell(cloth(C), 0.045, 0.02);
    add(new THREE.CylinderGeometry(0.2, 0.225, 0.2, 24, 1, true), cloth(Cl), 0, 2.1, 0, g, 0.012);
    add(new THREE.TorusGeometry(0.385, 0.05, 10, 36), cloth(Cd), 0, 1.02, 0).rotation.x = Math.PI / 2;
    arms.forEach((a, k) => add(new THREE.TorusGeometry(0.112, 0.04, 8, 20), cloth(Cd), (k === 0 ? -1 : 1) * 0.06, -0.72, 0, a).rotation.x = Math.PI / 2);
  } else if (style === 8) {
    // overalls over a white tee: a bib, straps with buttons, a pocket and rolled cuffs
    shell(cloth("#f3efe4"), 0, 0.02);
    shortSleeves("#f3efe4", "#d8d2c4");
    wrap([[0.345, 0], [0.38, 0.1], [0.35, 0.34], [0.366, 0.56]], Math.PI, cloth(C));
    wrap([[0.368, 0.56], [0.41, 0.78], [0.425, 0.94], [0.405, 1.0]], 0.5, cloth(C));
    add(new RoundedBoxGeometry(0.26, 0.17, 0.04, 4, 0.04), cloth(Cd), 0, 1.74, front + 0.07);
    for (const sx of [-1, 1]) {
      const strap = add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), cloth(C), sx * 0.17, 2.0, 0.1);
      strap.rotation.set(0.5, 0, sx * 0.1);
      add(new THREE.SphereGeometry(0.035, 10, 8), phys("#d9b46a", { metalness: 0.6 }), sx * 0.17, 1.9, front + 0.04);
      add(new THREE.TorusGeometry(0.147, 0.03, 8, 22), cloth(shade(C, -0.1)), sx * 0.2, 0.2, 0).rotation.x = Math.PI / 2;
    }
  } else if (style === 9) {
    // tank top: scooped neckline and thin straps, bare arms
    shell(cloth(C), 0.02, 0.02);
    add(new THREE.TorusGeometry(0.2, 0.03, 10, 28), cloth(shade(C, -0.12)), 0, 2.07, 0.015).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.385, 0.03, 10, 36), cloth(shade(C, -0.1)), 0, 1.02, 0).rotation.x = Math.PI / 2;
  } else if (style === 10) {
    // button-up shirt: collar, button placket, chest pocket and buttoned cuffs
    shell(cloth(C), 0.02, 0.02);
    add(new THREE.BoxGeometry(0.05, 0.86, 0.02), cloth(Cd), 0, 1.58, front + 0.03);
    for (const y of [1.95, 1.75, 1.55, 1.35, 1.15]) add(new THREE.SphereGeometry(0.02, 8, 6), phys("#f3efe4"), 0, y, front + 0.045);
    for (const sx of [-1, 1]) { const col = add(new THREE.BoxGeometry(0.15, 0.07, 0.03), cloth(Cl), sx * 0.09, 2.07, front - 0.02, g, 0.01); col.rotation.z = sx * -0.5; }
    add(new RoundedBoxGeometry(0.13, 0.14, 0.03, 3, 0.02), cloth(Cd), -0.17, 1.78, front + 0.03);
    arms.forEach((a, k) => add(new THREE.TorusGeometry(0.112, 0.035, 8, 20), cloth(Cd), (k === 0 ? -1 : 1) * 0.06, -0.72, 0, a).rotation.x = Math.PI / 2);
  } else if (style === 11) {
    // polo: ribbed collar with a short placket and short sleeves
    shell(cloth(C), 0.02, 0.02);
    add(new THREE.TorusGeometry(0.2, 0.04, 10, 28), cloth(Cl), 0, 2.07, 0.015).rotation.x = Math.PI / 2;
    for (const sx of [-1, 1]) { const fl = add(new THREE.BoxGeometry(0.13, 0.07, 0.03), cloth(Cl), sx * 0.09, 2.06, front - 0.02, g, 0.01); fl.rotation.z = sx * -0.45; }
    add(new THREE.BoxGeometry(0.05, 0.28, 0.02), cloth(Cd), 0, 1.92, front + 0.03);
    for (const y of [1.98, 1.88]) add(new THREE.SphereGeometry(0.02, 8, 6), phys("#f3efe4"), 0, y, front + 0.045);
    shortSleeves(C, shade(C, -0.1));
  } else if (style === 13) {
    // cardigan: open knit front over a white tee, button edge, ribbed hem and cuffs
    const gap = 0.3;
    const K = cloth(C), Kd = cloth(Cd);
    shell(K, 0.05, 0.02, gap);
    for (const sx of [-1, 1]) {
      const pts = prof(0.05).map((p) => new THREE.Vector3(p.x * Math.sin(sx * gap), p.y + 1.0, p.x * Math.cos(gap) * 0.76));
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.032, 8), Kd);
    }
    add(new THREE.TorusGeometry(0.19, 0.03, 8, 26), cloth("#d8d2c4"), 0, 2.06, 0.03).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.385, 0.045, 10, 40, Math.PI * 2 - gap * 2), Kd, 0, 1.03, 0).rotation.set(Math.PI / 2, 0, -Math.PI / 2 + gap);
    arms.forEach((a, k) => add(new THREE.TorusGeometry(0.113, 0.04, 8, 22), Kd, (k === 0 ? -1 : 1) * 0.07, -0.75, 0, a).rotation.x = Math.PI / 2);
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

  if (style === 12) {
    const tie = phys("#b5472f", { roughness: 0.6, sheen: 0.5 });
    add(new THREE.SphereGeometry(0.05, 12, 10), tie, 0, 2.0, 0.27).scale.set(1.2, 0.9, 0.8);
    const blade = add(new THREE.BoxGeometry(0.085, 0.5, 0.02), tie, 0, 1.72, 0.285, g, 0.008);
    blade.rotation.x = -0.04;
  }
  if (style === 14) {
    for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.018, 0.96, 0.1), phys("#f3efe4"), sx * 0.355, 0.56, 0);
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
    else if (eyes === 5) { const lens = add(new THREE.SphereGeometry(0.13, 18, 12), phys("#1d1d22", { roughness: 0.15, clearcoat: 1 }), sx * ex, ey, z + 0.03); lens.scale.set(1, 0.68, 0.3); }
    else if (eyes === 6) {
      add(new THREE.SphereGeometry(0.06, 16, 12), inkM, sx * ex, ey, z); glint(sx * ex + 0.02, ey + 0.022, z + 0.05);
      for (const [dx, dy, r] of [[-0.07, 0.07, 0.5], [0, 0.09, 0], [0.07, 0.07, -0.5]]) add(new THREE.CapsuleGeometry(0.008, 0.06, 4, 6), inkM, sx * (ex + dx), ey + dy, z + 0.01).rotation.z = sx * r;
    }
    else if (eyes === 7) { if (sx > 0) add(new THREE.TorusGeometry(0.07, 0.019, 8, 18, Math.PI), inkM, sx * ex, ey - 0.02, z); else { add(new THREE.SphereGeometry(0.056, 16, 12), inkM, sx * ex, ey, z); glint(sx * ex + 0.018, ey + 0.02, z + 0.045); } }
    else if (eyes === 8) {
      const rim = phys("#8a2a4a", { roughness: 0.35, clearcoat: 0.6 });
      add(new THREE.TorusGeometry(0.13, 0.02, 8, 28), rim, sx * ex, ey, z + 0.02);
      const flick = add(new THREE.BoxGeometry(0.13, 0.026, 0.026), rim, sx * (ex + 0.12), ey + 0.1, z + 0.02); flick.rotation.z = sx * -0.5;
      add(new THREE.SphereGeometry(0.036, 10, 8), inkM, sx * ex, ey, z + 0.02); glint(sx * ex + 0.012, ey + 0.015, z + 0.055, 0.012);
    }
    else if (eyes === 9) {
      const lens = add(new THREE.SphereGeometry(0.135, 18, 12), phys("#2a2a30", { roughness: 0.15, clearcoat: 1 }), sx * ex, ey - 0.01, z + 0.03); lens.scale.set(1, 0.86, 0.3);
      add(new THREE.TorusGeometry(0.135, 0.014, 8, 28), phys("#c9a23a", { metalness: 0.8, roughness: 0.3 }), sx * ex, ey - 0.01, z + 0.05).scale.set(1, 0.86, 1);
    }
    else if (eyes === 10) {
      const sh = new THREE.Shape();
      sh.moveTo(0, -0.11); sh.bezierCurveTo(-0.2, 0.02, -0.12, 0.15, 0, 0.07); sh.bezierCurveTo(0.12, 0.15, 0.2, 0.02, 0, -0.11);
      const heart = add(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false, curveSegments: 14 }), phys("#d6246a", { roughness: 0.2, clearcoat: 1 }), sx * ex, ey + 0.01, z + 0.03);
      heart.scale.set(1.05, 1.05, 1);
    }
    else {
      const fr = phys("#2a1f17", { roughness: 0.4 });
      add(new THREE.BoxGeometry(0.25, 0.018, 0.02), fr, sx * ex, ey + 0.09, z + 0.025);
      add(new THREE.BoxGeometry(0.25, 0.018, 0.02), fr, sx * ex, ey - 0.09, z + 0.025);
      for (const dx of [-1, 1]) add(new THREE.BoxGeometry(0.018, 0.18, 0.02), fr, sx * ex + dx * 0.125, ey, z + 0.025);
      add(new THREE.SphereGeometry(0.036, 10, 8), inkM, sx * ex, ey, z + 0.02); glint(sx * ex + 0.012, ey + 0.015, z + 0.055, 0.012);
    }
    if (eyes !== 5 && eyes !== 9 && eyes !== 10) { const brow = add(new THREE.CapsuleGeometry(0.014, 0.1, 4, 8), phys(shade(H, -0.06)), sx * ex, ey + 0.135, surf(sx * ex, ey + 0.135) + 0.008); brow.rotation.z = Math.PI / 2 + sx * 0.14; }
  }
  if (eyes === 4) add(new THREE.BoxGeometry(0.12, 0.016, 0.016), inkM, 0, ey, surf(0, ey) + 0.02);
  if (eyes === 5) add(new THREE.BoxGeometry(0.1, 0.02, 0.03), phys("#1d1d22"), 0, ey, surf(0, ey) + 0.03);
  if (eyes === 8) add(new THREE.BoxGeometry(0.1, 0.02, 0.02), phys("#8a2a4a"), 0, ey, surf(0, ey) + 0.03);
  if (eyes === 9) add(new THREE.BoxGeometry(0.1, 0.02, 0.02), phys("#c9a23a", { metalness: 0.8 }), 0, ey + 0.03, surf(0, ey) + 0.05);
  if (eyes === 10) add(new THREE.BoxGeometry(0.08, 0.02, 0.02), phys("#8a1040"), 0, ey + 0.02, surf(0, ey) + 0.05);
  if (eyes === 11) add(new THREE.BoxGeometry(0.1, 0.018, 0.02), phys("#2a1f17"), 0, ey + 0.02, surf(0, ey) + 0.03);
  add(new THREE.SphereGeometry(0.04, 12, 10), phys(shade(S, -0.07), { roughness: 0.6 }), 0, headY - 0.07, surf(0, headY - 0.07) + 0.025).scale.set(1, 0.9, 0.8);

  // ---- mouth (kept in a list so a big celebration smile can replace it for a moment)
  const my = headY - 0.23, mz = surf(0, my);
  const before = g.children.length;
  if (mouth === 0) { const m = add(new THREE.TorusGeometry(0.11, 0.019, 8, 22, Math.PI), inkM, 0, my + 0.06, mz); m.rotation.z = Math.PI; }
  else if (mouth === 1) { const m = add(new THREE.CircleGeometry(0.13, 24, Math.PI, Math.PI), phys("#ffffff", { roughness: 0.3, side: THREE.DoubleSide }), 0, my + 0.05, mz + 0.005); m.position.z = mz + 0.005; add(new THREE.TorusGeometry(0.13, 0.015, 8, 22, Math.PI), inkM, 0, my + 0.05, mz + 0.007).rotation.z = Math.PI; }
  else if (mouth === 2) add(new THREE.CapsuleGeometry(0.012, 0.13, 4, 8), inkM, 0, my, mz + 0.005).rotation.z = Math.PI / 2;
  else if (mouth === 3) { const m = add(new THREE.SphereGeometry(0.06, 16, 12), phys("#7a2b2b"), 0, my, mz); m.scale.set(1, 1.2, 0.4); }
  else if (mouth === 4) { const m = add(new THREE.TorusGeometry(0.05, 0.017, 8, 16, Math.PI), inkM, 0, my + 0.02, mz); m.rotation.z = Math.PI; }
  else if (mouth === 5) { const m = add(new THREE.TorusGeometry(0.1, 0.017, 8, 16, Math.PI * 0.7), inkM, 0.02, my + 0.05, mz); m.rotation.z = Math.PI * 1.15; }
  else if (mouth === 6) { const lip = phys("#d0405a", { roughness: 0.3, clearcoat: 0.6 }); const m = add(new THREE.TorusGeometry(0.11, 0.032, 8, 22, Math.PI), lip, 0, my + 0.06, mz + 0.004); m.rotation.z = Math.PI; add(new THREE.SphereGeometry(0.045, 10, 8), lip, 0, my + 0.12, mz + 0.005).scale.set(1.5, 0.5, 0.5); }
  else if (mouth === 7) { const m = add(new THREE.SphereGeometry(0.055, 14, 10), phys("#d0405a", { roughness: 0.3, clearcoat: 0.6 }), 0, my, mz + 0.005); m.scale.set(1.3, 0.95, 0.6); }
  else { const m = add(new THREE.TorusGeometry(0.11, 0.019, 8, 22, Math.PI), inkM, 0, my + 0.06, mz); m.rotation.z = Math.PI; add(new THREE.SphereGeometry(0.05, 12, 10), phys("#f08a9a", { roughness: 0.4 }), 0, my - 0.06, mz + 0.012).scale.set(0.9, 1.25, 0.4); }
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

  else if (hs === 10) { cap(); add(new THREE.CapsuleGeometry(0.13, 0.6, 8, 16), hairM, 0, headY - 0.05, -0.74, g, 0.014).rotation.x = 0.3; add(new THREE.TorusGeometry(0.13, 0.035, 8, 18), phys("#c0577a"), 0, headY + 0.3, -0.56).rotation.x = Math.PI / 2 - 0.7; }
  else if (hs === 11) { cap(); for (const sx of [-1, 1]) { add(new THREE.CapsuleGeometry(0.11, 0.5, 8, 16), hairM, sx * 0.62, headY - 0.2, -0.04, g, 0.014).rotation.z = sx * -0.15; add(new THREE.TorusGeometry(0.11, 0.032, 8, 18), phys("#c0577a"), sx * 0.58, headY + 0.1, -0.04).rotation.x = Math.PI / 2; } }
  else if (hs === 12) { cap(0.62, Math.PI * 0.42); const fr = add(new THREE.SphereGeometry(0.3, 18, 12), hairM, 0.16, headY + 0.4, 0.42, g, 0.012); fr.scale.set(1.3, 0.38, 0.65); fr.rotation.z = -0.35; }
  else if (hs === 13) { cap(); for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.2, 20, 16), hairM, sx * 0.4, headY + 0.62, -0.05, g, 0.014); add(new THREE.TorusGeometry(0.15, 0.028, 8, 18), phys("#c0577a"), sx * 0.34, headY + 0.5, -0.05).rotation.set(Math.PI / 2 - 0.5, 0, sx * 0.3); } }
  else if (hs === 14) { cap(0.63, Math.PI * 0.5); add(new THREE.CapsuleGeometry(0.5, 0.85, 10, 24), hairM, 0, headY - 0.55, -0.14, g, 0.018).scale.set(1, 1, 0.55); for (const sx of [-1, 1]) { add(new THREE.CapsuleGeometry(0.1, 0.5, 6, 12), hairM, sx * 0.55, headY - 0.38, 0.02, g, 0.012); for (const [x, y] of [[0.42, -1.0], [0.18, -1.05], [0.3, -0.8]]) add(new THREE.SphereGeometry(0.17, 14, 10), hairM, sx * x, headY + y, -0.12, g, 0.012); } }
  else if (hs === 15) { cap(0.63, Math.PI * 0.5); [0.34, 0.6, 0.84, 1.06].forEach((d, i) => add(new THREE.SphereGeometry(0.13 - i * 0.012, 14, 10), hairM, 0, headY - d, -0.58 + i * 0.01, g, 0.012)); add(new THREE.TorusGeometry(0.07, 0.025, 8, 14), phys("#c0577a"), 0, headY - 1.17, -0.57).rotation.x = Math.PI / 2; }

  else if (hs === 16) { cap(0.6, Math.PI * 0.4); }
  else if (hs === 17) { cap(); const sw = add(new THREE.SphereGeometry(0.3, 18, 12), hairM, -0.16, headY + 0.4, 0.42, g, 0.012); sw.scale.set(1.3, 0.36, 0.62); sw.rotation.z = 0.35; }
  else if (hs === 18) { cap(0.63, Math.PI * 0.48); add(new THREE.SphereGeometry(0.42, 22, 16), hairM, 0, headY + 0.12, -0.3, g, 0.014).scale.set(1, 0.9, 0.85); }
  else if (hs === 19) { cap(); add(new THREE.SphereGeometry(0.18, 20, 16), hairM, 0, headY + 0.66, -0.18, g, 0.014); add(new THREE.TorusGeometry(0.13, 0.028, 8, 18), phys("#3a3a42"), 0, headY + 0.56, -0.16).rotation.x = Math.PI / 2 - 0.3; }
  else if (hs === 20) { for (let i = -4; i <= 4; i++) { const t = i * 0.22; const sp = add(new THREE.SphereGeometry(0.1, 12, 10), hairM, 0, headY + 0.6 * Math.cos(t) + 0.06, 0.6 * Math.sin(t) - 0.03, g, 0.01); sp.scale.set(0.5, 1.9, 0.9); sp.rotation.x = t * 0.6; } }
  else if (hs === 21) { cap(); add(new THREE.SphereGeometry(0.3, 20, 14), hairM, 0, headY + 0.55, 0.2, g, 0.016).scale.set(1.2, 0.8, 1.1); }
  else if (hs === 22) { cap(0.64, Math.PI * 0.52); add(new THREE.TorusGeometry(0.6, 0.06, 10, 40), phys(shade(H, -0.1), { roughness: 0.85 }), 0, headY + 0.2, -0.02).rotation.x = Math.PI / 2 - 0.25; add(new THREE.SphereGeometry(0.1, 14, 10), phys("#e9e4d6", { roughness: 0.9 }), 0, headY + 0.65, -0.1); }
  else if (hs === 23) { add(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 32), phys(H, { roughness: 0.85 }), 0, headY + 0.42, 0, g, 0.016); add(new THREE.CylinderGeometry(0.84, 0.84, 0.04, 40), phys(H, { roughness: 0.85 }), 0, headY + 0.24, 0, g, 0.014); }
  else if (hs === 24) { cap(0.6, Math.PI * 0.3); const sw = add(new THREE.SphereGeometry(0.3, 18, 12), hairM, 0, headY + 0.42, 0.3, g, 0.012); sw.scale.set(1.1, 0.5, 0.8); }

  // ---- extras
  if (extra === 2) {
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
  } else if (extra === 6) {
    for (const sx of [-1, 1]) { add(new THREE.TorusGeometry(0.06, 0.014, 8, 20), phys("#e6b93a", { metalness: 0.8, roughness: 0.25 }), sx * 0.575, headY - 0.17, 0.02); add(new THREE.SphereGeometry(0.03, 10, 8), phys("#e6b93a", { metalness: 0.8, roughness: 0.25 }), sx * 0.575, headY - 0.1, 0.02); }
  } else if (extra === 7) {
    const fl = new THREE.Group();
    fl.position.set(0.34, headY + 0.46, 0.36); fl.rotation.set(-0.5, 0.7, 0);
    for (let a = 0; a < 5; a++) { const pet = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), phys("#f08aa8", { roughness: 0.5 })); pet.position.set(Math.sin((a * 2 * Math.PI) / 5) * 0.1, Math.cos((a * 2 * Math.PI) / 5) * 0.1, 0); pet.scale.set(1, 1, 0.5); fl.add(pet); }
    fl.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), phys("#f2c94c")));
    g.add(fl);
  } else if (extra === 8) {
    const bow = new THREE.Group();
    bow.position.set(0.3, headY + 0.5, 0.3); bow.rotation.set(-0.5, 0.6, 0);
    const bm = phys("#e06a8a", { roughness: 0.5 });
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), bm); w.position.set(sx * 0.12, 0, 0); w.scale.set(1.2, 0.9, 0.45); w.rotation.z = sx * 0.25; bow.add(w); }
    bow.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), phys("#c0405f")));
    g.add(bow);
  } else if (extra === 9) {
    const dark = phys("#3a3a42", { roughness: 0.45 });
    add(new THREE.TorusGeometry(0.62, 0.035, 10, 40, Math.PI), dark, 0, headY - 0.02, -0.02, g, 0.01).scale.set(0.95, 1.05, 1);
    for (const sx of [-1, 1]) { const cup = add(new THREE.CylinderGeometry(0.15, 0.15, 0.11, 24), dark, sx * 0.62, headY - 0.04, 0, g, 0.012); cup.rotation.z = Math.PI / 2; const ring = add(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 20), phys("#8fbf7a", { roughness: 0.4 }), sx * 0.62, headY - 0.04, 0); ring.rotation.z = Math.PI / 2; }
  } else if (extra === 10) {
    const fm = new THREE.MeshBasicMaterial({ color: "#a0623a" });
    for (const sx of [-1, 1]) for (const [dx, dy] of [[0.14, -0.1], [0.2, -0.13], [0.26, -0.09], [0.17, -0.16]]) add(new THREE.SphereGeometry(0.012, 6, 5), fm, sx * dx, headY + dy, surf(sx * dx, headY + dy) + 0.004);
  } else if (extra === 12 || extra === 13) {
    const beardM = phys(H, { roughness: 0.6, transparent: extra === 12, opacity: extra === 12 ? 0.34 : 1 });
    const shell2 = add(new THREE.SphereGeometry(0.595, 36, 20, 0, Math.PI * 2, Math.PI * (extra === 12 ? 0.6 : 0.69), Math.PI * (extra === 12 ? 0.3 : 0.3)), beardM, 0, headY, 0, g, extra === 13 ? 0.012 : 0);
    shell2.scale.set(0.95, 1.06, 0.98);
    if (extra === 13) {
      for (const sx of [-1, 1]) add(new THREE.SphereGeometry(0.1, 12, 10), phys(H, { roughness: 0.6 }), sx * 0.5, headY - 0.1, 0.12).scale.set(0.7, 1.7, 0.8);
      for (const sx of [-1, 1]) { const mu = add(new THREE.CapsuleGeometry(0.028, 0.1, 4, 8), phys(H, { roughness: 0.6 }), sx * 0.06, headY - 0.155, surf(sx * 0.06, headY - 0.155) + 0.03); mu.rotation.z = Math.PI / 2 - sx * 0.25; }
    }
  } else if (extra === 14) {
    for (const sx of [-1, 1]) { const mu = add(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), phys(H, { roughness: 0.6 }), sx * 0.07, headY - 0.155, surf(sx * 0.07, headY - 0.155) + 0.03, g, 0.008); mu.rotation.z = Math.PI / 2 - sx * 0.25; }
  } else if (extra === 15) {
    add(new THREE.SphereGeometry(0.075, 14, 10), phys(H, { roughness: 0.6 }), 0, headY - 0.41, surf(0, headY - 0.41) + 0.02, g, 0.008).scale.set(1, 1.35, 0.6);
    for (const sx of [-1, 1]) { const mu = add(new THREE.CapsuleGeometry(0.024, 0.08, 4, 8), phys(H, { roughness: 0.6 }), sx * 0.055, headY - 0.155, surf(sx * 0.055, headY - 0.155) + 0.03); mu.rotation.z = Math.PI / 2 - sx * 0.25; }
  } else if (extra === 11) {
    for (const sx of [-1, 1]) {
      const ear = add(new THREE.ConeGeometry(0.15, 0.3, 4), hairM, sx * 0.34, headY + 0.6, 0, g, 0.014); ear.rotation.z = sx * -0.35; ear.rotation.y = Math.PI / 4;
      const inner = add(new THREE.ConeGeometry(0.09, 0.22, 4), phys("#f2a0b8"), sx * 0.34, headY + 0.58, 0.04); inner.rotation.z = sx * -0.35; inner.rotation.y = Math.PI / 4;
    }
  }
  return { g, arms, mouths, grin };
}
