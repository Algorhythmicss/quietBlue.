# quietBlue

A minimal word lookup tool for readers. Zero friction — type a word or phrase while reading and get an explanation that fits the moment.

## Modes

- **Quick** — instant definition from the Free Dictionary API (no API key needed)
- **Simple** — a clear, engaging explanation powered by Gemini 2.5 Flash
- **Feel It** — lock in your book once; every word is explained through its world and atmosphere



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
