"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { designedFace } from "@/components/Avatar";
import { OUTFIT_COLORS, SHOE_COLORS, parseDesign, parseOutfit, type DesignParts } from "@/lib/avatar-design";

// A full-body, chunky cartoon figure built from the same parts as the round avatar plus an outfit. It spins once all the way round
// when it appears (a front view and a back view on a flipping card) and again whenever it is clicked. Drawn on a 140 x 300 canvas.
const INK = "#2b2118";

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, "0")).join("")}`;
}

function Body({ parts, outfit, back }: { parts: DesignParts; outfit: [number, number, number, number]; back: boolean }) {
  const { S, H, hairBack, hairFront, eyeEl, mouthEl, extraEl } = designedFace(parts);
  const hs = parts[2], extra = parts[6];
  const [style, ci, shoeStyle, shoeCi] = outfit;
  const shoeCol = shoeStyle === 0 && shoeCi === 0 ? (style === 3 ? "#e9e4d6" : "#4a3a2a") : SHOE_COLORS[shoeCi];
  const C = OUTFIT_COLORS[ci], Cd = shade(C, -38), Cl = shade(C, 42);
  const pants = style === 3 || style === 7 || style === 9 ? "#3e5c8a" : style === 4 || style === 1 ? "#3b3f4a" : style === 5 || style === 6 ? S : style === 8 ? C : style === 14 || style === 12 ? Cd : style === 10 || style === 13 ? "#3b3f4a" : style === 11 ? "#3e5c8a" : Cd;
  const shirt = style === 1 || style === 4 || style === 8 || style === 12 || style === 13 ? "#f3efe4" : style === 6 ? Cl : C;
  const s = 2.2;
  const hand = extra === 2;
  // Short sleeves show bare arms; everything else covers them.
  const bareArms = style === 3 || style === 5 || style === 6 || style === 9 || style === 11;
  const armCol = bareArms ? S : style === 1 || style === 8 ? "#f3efe4" : C;
  const head = (
    <g transform={`translate(${70 - 32 * s} -4) scale(${s})`}>
      {back ? (
        <g>
          <rect x="27" y="42" width="10" height="9" rx="3" fill={S} />
          <ellipse cx="32" cy="30" rx="13" ry="15" fill={hs === 0 ? S : H} />
          <ellipse cx="19" cy="31" rx="2.2" ry="3.4" fill={S} /><ellipse cx="45" cy="31" rx="2.2" ry="3.4" fill={S} />
          {hs === 2 || hs === 4 ? <path d="M17 30c0-14 6-21 15-21s15 7 15 21v18H17z" fill={H} /> : null}
          {hs === 3 ? <circle cx="32" cy="9" r="6" fill={H} /> : null}
          {hs === 5 ? <g fill={H}>{[[21, 20], [27, 15], [33, 14], [39, 16], [44, 22], [19, 27], [45, 28], [26, 34], [38, 34], [32, 30]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" />)}</g> : null}
          {hs === 6 ? <g><path d="M18 25c0-9 6-14 14-14s14 5 14 14z" fill={H} /><path d="M16 25h26c3 0 5 1 6 3H16z" fill={H} /></g> : null}
          {hs === 7 ? <g><path d="M10 24h44c-3 3-9 4-22 4s-19-1-22-4z" fill="#d9b46a" /><path d="M32 6l16 19H16z" fill="#e6c47a" /></g> : null}
          {hs === 8 ? <rect x="18" y="22" width="28" height="3.5" rx="1.7" fill="#c0577a" /> : null}
          {hs === 9 ? <ellipse cx="33" cy="17" rx="15" ry="6" fill="#3f7d3a" /> : null}
          {hs >= 10 ? hairBack : null}
        </g>
      ) : (
        <g>
          {hairBack}
          <rect x="27" y="42" width="10" height="9" rx="3" fill={S} />
          <ellipse cx="32" cy="30" rx="13" ry="15" fill={S} />
          <ellipse cx="19" cy="31" rx="2.2" ry="3.4" fill={S} /><ellipse cx="45" cy="31" rx="2.2" ry="3.4" fill={S} />
          {hairFront}
          {eyeEl}
          {mouthEl}
          {extra !== 2 ? extraEl : null}
        </g>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 140 300" className="h-full w-full" role="img" aria-label="Your avatar">
      <ellipse cx="70" cy="290" rx="44" ry="6" fill="#000" opacity="0.12" />
      {/* legs and shoes */}
      <rect x="49" y="188" width="19" height="84" rx="8" fill={pants} />
      <rect x="72" y="188" width="19" height="84" rx="8" fill={pants} />
      {shoeStyle === 3 && <g fill={shoeCol}><rect x="46" y="244" width="22" height="34" rx="6" /><rect x="72" y="244" width="22" height="34" rx="6" /></g>}
      {shoeStyle === 2 && <g fill={shoeCol}><rect x="48" y="258" width="18" height="18" rx="5" /><rect x="74" y="258" width="18" height="18" rx="5" /></g>}
      <ellipse cx="55" cy="277" rx={shoeStyle === 4 ? 12 : 15} ry={shoeStyle === 5 ? 5 : 8} fill={shoeStyle === 5 ? S : shoeCol} />
      <ellipse cx="85" cy="277" rx={shoeStyle === 4 ? 12 : 15} ry={shoeStyle === 5 ? 5 : 8} fill={shoeStyle === 5 ? S : shoeCol} />
      {shoeStyle === 1 || shoeStyle === 2 ? <g fill="#f4efe4"><rect x="40" y="281" width="30" height="4" rx="2" /><rect x="70" y="281" width="30" height="4" rx="2" /></g> : null}
      {shoeStyle === 4 && <g fill={shoeCol}><rect x="45" y="278" width="3" height="10" /><rect x="92" y="278" width="3" height="10" /></g>}
      {/* arms behind torso */}
      <rect x="22" y="108" width="19" height="78" rx="9.5" fill={armCol} transform="rotate(6 31 112)" />
      <rect x="99" y="108" width="19" height="78" rx="9.5" fill={armCol} transform="rotate(-6 109 112)" />
      <circle cx="28" cy="190" r="10" fill={S} />
      <circle cx="112" cy="190" r="10" fill={S} />
      {/* hood goes behind the neck */}
      {style === 2 && <ellipse cx="70" cy="108" rx="34" ry="14" fill={Cd} />}
      {/* torso */}
      <path d="M38 110c8-8 56-8 64 0l4 86H34z" fill={shirt} />
      {style === 0 && !back && (
        <g>
          <path d="M52 108l18 40 18-40" fill="none" stroke={Cd} strokeWidth="5" strokeLinejoin="round" />
          <path d="M34 168h72v16H34z" fill={Cd} />
          <rect x="62" y="166" width="16" height="20" rx="3" fill={shade(C, -60)} />
        </g>
      )}
      {style === 0 && back && <g><path d="M34 168h72v16H34z" fill={Cd} /><path d="M62 172l-12 22 12-6 8 10 8-10 12 6-12-22z" fill={shade(C, -60)} /></g>}
      {style === 1 && !back && (
        <g>
          <path d="M50 124h40l6 72H44z" fill={C} />
          <path d="M50 124l-6-14M90 124l6-14" stroke={Cd} strokeWidth="4" strokeLinecap="round" />
          <rect x="56" y="162" width="28" height="18" rx="3" fill={Cd} opacity="0.55" />
        </g>
      )}
      {style === 1 && back && <path d="M36 150h68" stroke={C} strokeWidth="5" />}
      {style === 2 && (
        <g>
          {!back && <path d="M58 108c2 16 6 26 12 30 6-4 10-14 12-30" fill="none" stroke={Cl} strokeWidth="2.5" strokeLinecap="round" />}
          {!back && <rect x="50" y="164" width="40" height="22" rx="8" fill={Cd} opacity="0.5" />}
          {back && <path d="M44 112c10 10 42 10 52 0l-4 22c-12 6-32 6-44 0z" fill={Cd} />}
        </g>
      )}
      {style === 4 && !back && (
        <g>
          <path d="M38 110l22 6v80H34z" fill={C} />
          <path d="M102 110l-22 6v80h26z" fill={C} />
          <path d="M70 118v78" stroke={Cd} strokeWidth="2.5" />
        </g>
      )}
      {style === 4 && back && <path d="M38 110c8-8 56-8 64 0l4 86H34z" fill={C} />}
      {style === 5 && <g><path d="M34 190l-10 50h92l-10-50z" fill={C} /><path d="M34 168h72v14H34z" fill={Cd} /><path d="M24 240h92" stroke={Cl} strokeWidth="3" /></g>}
      {style === 6 && <g><path d="M36 176h68l12 56H24z" fill={C} /><path d="M36 176h68v8H36z" fill={Cd} /></g>}
      {style === 7 && <g><rect x="58" y="104" width="24" height="10" rx="5" fill={Cl} /><path d="M34 188h72v8H34z" fill={Cd} /></g>}
      {style === 8 && (
        <g>
          <path d="M44 128h52l8 68H36z" fill={C} />
          <path d="M50 128l-4-20M90 128l4-20" stroke={C} strokeWidth="6" strokeLinecap="round" />
          {!back && <rect x="58" y="150" width="24" height="16" rx="3" fill={Cd} opacity="0.6" />}
        </g>
      )}
      {style === 10 && !back && <g><path d="M54 108l16 18 16-18" fill="none" stroke={Cl} strokeWidth="5" strokeLinejoin="round" />{[134, 154, 174].map((y) => <circle key={y} cx="70" cy={y} r="2.2" fill={Cd} />)}<rect x="46" y="136" width="16" height="14" rx="2" fill={Cd} opacity="0.5" /></g>}
      {style === 11 && !back && <g><path d="M54 108l16 14 16-14" fill="none" stroke={Cl} strokeWidth="5" strokeLinejoin="round" /><path d="M70 120v26" stroke={Cd} strokeWidth="3" />{[128, 138].map((y) => <circle key={y} cx="70" cy={y} r="2" fill={Cl} />)}</g>}
      {style === 12 && !back && <g><path d="M38 110l22 6v80H34z" fill={C} /><path d="M102 110l-22 6v80h26z" fill={C} /><path d="M66 116h8l2 6-6 4-6-4z" fill={Cl} /><path d="M67 124h6l3 46-6 8-6-8z" fill={Cl} /></g>}
      {style === 12 && back && <path d="M38 110c8-8 56-8 64 0l4 86H34z" fill={C} />}
      {style === 13 && !back && <g><path d="M38 110l24 8v78H34z" fill={C} /><path d="M102 110l-24 8v78h28z" fill={C} />{[140, 158, 176].map((y) => <circle key={y} cx="62" cy={y} r="2" fill={Cd} />)}</g>}
      {style === 13 && back && <path d="M38 110c8-8 56-8 64 0l4 86H34z" fill={C} />}
      {style === 14 && <g><path d="M70 112v84" stroke={Cl} strokeWidth="3" />{!back && <path d="M44 114v82M96 114v82" stroke="#f3efe4" strokeWidth="3" />}</g>}
      {style === 3 && !back && <path d="M58 109c3 8 21 8 24 0" fill="none" stroke={shade(C, -45)} strokeWidth="4" strokeLinecap="round" />}
      {/* held item in the right hand */}
      {hand && !back && <g><rect x="108" y="150" width="7" height="22" rx="3.5" fill="#8a6a3a" /><path d="M108 172c-6 2-8 8-8 16h24c0-8-2-14-9-16z" fill="#c9a86a" /></g>}
      <circle cx="28" cy="190" r="10" fill={S} />
      <circle cx="112" cy="190" r="10" fill={S} />
      {head}
    </svg>
  );
}

function FigureSvg({ code, height = 280 }: { code: string | null; height?: number }) {
  const [round, setRound] = useState(0);
  const parts = parseDesign(code);
  if (!parts) return null;
  const outfit = parseOutfit(code);
  const w = Math.round((height * 140) / 300);
  return (
    <div className="shrink-0">
      <style>{`
        @keyframes av-spin { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
        .av-card { transform-style: preserve-3d; animation: av-spin 2.4s cubic-bezier(.45,.05,.2,1) 1; }
        .av-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .av-back { transform: rotateY(180deg); }
        @media (prefers-reduced-motion: reduce) { .av-card { animation: none; } }
      `}</style>
      <button type="button" onClick={() => setRound((r) => r + 1)} title="Click to spin" aria-label="Spin your avatar" className="block cursor-pointer" style={{ perspective: 900, width: w, height }}>
        <div key={round} className="av-card relative h-full w-full">
          <div className="av-face"><Body parts={parts} outfit={outfit} back={false} /></div>
          <div className="av-face av-back"><Body parts={parts} outfit={outfit} back /></div>
        </div>
      </button>
    </div>
  );
}

// The real 3D figure (drag to turn, spins on arrival), loaded only when needed. Browsers without WebGL get the flat figure instead.
const Avatar3D = dynamic(() => import("@/components/Avatar3D"), { ssr: false, loading: () => null });

export function AvatarFigure({ code, height = 280 }: { code: string | null; height?: number }) {
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  if (!code || !parseDesign(code)) return null;
  if (failed) return <FigureSvg code={code} height={height} />;
  return (
    <div className="shrink-0" style={{ width: Math.round(height * 0.6), height }}>
      <Avatar3D code={code} height={height} onFail={onFail} />
    </div>
  );
}
