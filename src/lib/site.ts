// The canonical origin for all absolute URLs (sitemap, robots, canonical
// links, JSON-LD, OG tags). The bare apex domain has a known DNS gap on
// deep links (see project memory), so www is the one guaranteed to resolve
// everywhere -- every generated absolute URL should point here.
export const SITE_URL = "https://www.matchadb.com";
export const SITE_NAME = "MatchaDB";
// Public contact address shown on /contact and /privacy. Set
// NEXT_PUBLIC_CONTACT_EMAIL in Amplify's environment variables; no address
// is hardcoded because publishing one is the site owner's call.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
