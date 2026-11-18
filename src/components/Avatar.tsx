// Matcha-themed avatars members can pick from, so nobody has to upload a photo of themselves (a
// photo is optional and takes priority when set).
import { DESIGN_BG, DESIGN_HAIR, DESIGN_SKIN, parseDesign, type DesignParts } from "@/lib/avatar-design";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gropvtwigbddfikcujhz.supabase.co";
export const avatarPhotoUrl = (path: string): string => `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;

export const AVATARS = ["cup", "whisk", "leaf", "tin", "kettle", "sprout", "bowl", "spoon", "bamboo", "blossom", "mountain", "teapot"] as const;
export type AvatarKey = (typeof AVATARS)[number];
export const AVATAR_LABELS: Record<AvatarKey, string> = {
  cup: "Matcha cup",
  whisk: "Whisk",
  leaf: "Leaf",
  tin: "Tea tin",
  kettle: "Kettle",
  sprout: "Sprout",
  bowl: "Bowl",
  spoon: "Scoop",
  bamboo: "Bamboo",
  blossom: "Blossom",
  mountain: "Mountain",
  teapot: "Teapot",
};

const PALETTE: Record<AvatarKey, { bg: string; fg: string }> = {
  cup: { bg: "#e8f2dc", fg: "#3f7d3a" },
  whisk: { bg: "#f3ead9", fg: "#8a6a3a" },
  leaf: { bg: "#dff0d6", fg: "#2f7a3b" },
  tin: { bg: "#e6e9f2", fg: "#4b5a8a" },
  kettle: { bg: "#f2e1d9", fg: "#8a4b3a" },
  sprout: { bg: "#e4f3e0", fg: "#4a9a4a" },
  bowl: { bg: "#efe4f2", fg: "#7a4a8a" },
  spoon: { bg: "#f5efd9", fg: "#9a7a2a" },
  bamboo: { bg: "#dcefe6", fg: "#2f7a5a" },
  blossom: { bg: "#fbe4ec", fg: "#c0577a" },
  mountain: { bg: "#e2ecf6", fg: "#3a6a9a" },
  teapot: { bg: "#f6e6d6", fg: "#a0602a" },
};

function Glyph({ k, fg, bg }: { k: AvatarKey; fg: string; bg: string }) {
  switch (k) {
    case "cup":
      return (
        <>
          <path d="M8 3.5c-1 1.2 1 2 0 3M12 2.8c-1 1.2 1 2 0 3M16 3.5c-1 1.2 1 2 0 3" fill="none" stroke={fg} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M3.5 10h17c0 5-3.5 8.5-8.5 8.5S3.5 15 3.5 10z" fill={fg} />
          <rect x="9" y="18" width="6" height="2.2" rx="1" fill={fg} />
        </>
      );
    case "whisk":
      return (
        <>
          <rect x="10" y="3" width="4" height="8" rx="1.8" fill={fg} />
          <path d="M10 11c-3.5 1-5.5 4-5.5 9h15c0-5-2-8-5.5-9z" fill={fg} />
          <path d="M9 14.5v5M12 13v6.5M15 14.5v5" stroke={bg} strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case "leaf":
      return (
        <>
          <path d="M4.5 19.5C4.5 10.5 10 5 20 4c0 10-5.5 15.5-15.5 15.5z" fill={fg} />
          <path d="M6.5 17.5l9-9" stroke={bg} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case "tin":
      return (
        <>
          <rect x="6" y="6" width="12" height="14" rx="2" fill={fg} />
          <rect x="5" y="3.5" width="14" height="3.5" rx="1.2" fill={fg} />
          <rect x="8" y="10" width="8" height="6" rx="1" fill={bg} />
        </>
      );
    case "kettle":
      return (
        <>
          <path d="M5.5 20h12v-6c0-3-2.5-5-6-5s-6 2-6 5z" fill={fg} />
          <path d="M17.5 14l3.5-3.5" stroke={fg} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 8.5c0-3.5 7-3.5 7 0" fill="none" stroke={fg} strokeWidth="1.6" />
          <circle cx="11.5" cy="7" r="1.3" fill={fg} />
        </>
      );
    case "sprout":
      return (
        <>
          <path d="M12 21v-9" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 14C6.5 14 4.5 10.5 4.5 7c4.5 0 7.5 2.5 7.5 7z" fill={fg} />
          <path d="M12 11.5c0-4.5 3-7 7.5-7 0 4.5-3 7.5-7.5 7z" fill={fg} />
        </>
      );
    case "bowl":
      return (
        <>
          <path d="M2.5 9.5h19c-.5 6.5-4.5 9.5-9.5 9.5S3 16 2.5 9.5z" fill={fg} />
          <path d="M3.5 12.5h17" stroke={bg} strokeWidth="1" />
          <rect x="8.5" y="18.5" width="7" height="2.3" rx="1" fill={fg} />
        </>
      );
    case "spoon":
      return (
        <>
          <path d="M4.5 20.5L15 8.5" stroke={fg} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="17" cy="6.5" rx="4" ry="2" transform="rotate(-50 17 6.5)" fill={fg} />
        </>
      );
    case "bamboo":
      return (
        <>
          <rect x="9" y="2" width="3.4" height="20" rx="1.2" fill={fg} />
          <path d="M9 7.5h3.4M9 13h3.4M9 18.5h3.4" stroke={bg} strokeWidth="1" />
          <path d="M12.4 8c3-.2 5-1.5 6.5-3.5-3 0-5.5 1-6.5 3.5zM9 13.5c-3-.2-5-1.5-6.5-3.5 3 0 5.5 1 6.5 3.5z" fill={fg} />
        </>
      );
    case "blossom":
      return (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={12 + 4.8 * Math.sin((a * Math.PI) / 180)} cy={12 - 4.8 * Math.cos((a * Math.PI) / 180)} r="3.6" fill={fg} />
          ))}
          <circle cx="12" cy="12" r="2" fill={bg} />
        </>
      );
    case "mountain":
      return (
        <>
          <circle cx="18" cy="6" r="2.2" fill={fg} opacity="0.55" />
          <path d="M2 20.5L9.5 8l3.2 4.5L15.5 7 22 20.5z" fill={fg} />
          <path d="M9.5 8l-2.2 3.7 2-1 1.6 1.4z" fill={bg} />
        </>
      );
    case "teapot":
      return (
        <>
          <path d="M5 19.5h11.5c1.2-4 .2-8.5-3-9.5h-5C5 11 3.8 15.5 5 19.5z" fill={fg} />
          <path d="M16.5 13c3 .2 3.5-3 5.5-4" stroke={fg} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M5.5 12c-3.2-1-3.2 4.2-.8 5" stroke={fg} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <circle cx="11" cy="8.6" r="1.2" fill={fg} />
        </>
      );
  }
}

// The pieces of a designed face, drawn on a 64 x 64 canvas. The round avatar and the full-body figure both use them.
export function designedFace(parts: DesignParts) {
  const [bg, skin, hs, hc, eyes, mouth, extra] = parts;
  const B = DESIGN_BG[bg], S = DESIGN_SKIN[skin], H = DESIGN_HAIR[hc], ink = "#2b2118";
  const hairBack =
    hs === 2 ? <path d="M17 30c0-14 6-21 15-21s15 7 15 21v18H17z" fill={H} /> :
    hs === 4 ? <path d="M17 28c0-12 6-19 15-19s15 7 15 19v8H17z" fill={H} /> :
    hs === 3 ? <circle cx="32" cy="9" r="6" fill={H} /> : null;
  const hairFront =
    hs === 1 ? <path d="M19 27c0-9 5-15 13-15s13 6 13 15c-3-5-8-7-13-7s-10 2-13 7z" fill={H} /> :
    hs === 2 || hs === 4 ? <path d="M19 27c0-9 5-14 13-14s13 5 13 14c-4-4-8-6-13-6s-9 2-13 6z" fill={H} /> :
    hs === 3 ? <path d="M19 27c0-9 5-14 13-14s13 5 13 14c-4-4-8-6-13-6s-9 2-13 6z" fill={H} /> :
    hs === 5 ? <g fill={H}>{[[21, 20], [27, 15], [33, 14], [39, 16], [44, 22], [19, 27], [45, 28]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5.5" />)}</g> :
    hs === 6 ? <g><path d="M18 25c0-9 6-14 14-14s14 5 14 14z" fill={H} /><path d="M16 25h26c3 0 5 1 6 3H16z" fill={H} /></g> :
    hs === 7 ? <g><path d="M10 24h44c-3 3-9 4-22 4s-19-1-22-4z" fill="#d9b46a" /><path d="M32 6l16 19H16z" fill="#e6c47a" /><path d="M24 17l-3 7M32 12v12M40 17l3 7" stroke="#b8923f" strokeWidth="1" /></g> :
    hs === 8 ? <g><path d="M18 26c0-9 6-14 14-14s14 5 14 14c-5-3-9-4-14-4s-9 1-14 4z" fill={H} /><rect x="18" y="22" width="28" height="3.5" rx="1.7" fill="#c0577a" /></g> :
    hs === 9 ? <g><ellipse cx="33" cy="17" rx="15" ry="6" fill="#3f7d3a" /><circle cx="33" cy="10.5" r="1.6" fill="#3f7d3a" /></g> : null;
  const eyeEl =
    eyes === 0 ? <g fill={ink}><circle cx="26" cy="30" r="1.8" /><circle cx="38" cy="30" r="1.8" /></g> :
    eyes === 1 ? <g fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round"><path d="M23.5 31c1-3 4-3 5 0M35.5 31c1-3 4-3 5 0" /></g> :
    eyes === 2 ? <g><circle cx="26" cy="30" r="3" fill="#fff" /><circle cx="38" cy="30" r="3" fill="#fff" /><circle cx="26" cy="30" r="1.5" fill={ink} /><circle cx="38" cy="30" r="1.5" fill={ink} /></g> :
    eyes === 3 ? <g stroke={ink} strokeWidth="1.8" strokeLinecap="round"><path d="M23.5 30h5M35.5 30h5" /></g> :
    eyes === 4 ? <g fill="none" stroke={ink} strokeWidth="1.5"><circle cx="26" cy="30" r="4" /><circle cx="38" cy="30" r="4" /><path d="M30 30h4" /><circle cx="26" cy="30" r="1" fill={ink} /><circle cx="38" cy="30" r="1" fill={ink} /></g> :
    <g><rect x="21.5" y="27" width="10" height="6" rx="2.5" fill={ink} /><rect x="32.5" y="27" width="10" height="6" rx="2.5" fill={ink} /><path d="M31.5 29h1" stroke={ink} strokeWidth="1.4" /></g>;
  const mouthEl =
    mouth === 0 ? <path d="M27 38c2 3 8 3 10 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /> :
    mouth === 1 ? <path d="M26 37h12c0 5-3 7-6 7s-6-2-6-7z" fill="#fff" stroke={ink} strokeWidth="1.4" strokeLinejoin="round" /> :
    mouth === 2 ? <path d="M28 39h8" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /> :
    mouth === 3 ? <ellipse cx="32" cy="39" rx="3" ry="3.6" fill="#7a2b2b" /> :
    mouth === 4 ? <path d="M29.5 38.5c1.5 1.5 3.5 1.5 5 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" /> :
    <path d="M28 39c3 1 6 0 8-3" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />;
  const extraEl =
    extra === 1 ? <g><path d="M44 50h14c0 6-3 9-7 9s-7-3-7-9z" fill="#3f7d3a" /><path d="M46 49c-1-2 1-3 0-5M51 49c-1-2 1-3 0-5" stroke="#3f7d3a" strokeWidth="1.2" fill="none" strokeLinecap="round" /></g> :
    extra === 2 ? <g><rect x="47" y="42" width="4" height="9" rx="1.8" fill="#8a6a3a" /><path d="M47 51c-3 1-4 4-4 8h12c0-4-1-7-4-8z" fill="#c9a86a" /></g> :
    extra === 3 ? <path d="M46 28c-1-6 3-9 8-9 0 6-3 9-8 9z" fill="#4a9a4a" /> :
    extra === 4 ? <g fill="#f08a9a" opacity="0.55"><ellipse cx="22.5" cy="36" rx="3" ry="2" /><ellipse cx="41.5" cy="36" rx="3" ry="2" /></g> :
    extra === 5 ? <g fill="#e6b93a"><path d="M10 16l1.2 3 3 1.2-3 1.2L10 24.4l-1.2-3-3-1.2 3-1.2z" /><path d="M54 10l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z" /></g> : null;
  return { B, S, H, hairBack, hairFront, eyeEl, mouthEl, extraEl };
}

function Designed({ parts, size }: { parts: DesignParts; size: number }) {
  const { B, S, hairBack, hairFront, eyeEl, mouthEl, extraEl } = designedFace(parts);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Avatar" className="shrink-0">
      <defs><clipPath id={`av-${parts.join("")}`}><circle cx="32" cy="32" r="32" /></clipPath></defs>
      <g clipPath={`url(#av-${parts.join("")})`}>
        <rect width="64" height="64" fill={B} />
        {hairBack}
        <path d="M10 64c0-10 9-15 22-15s22 5 22 15z" fill="#3f7d3a" opacity="0.85" />
        <rect x="27" y="42" width="10" height="9" rx="3" fill={S} />
        <ellipse cx="32" cy="30" rx="13" ry="15" fill={S} />
        <ellipse cx="19" cy="31" rx="2.2" ry="3.4" fill={S} /><ellipse cx="45" cy="31" rx="2.2" ry="3.4" fill={S} />
        {hairFront}
        {eyeEl}
        {mouthEl}
        {extraEl}
      </g>
    </svg>
  );
}

export function Avatar({ avatar, name, size = 40, photoPath }: { avatar?: string | null; name?: string | null; size?: number; photoPath?: string | null }) {
  if (photoPath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- member photo from storage, already cropped and shrunk
      <img src={avatarPhotoUrl(photoPath)} alt={name ? `${name}'s photo` : "Profile photo"} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  const designed = parseDesign(avatar);
  if (designed) return <Designed parts={designed} size={size} />;
  const k = (AVATARS as readonly string[]).includes(avatar ?? "") ? (avatar as AvatarKey) : null;
  if (!k) {
    // No icon chosen: the first letter of the username.
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-matcha-soft font-semibold text-forest"
        style={{ width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        {(name ?? "?").trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  const { bg, fg } = PALETTE[k];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={AVATAR_LABELS[k]} className="shrink-0">
      <circle cx="12" cy="12" r="12" fill={bg} />
      <g transform="translate(3 3) scale(0.75)">
        <Glyph k={k} fg={fg} bg={bg} />
      </g>
    </svg>
  );
}
