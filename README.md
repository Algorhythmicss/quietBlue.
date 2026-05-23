# quietBlue

A minimal word lookup tool for readers. Zero friction — type a word or phrase while reading and get an explanation that fits the moment.

## Modes

- **Quick** — instant definition from the Free Dictionary API (no API key needed)
- **Simple** — a clear, engaging explanation powered by Gemini 2.5 Flash
- **Feel It** — lock in your book once; every word is explained through its world and atmosphere

## Setup

### 1. Get a Gemini API Key

Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a free API key.

### 2. Install and run the backend

```bash
cd server
npm install
cp ../.env.example .env
# Edit .env and add your GEMINI_API_KEY
node index.js
```

The server runs on `http://localhost:3001`.

### 3. Run the frontend (development)

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` calls to the server.

### 4. Build for production

```bash
cd client
npm run build
```

This creates a `client/dist/` folder. The Express server automatically serves these static files when it finds them — so you only need to run the server in production.

```bash
cd server
NODE_ENV=production node index.js
```

## Deployment

### Railway / Render / Fly.io

1. Build the frontend first: `cd client && npm run build`
2. Deploy the whole project root
3. Set the `GEMINI_API_KEY` environment variable in your platform dashboard
4. Set the start command to: `cd server && node index.js`

### Vercel / Netlify (frontend only)

If you want to deploy just the frontend to a static host, update `API_BASE` in `client/src/pages/Home.tsx` to point to your backend URL:

```ts
const API_BASE = "https://your-backend.railway.app";
```

Then build and deploy the `client/dist/` folder.

## Project Structure

```
quietblue/
├── .env.example          # Environment variable template
├── README.md
├── server/
│   ├── index.js          # Express backend (API routes)
│   └── package.json
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        └── pages/
            └── Home.tsx  # Main UI — edit this to customize
```
