import { cafeMediaUrl, type OwnerMenuFile, type OwnerPage, type OwnerPhoto } from "@/lib/cafe-owner-page";

// The café page sections the verified owner controls: about, what they offer, photo gallery and menu files. Plain server markup (no scripts).
const box = "rounded-sm border-2 border-line bg-paper-raised p-5 sm:p-6";
const h2 = "font-mono text-xs uppercase tracking-[0.2em] text-forest";

export function OwnerCafeSections({ name, page, photos, files }: { name: string; page: OwnerPage; photos: OwnerPhoto[]; files: OwnerMenuFile[] }) {
  const hasAbout = page.bio || page.matcha_info || page.amenities.length > 0;
  return (
    <>
      {hasAbout && (
        <section aria-labelledby="own-about" className={`mt-8 ${box}`}>
          <h2 id="own-about" className={h2}>About {name}</h2>
          {page.bio && <p className="mt-3 max-w-prose whitespace-pre-line leading-relaxed text-ink">{page.bio}</p>}
          {page.matcha_info && <p className="mt-3 max-w-prose text-sm text-ink-muted"><strong className="font-semibold text-ink">Our matcha:</strong> {page.matcha_info}</p>}
          {page.amenities.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {page.amenities.map((a) => <li key={a} className="rounded-full border border-matcha bg-matcha-soft px-3 py-1 text-sm text-forest">{a}</li>)}
            </ul>
          )}
        </section>
      )}

      {photos.length > 0 && (
        <section aria-labelledby="own-photos" className={`mt-6 ${box}`}>
          <h2 id="own-photos" className={h2}>Photos</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id}>
                <a href={cafeMediaUrl(p.path)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-sm border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner photo from storage */}
                  <img src={cafeMediaUrl(p.path)} alt={p.caption ?? `${name}`} loading="lazy" className="aspect-[4/3] w-full object-cover transition-opacity hover:opacity-90" />
                </a>
                {p.caption && <p className="mt-1 text-xs text-ink-muted">{p.caption}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {files.length > 0 && (
        <section aria-labelledby="own-menu" className={`mt-6 ${box}`}>
          <h2 id="own-menu" className={h2}>Menu</h2>
          <ul className="mt-3 flex flex-col gap-4">
            {files.map((f) => (
              <li key={f.id}>
                {f.kind === "image" ? (
                  <figure>
                    <a href={cafeMediaUrl(f.path)} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- owner menu picture */}
                      <img src={cafeMediaUrl(f.path)} alt={`${f.label} at ${name}`} loading="lazy" className="max-h-[32rem] w-auto max-w-full rounded-sm border border-line" />
                    </a>
                    <figcaption className="mt-1 text-sm text-ink-muted">{f.label}</figcaption>
                  </figure>
                ) : (
                  <a href={cafeMediaUrl(f.path)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-matcha px-5 py-2 text-sm font-medium text-matcha hover:bg-matcha-soft">
                    {f.label} (PDF)
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
