// Icon links for a place's own social profiles. Only the ones we have are shown.
const PATHS: Record<string, { label: string; d: string }> = {
  instagram: { label: "Instagram", d: "M12 2.2c3.2 0 3.6 0 4.8.1 3.2.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 4 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z" },
  x: { label: "X", d: "M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9zm-1.3 19.4h2L6.5 3.3H4.3l13.3 17.3z" },
  youtube: { label: "YouTube", d: "M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" },
  facebook: { label: "Facebook", d: "M24 12a12 12 0 10-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0024 12z" },
  tiktok: { label: "TikTok", d: "M19.6 6.8a5 5 0 01-3.1-1.1A5 5 0 0115 2.3h-3.4v13.4a2.9 2.9 0 11-2.9-2.9c.3 0 .6 0 .8.1V9.4a6.3 6.3 0 00-.8-.1 6.3 6.3 0 106.3 6.3V9a8.4 8.4 0 004.9 1.6V7.2c-.1 0-.2-.1-.3-.1z" },
};
export const SOCIAL_ORDER = ["instagram", "x", "youtube", "facebook", "tiktok"] as const;

export function SocialIcons({ links }: { links: Partial<Record<string, string>> }) {
  const shown = SOCIAL_ORDER.filter((k) => links[k]);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Social profiles">
      {shown.map((k) => (
        <li key={k}>
          <a href={links[k]} target="_blank" rel="noopener noreferrer nofollow" aria-label={PATHS[k].label} title={PATHS[k].label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-paper text-ink transition-colors hover:border-matcha hover:bg-matcha-soft hover:text-forest">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d={PATHS[k].d} /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
