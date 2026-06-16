# quietBlue

A minimal word lookup tool for readers. Zero friction — type a word or phrase while reading and get an explanation that fits the moment.

## Modes

- **Quick** — instant definition from the Free Dictionary API (no API key needed)
- **Simple** — a clear, engaging explanation powered by Gemini 2.5 Flash
- **Feel It** — lock in your book once; every word is explained through its world and atmosphere

## Local development

```bash
# Terminal 1 — API
cd server && npm install && node index.js

# Terminal 2 — frontend (proxies /api → localhost:3001)
cd client && npm install && npm run dev
```

Copy `.env.example` to `server/.env` and fill in API keys.

## Deploy to Render (recommended: single web service)

Use **one Web Service** — not a separate Static Site. The Express server serves both the built React app and `/api/*` routes on the same origin, which is required for the microphone (HTTPS + same-origin API).

### Option A — Blueprint (`render.yaml`)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint** → connect the repo. Render reads `render.yaml`.
3. In the Render dashboard, set these **Environment** variables (marked `sync: false` in the blueprint):
   - `GEMINI_API_KEY` — required for Simple / Feel It modes
   - `DEEPGRAM_API_KEY` — **required for voice / mic**
   - `DEEPGRAM_PROJECT_ID` — optional; enables short-lived client keys
   - `SARVAM_API_KEY` or `OPENAI_API_KEY` — for text-to-speech
4. Deploy. Render runs:
   - **Build:** `cd client && npm ci && npm run build && cd ../server && npm ci`
   - **Start:** `cd server && node index.js`
5. Verify: open `https://<your-app>.onrender.com/api/health` — `deepgram` should be `true`.

`PORT` is set automatically by Render. Do **not** commit `server/.env`.

### Option B — Manual web service

| Setting | Value |
|--------|--------|
| Root Directory | *(repo root)* |
| Build Command | `cd client && npm ci && npm run build && cd ../server && npm ci` |
| Start Command | `cd server && node index.js` |
| Health Check Path | `/api/health` |

Add the same environment variables as above.

### Split deploy (frontend + backend on different URLs)

Only if you host the Vite app separately from Express:

1. Deploy the backend as above (without serving `client/dist`).
2. At **client build time**, set `VITE_API_URL=https://your-backend.onrender.com`.
3. Deploy the static frontend to your CDN / static host.

For mic to work, the backend must be HTTPS and CORS is already enabled on the server.

## Troubleshooting mic in production

| Symptom | Likely cause |
|--------|----------------|
| "Voice service not configured…" | `DEEPGRAM_API_KEY` missing in Render Environment |
| "Cannot reach the API…" | Split deploy without `VITE_API_URL`, or Static Site only (no backend) |
| "Server unavailable (HTTP 502/503)…" | Service crashed or still deploying — check Render logs |
| Mic works locally but not on Render | Env vars set in `server/.env` locally but not in Render dashboard |

After adding env vars on Render, trigger a **Manual Deploy** (env changes require redeploy).

## Project Structure

```
quietblue/
├── .env.example          # Environment variable template
├── render.yaml           # Render Blueprint (single web service)
├── README.md
├── server/
│   ├── index.js          # Express backend (API + serves client/dist)
│   └── package.json
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── lib/apiBase.ts   # VITE_API_URL for split deploy
        └── pages/Home.tsx
```

