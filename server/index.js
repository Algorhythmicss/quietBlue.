import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config({ path: join(__dirname, "..", ".env") });
const app = express();
const PORT = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

app.use(cors());
app.use(express.json());

const definitionCache = new Map();
const CACHE_TTL = {
  quick: 24 * 60 * 60 * 1000,
  simple: 60 * 60 * 1000,
};

function cacheKey(mode, word) {
  return `${mode}:${word.toLowerCase().trim()}`;
}

function getCached(mode, word) {
  const entry = definitionCache.get(cacheKey(mode, word));
  if (!entry) return null;
  const ttl = CACHE_TTL[mode];
  if (Date.now() - entry.cachedAt > ttl) {
    definitionCache.delete(cacheKey(mode, word));
    return null;
  }
  return entry.data;
}

function setCached(mode, word, data) {
  definitionCache.set(cacheKey(mode, word), { data, cachedAt: Date.now() });
}

function sweepExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of definitionCache) {
    const mode = key.slice(0, key.indexOf(":"));
    const ttl = CACHE_TTL[mode];
    if (ttl && now - entry.cachedAt > ttl) {
      definitionCache.delete(key);
    }
  }
}

// ── Lookup Route ────────────────────────────────────────────────────────────
app.post("/api/lookup", async (req, res) => {
  const { word, mode, bookContext } = req.body;

  if (!word || !mode) {
    return res.status(400).json({ error: "word and mode are required" });
  }

  // ── Quick Mode: Free Dictionary API ─────────────────────────────────────
  if (mode === "quick") {
    const cached = getCached(mode, word);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    try {
      const encoded = encodeURIComponent(word.trim().toLowerCase());
      const apiRes = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`
      );
      if (!apiRes.ok) {
        return res.status(404).json({ error: "Word not found in dictionary" });
      }
      const data = await apiRes.json();
      const entry = data[0];
      const firstMeaning = entry.meanings[0];
      const firstDef = firstMeaning.definitions[0];
      const response = {
        word: entry.word,
        partOfSpeech: firstMeaning.partOfSpeech,
        definition: firstDef.definition,
        example: firstDef.example || null,
      };
      setCached(mode, word, response);
      return res.json(response);
    } catch {
      return res.status(500).json({ error: "Failed to fetch definition" });
    }
  }

  // ── Simple Mode: Gemini ──────────────────────────────────────────────────
  if (mode === "simple") {
    const cached = getCached(mode, word);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    try {
      const prompt = `Give a clear, approachable explanation of the word or phrase: "${word}".

Format your response as JSON with this exact structure:
{
  "word": "<the word or phrase>",
  "partOfSpeech": "<noun/verb/adjective/phrase/etc or empty string>",
  "definition": "<a clear, engaging explanation in 1-3 sentences that a curious reader would appreciate>",
  "example": "<an illustrative example sentence or null>"
}

Only return valid JSON, nothing else.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      const response = JSON.parse(cleaned);
      setCached(mode, word, response);
      return res.json(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        error:
          msg.includes("quota") || msg.includes("429")
            ? "Rate limit reached on Gemini API. Try again shortly."
            : "Failed to generate explanation",
      });
    }
  }

  // ── Feel It Mode: Gemini with book context ────────────────────────────────
  if (mode === "feel-it") {
    if (!bookContext?.bookName) {
      return res
        .status(400)
        .json({ error: "bookContext.bookName is required for feel-it mode" });
    }
    try {
      const contextNote = bookContext.description
        ? `The reader describes the experience of the book as: "${bookContext.description}".`
        : "";

      const prompt = `You are explaining the word or phrase "${word}" to a reader who is currently reading "${bookContext.bookName}". ${contextNote}

Channel the spirit, voice, and atmosphere of that book. Make the explanation feel like it comes from within that world — as if the book itself is whispering the meaning. Draw on themes, imagery, or the emotional register of the book if you can.

Format your response as JSON with this exact structure:
{
  "word": "<the word or phrase>",
  "partOfSpeech": "<noun/verb/adjective/phrase/etc or empty string>",
  "definition": "<the core meaning, written in a way that feels native to the book's world>",
  "contextualResonance": "<a short, evocative passage (2-4 sentences) that illustrates the word through the lens of the book — its themes, characters, or atmosphere. Write it in the book's spirit, like a literary annotation.>"
}

Only return valid JSON, nothing else.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      return res.json(JSON.parse(cleaned));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        error:
          msg.includes("quota") || msg.includes("429")
            ? "Rate limit reached on Gemini API. Try again shortly."
            : "Failed to generate contextual explanation",
      });
    }
  }

  return res.status(400).json({ error: "Invalid mode" });
});

// bulbul:v3-compatible speakers (legacy names like meera/anushka are not valid here)
const SARVAM_V3_SPEAKERS = new Set([
  "aditya",
  "ritu",
  "ashutosh",
  "priya",
  "neha",
  "rahul",
  "pooja",
  "rohan",
  "simran",
  "kavya",
  "amit",
  "dev",
  "ishita",
  "shreya",
  "ratan",
  "varun",
  "manan",
  "sumit",
  "roopa",
  "kabir",
  "aayan",
  "shubh",
  "advait",
  "anand",
  "tanya",
  "tarun",
  "sunny",
  "mani",
  "gokul",
  "vijay",
  "shruti",
  "suhani",
  "mohit",
  "kavitha",
  "rehan",
  "soham",
  "rupali",
  "niharika",
]);

function sarvamSpeaker(voice) {
  const v = typeof voice === "string" ? voice.toLowerCase() : "";
  return SARVAM_V3_SPEAKERS.has(v) ? v : "shubh";
}

// ── TTS Route ───────────────────────────────────────────────────────────────
app.post("/api/tts", async (req, res) => {
  const { text, speed, voice } = req.body;

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  if (process.env.SARVAM_API_KEY) {
    try {
      const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          target_language_code: "en-IN",
          model: "bulbul:v3",
          speaker: sarvamSpeaker(voice),
          pace: speed || 1.1,
          enable_preprocessing: true,
        }),
      });

      if (sarvamRes.ok) {
        const data = await sarvamRes.json();
        if (data.audios?.[0]) {
          return res.json({ audio: data.audios[0], format: "wav", source: "sarvam" });
        }
        console.error("[TTS] Sarvam 200 but missing audios");
      } else {
        console.error("[TTS] Sarvam HTTP", sarvamRes.status);
      }
    } catch (err) {
      console.error(
        "[TTS] Sarvam error:",
        err instanceof Error ? err.message : String(err)
      );
    }
  } else {
    console.error("[TTS] SARVAM_API_KEY not set");
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const oaiRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: "fable",
          input: text,
          speed: speed || 1.1,
        }),
      });

      if (oaiRes.ok) {
        const audio = Buffer.from(await oaiRes.arrayBuffer());
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-TTS-Source", "openai");
        return res.send(audio);
      }
      console.error("[TTS] OpenAI HTTP", oaiRes.status);
    } catch (err) {
      console.error(
        "[TTS] OpenAI error:",
        err instanceof Error ? err.message : String(err)
      );
    }
  } else {
    console.error("[TTS] OPENAI_API_KEY not set");
  }

  return res.status(500).json({ error: "TTS unavailable" });
});

const distPath = join(__dirname, "..", "client", "dist");

// ── Health check (Render / monitoring) ──────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    deepgram: !!process.env.DEEPGRAM_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    tts: !!(process.env.SARVAM_API_KEY || process.env.OPENAI_API_KEY),
    frontend: existsSync(distPath),
  });
});

// ── Deepgram Token Route ────────────────────────────────────────────────────
app.get("/api/deepgram-token", async (req, res) => {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    console.error("[Deepgram] DEEPGRAM_API_KEY not set");
    return res.status(503).json({ error: "DEEPGRAM_API_KEY not configured" });
  }

  // Prefer short-lived JWT for browser WebSocket (Deepgram recommended)
  try {
    const grantRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: "Token " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 3600 }),
    });
    if (grantRes.ok) {
      const data = await grantRes.json();
      if (data.access_token) {
        return res.json({ key: data.access_token, temporary: true });
      }
    } else {
      const errBody = await grantRes.text().catch(() => "");
      console.error(
        "[Deepgram] JWT grant failed:",
        grantRes.status,
        errBody.slice(0, 200)
      );
    }
  } catch (err) {
    console.error(
      "[Deepgram] JWT grant error:",
      err instanceof Error ? err.message : String(err)
    );
  }

  const projectId = process.env.DEEPGRAM_PROJECT_ID;

  if (projectId) {
    try {
      const dgRes = await fetch(
        `https://api.deepgram.com/v1/projects/${projectId}/keys`,
        {
          method: "POST",
          headers: {
            Authorization: "Token " + apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            comment: "temp-client-key",
            scopes: ["usage:write"],
            time_to_live_in_seconds: 3600,
          }),
        }
      );

      if (dgRes.ok) {
        const data = await dgRes.json();
        return res.json({ key: data.key, temporary: true });
      }

      const errBody = await dgRes.text().catch(() => "");
      console.error(
        "[Deepgram] Temp key creation failed:",
        dgRes.status,
        errBody.slice(0, 200)
      );
    } catch (err) {
      console.error(
        "[Deepgram] Temp key error:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return res.json({ key: apiKey, temporary: false });
});

// ── Serve built frontend in production ───────────────────────────────────────
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(join(distPath, "index.html"));
  });
} else {
  console.warn(
    "[quietBlue] client/dist not found — run: cd client && npm run build"
  );
}

app.listen(PORT, () => {
  console.log(`quietBlue server running on port ${PORT}`);
  console.log(
    `[quietBlue] frontend: ${existsSync(distPath) ? "serving client/dist" : "NOT BUILT"}`
  );
  console.log(
    `[quietBlue] deepgram: ${process.env.DEEPGRAM_API_KEY ? "configured" : "MISSING — mic will fail"}`
  );
});

setInterval(sweepExpiredCache, 30 * 60 * 1000);
