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

In the Amplify app → **Domain management** → **Add domain** → enter `matchadb.com` → follow the
DNS verification steps shown (Amplify will give you CNAME/A records to add wherever the domain is
registered).

## Updating the live site later

- If the underlying research data changes: run `npm run build:db` locally, commit the updated
  `data/matcha.db`, push to `main`. Amplify redeploys automatically on push.
- If you change the app code: just push to `main` — same auto-redeploy.
