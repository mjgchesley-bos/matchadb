// source_url is a research field, not a guaranteed-clean URL -- a handful of
// entries have trailing annotation text appended by the research process
// (e.g. "https://amazon.com/... (Amazon listing found via search; direct
// fetch not completed due to dynamic-content/access limitations)"). Used
// raw as an href, that trailing text breaks the link. Extracts just the
// leading URL and labels it "View product on Amazon" when the host actually
// is Amazon -- checked against the data first: only 7 of 728 products have
// an Amazon URL as their actual source_url; the ~30 that merely mention
// "also sold on Amazon" in disclosed text have no captured link, so they
// fall back to the brand-site label instead of a fabricated Amazon link.
export type ExternalLinkInfo = {
  url: string;
  hostname: string;
  label: string;
};

export function getExternalLinkInfo(sourceUrl: string | null): ExternalLinkInfo | null {
  if (!sourceUrl) return null;
  const match = sourceUrl.match(/^(https?:\/\/\S+)/);
  const url = match ? match[1] : sourceUrl;
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const label = hostname.includes("amazon.") ? "View product on Amazon" : "View product";
  return { url, hostname, label };
}
