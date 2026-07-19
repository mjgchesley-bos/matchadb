# Deploying MatchaDB to AWS Amplify Hosting

These steps need your own GitHub and AWS console access, so they're written for you to run
rather than something Claude can do on your behalf.

## 1. Push this repo to GitHub

If you don't already have a GitHub repo for this project:

1. Go to github.com → New repository → name it `matchadb` (private is fine) → **do not**
   initialize with a README/gitignore (this repo already has them).
2. Back in this project folder, add the remote and push:

   ```bash
   git remote add origin https://github.com/<your-username>/matchadb.git
   git branch -M main
   git push -u origin main
   ```

## 2. Connect the repo in AWS Amplify

1. AWS Console → search "Amplify" → **AWS Amplify** → "Host your web app" / "New app" → "Host web app".
2. Choose **GitHub** as the source, authorize AWS Amplify to access your GitHub account if prompted.
3. Select the `matchadb` repo and the `main` branch.
4. Amplify auto-detects this as a Next.js app and proposes a build spec — the defaults are fine.
5. Under **Environment variables** (in the app's build settings), add the same three variables
   from `.env.local`:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`
   - `S3_BUCKET`

   (These are only needed if you want Amplify's build step to run `npm run build:db` itself. If
   you commit `data/matcha.db` directly to the repo instead — the simpler, recommended option —
   Amplify doesn't need AWS credentials at all, since it's just serving a static file that's
   already in the repo.)
6. Click **Save and deploy**. Amplify will build and deploy; you'll get a URL like
   `https://main.xxxxxxxxxx.amplifyapp.com` to check it live.

## 3. Custom domain (once you own matchadb.com)

Live app: `https://main.d2f6dk4eu6ukwh.amplifyapp.com`

In the Amplify app → **Domain management** → **Add domain** → enter the **root domain**
(`matchadb.com`, not `www.matchadb.com` — Amplify configures the `www` subdomain separately in
the next step). When Amplify asks about automatically creating a Route 53 hosted zone, **decline
it** — that migrates the domain's nameservers away from the registrar (losing any existing email
DNS records in the process) and adds a small recurring Route 53 cost, for a project that's
otherwise been kept deliberately low-cost. Manually adding the DNS records at the registrar
instead is a few extra clicks, nothing more.

On the subdomain-configuration screen, both `matchadb.com` and `www.matchadb.com` map to the
`main` branch. Check "Setup redirect from https://matchadb.com to https://www.matchadb.com" —
makes `www` canonical, which is Amplify's own default and needs no extra manual redirect rule.
Keep the **Amplify managed certificate** (free, auto-renewing) rather than a custom SSL cert.

Amplify will then show DNS records to add at the registrar:
- A verification `CNAME` (a long hashed hostname → an `*.acm-validations.aws` target) — proves
  domain ownership so Amplify can issue the SSL cert.
- `www` → `CNAME` → the CloudFront distribution domain (e.g. `dXXXXXXXXXXXXX.cloudfront.net`).
- `@` (root) → `ANAME`/`ALIAS` → the same CloudFront distribution domain.

### GoDaddy-specific notes (registrar quirks worth documenting)

- GoDaddy's DNS panel does **not** offer an `ANAME`/`ALIAS` record type (checked available types:
  A, AAAA, CNAME, MX, TXT, SRV, CAA, NS, HTTPS, SVCB, TLSA — no alias-style apex record). A plain
  `A` record won't work for the root domain either, since CloudFront doesn't have a fixed IP.
  **Fallback:** use GoDaddy's separate **Domain Forwarding** feature (Domain Settings →
  Forwarding, not the DNS records table) to forward the bare `matchadb.com` →
  `https://www.matchadb.com` (301/permanent, "Forward Only" — never "masking", which hides the
  real URL and hurts SEO). This achieves the same end result for visitors via a different
  mechanism (a registrar-level HTTP redirect instead of DNS-level aliasing to CloudFront) — root
  domain traffic never actually reaches Amplify, so Amplify's own Domain Management page may keep
  showing the root-domain portion as unverified/pending indefinitely. That's expected and
  harmless; `www.matchadb.com` is what Amplify actually serves with a valid cert, and that's the
  real canonical site.
- New GoDaddy domains ship with a default `CNAME www → matchadb.com.` record already present —
  trying to *add* a new `www` record fails ("record could not be added") until you *edit* that
  existing one instead.
- DNS propagation: GoDaddy quotes "up to 48 hours" but it's typically much faster in practice
  (minutes to a couple hours for CNAME changes to take effect and for Amplify to auto-detect
  verification and issue the cert).

## Updating the live site later

- If the underlying research data changes: run `npm run build:db` locally, commit the updated
  `data/matcha.db`, push to `main`. Amplify redeploys automatically on push.
- If you change the app code: just push to `main` — same auto-redeploy.

## Automated weekly price refresh

`.github/workflows/refresh-prices.yml` runs every Monday (and on manual trigger via the
Actions tab): re-scrapes live pricing from each brand's current product page, rebuilds
`matcha.db`, and commits + pushes only if something actually changed — which then triggers
the usual Amplify auto-redeploy. This is what backs the home page's "not a stale snapshot"
claim; without it that copy would be describing a one-time snapshot, not a live one.

Scope is price-only, not grade/cultivar/region/taste — those change far less often and
aren't claimed to be kept current anywhere on the site, so refreshing them weekly would just
be unnecessary load against ~100 brand sites.

**One-time setup**: add these as repository secrets (Settings → Secrets and variables →
Actions → New repository secret), using the same values already in your local `.env.local`:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`

The workflow needs these to pull the archived research JSON from S3 (same as `build:db`
locally) and won't run correctly until they're set.
