// Matcha-themed avatars members can pick from, so nobody has to upload a photo of themselves.
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

export function Avatar({ avatar, name, size = 40 }: { avatar?: string | null; name?: string | null; size?: number }) {
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
