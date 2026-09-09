# Deploying to Railway

## What went wrong the first time

Railway's agent looked at `pnpm-workspace.yaml`, found 7 packages, and created
7 services — one per package. All 7 failed. Two separate reasons:

1. **Four of them are not deployable.** `@workspace/api-zod`, `@workspace/db`,
   `@workspace/api-spec` and `@workspace/api-client-react` are internal source
   libraries. They have no build step and no server to start. No configuration
   can make them deploy, because there is nothing to deploy.

2. **The three real apps had genuine build failures**, which Replit never
   surfaced because Replit built each artifact individually and skipped the
   repo-wide typecheck:
   - Both Vite configs threw `PORT environment variable is required` at config
     load time. Replit injected `PORT` and `BASE_PATH` into every process;
     Railway does not, and `vite build` has no port at all. This alone failed
     every frontend build.
   - `lib/api-zod/src/index.ts` re-exported `LoginResponse` from two modules
     (TS2308), which failed the repo typecheck.
   - Three TanStack Query call sites were missing the required `queryKey`.

`@workspace/mockup-sandbox` is a development-only design sandbox. Its Replit
config has no production block at all — do not deploy it.

## The shape we deploy now

**One service, not seven.**

The API server serves both the API and the built frontend from a single origin:

```
https://<your-app>.up.railway.app/          → React app (hiring-manager)
https://<your-app>.up.railway.app/api/...   → Express API
```

This is what Replit's app router did. Keeping one origin means the generated
API client's relative `/api/...` URLs keep working and the login cookie needs
no cross-site configuration. It is also one service's worth of cost instead of
seven.

The repo now carries the config for this: `Dockerfile` (build) and
`railway.json` (healthcheck at `/api/healthz`, one replica).

---

## Step 1 — Delete the six broken services

Railway keeps trying to build services that can never work, so remove them.

1. Open your project at `railway.com`.
2. You will see 7 boxes, each with a red **Build failed** message.
3. Click the box named **@workspace/api-zod**.
4. Click the **Settings** tab (top of the panel that slides open).
5. Scroll to the very bottom. You will see a red **Delete Service** button.
6. Click it and confirm.
7. Repeat for these five:
   - `@workspace/db`
   - `@workspace/api-spec`
   - `@workspace/api-client-react`
   - `@workspace/mockup-sandbox`
   - `@workspace/hiring-manager`

**What you'll see when you're done:** one box left, `@workspace/api-server`.

Keep the api-server service. It is the one that now serves everything.

## Step 2 — Add a Postgres database

Skip this step if you are pointing at the database you already used on Replit.

1. Click **+ Add** (top right of the canvas).
2. Choose **Database**, then **Add PostgreSQL**.

**What you'll see:** a new box named **Postgres** appears next to your service.

## Step 3 — Point the service at the repo root

1. Click the **@workspace/api-server** box.
2. Click **Settings**.
3. Find **Build**. If **Root Directory** has anything in it (for example
   `artifacts/api-server`), clear it so it is empty.
4. Under **Builder**, confirm it says **Dockerfile**.

**Why:** a pnpm workspace only installs from the repo root. Pointing the build
at a subfolder is why the api-server build failed after 54 seconds — it could
not resolve the `workspace:*` dependencies.

## Step 4 — Set the environment variables

1. Still in the **@workspace/api-server** box, click the **Variables** tab.
2. Click **+ New Variable** and add each of these:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — type it exactly, braces included |
| `SESSION_SECRET` | a long random string (see below) |
| `NODE_ENV` | `production` |

Generate the session secret on your machine:

