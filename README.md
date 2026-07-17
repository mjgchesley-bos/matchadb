# MatchaDB

A research database and comparison tool for matcha products. Phase 1: a full browsable/filterable
catalog of every product and brand collected during research. Later phases (not yet built): a
guided matching questionnaire and a sourcing/selling location map.

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind CSS
- **SQLite** (via `sql.js`, pure WebAssembly — no native build step required) as the data layer.
  The catalog is read-only from the app's perspective; it's rebuilt from the research data
  whenever that data changes, not written to live by users.
- **AWS Amplify Hosting** for deployment (chosen for cost: free-tier friendly, no always-on server
  or managed database to pay for)

## Data pipeline

The research dataset lives in S3 (`matcha-product-database` bucket) as JSON produced by an earlier
research project. To (re)build the local SQLite file from that source data:

```bash
npm run build:db
```

This requires AWS credentials in `.env.local` (see `.env.local.example`) with read access to the
`matcha-product-database` S3 bucket. It rebuilds `data/matcha.db` from scratch — safe to re-run
any time the underlying research data is updated.

## Development

```bash
npm install
npm run build:db   # only needed once, or whenever S3 data changes
npm run dev
```

Visit `http://localhost:3000`.

## Deployment

See `docs/DEPLOYMENT.md` for step-by-step AWS Amplify Hosting setup instructions.

## Re-scraping / data hygiene

See `docs/SCRAPING_NOTES.md` before re-running the live-price or live-attribute scrapers —
it documents the pipeline architecture, the curated override-file system, and every
brand-specific quirk (currency switchers, stale URLs, pack-multiplier labels, etc.) discovered so
far, so they don't need rediscovering on the next pass.