```powershell
# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

```bash
# macOS / Linux
openssl rand -hex 32
```

**Do not** leave `SESSION_SECRET` unset. The server refuses to start in
production without it, on purpose — the old fallback value was committed to
this repo and anyone reading it could forge a login session.

**Do not** set `PORT`. The image defaults to 8080 and the server uses whatever
`PORT` Railway hands it, so this works either way. Setting it yourself only
creates a value that can drift out of sync with Railway's routing.

**What you'll see:** three variables listed, and Railway offering to redeploy.

## Step 5 — Deploy

1. Click **Deploy** (or push to the branch, which triggers it automatically).
2. Watch the **Build Logs** tab.

**What you'll see:** the build runs `pnpm install`, then a typecheck, then two
builds (frontend, then API). It takes roughly 2-4 minutes on a cold cache.
Then **Deploy Logs** shows two lines:

```
Serving frontend build
Server listening
```

If you see `No frontend build found; serving the API only`, the frontend build
did not land in the image — check the build logs for a Vite error.

## Step 6 — Create the database tables

The schema is managed by Drizzle and has to be pushed once. Run this from your
own machine, not from Railway.

1. In Railway, click the **Postgres** box → **Variables** tab.
2. Copy the value of **`DATABASE_PUBLIC_URL`** (the public one, not the internal
   `DATABASE_URL` — your laptop cannot reach the internal address).
3. In your local checkout:

```powershell
$env:DATABASE_URL = "<paste DATABASE_PUBLIC_URL here>"
pnpm --filter @workspace/db run push
```

**What you'll see:** `[✓] Changes applied`, then three tables exist:
`applicants`, `notes`, `users`.

Skip this step if you are reusing the Replit database — the tables are there.

## Step 7 — Create the login accounts

Nothing in the repo created the user rows; on Replit they were added by hand.
A fresh database has no users, so login can only return 401.

Run it from your local checkout, with `DATABASE_URL` still set to the
`DATABASE_PUBLIC_URL` you copied in step 6:

```powershell
$env:SEED_OWNER_PASSWORD   = "<pick a strong password>"
$env:SEED_MANAGER_PASSWORD = "<pick a different strong password>"
pnpm --filter @workspace/api-server run seed
```

That needs a completed `pnpm run build` first, since it runs the built bundle.

The same script is baked into the deployed image, so if you have the Railway
CLI and `railway ssh` access to the container, `node server/seed.mjs` there does
the identical thing without exposing the database publicly.

**What you'll see:**

```
created owner owner@redfrontpizza.com
created manager manager@redfrontpizza.com
```

Notes on the seed:

- Passwords come from environment variables only. There is no default and no
  hardcoded password. Minimum 12 characters.
- Re-running it is safe. Existing accounts print `exists` and are left alone.
- To reset a password, re-run with `SEED_FORCE=true`.
- Override the addresses with `SEED_OWNER_EMAIL` / `SEED_MANAGER_EMAIL`.

The old credentials documented in `replit.md`
(`owner@redfrontpizza.com` / `redfront2024`) are public in this repo. Do not
reuse that password on Railway.

## Step 8 — Smoke test

Do not trust a green build. Check the running app.

1. Click **Settings** → **Networking** → **Generate Domain** if you have no URL
   yet, then open it.
2. Check these four things:

| Check | Expected |
| --- | --- |
| `https://<domain>/api/healthz` | `{"status":"ok"}` |
| `https://<domain>/` | the login page loads |
| Log in with the owner account | lands on the dashboard |
| Reload on `/applicants` | the page loads, no 404 |

That last one matters: a hard refresh on a client-side route only works because
the server falls back to `index.html`. If it 404s, static serving is broken.

## Step 9 — Repoint the WordPress webhook

Contact Form 7 is still posting to the Replit URL. Update it to:

```
https://<your-domain>/api/webhook/cf7
```

Then submit a real test application from the website and confirm it appears in
the applicant list. The endpoint accepts both JSON and form-urlencoded bodies
and stores the full raw payload, so unmapped fields are not lost.

---

## Known limitation: sessions reset on redeploy

Sessions live in the API server's memory (`express-session`'s default store).
Every redeploy or container restart logs everyone out, and the app cannot run
more than one replica — which is why `railway.json` pins `numReplicas: 1`.

This is not a regression; it behaved the same way on Replit. Fixing it properly
means storing sessions in the Postgres database that is already there. Worth
doing before more than a couple of people use this daily.

## Running it locally

```bash
pnpm install
pnpm run build          # typecheck + build both apps

# Terminal 1 — API on :8080
DATABASE_URL="postgres://..." PORT=8080 pnpm --filter @workspace/api-server start

# Terminal 2 — frontend dev server on :5173, proxying /api to :8080
pnpm --filter @workspace/hiring-manager run dev
```

The dev server proxies `/api` to `http://127.0.0.1:8080` so local development
matches the single-origin production setup. Override the target with
`API_PROXY_TARGET` if the API runs elsewhere.

To preview exactly what Railway serves, run the API server alone after a build
— it picks up `artifacts/hiring-manager/dist/public` automatically and serves
the frontend at `/`.
