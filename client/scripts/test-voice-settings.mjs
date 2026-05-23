/**
 * Automated round-trip test for voice settings localStorage persistence.
 * Run: node scripts/test-voice-settings.mjs
 */

const STORAGE_KEY = "quietblue-voice-settings";

const DEFAULT_VOICE_SETTINGS = {
  micMode: "push",
  sessionMinutes: 30,
  speed: 1.1,
  voice: "meera",
  speakWordFirst: true,
};

function normalizeVoiceSettings(partial) {
  return {
    micMode: partial.micMode === "session" ? "session" : "push",
    sessionMinutes:
      typeof partial.sessionMinutes === "number" && partial.sessionMinutes > 0
        ? Math.round(partial.sessionMinutes)
        : DEFAULT_VOICE_SETTINGS.sessionMinutes,
    speed:
      typeof partial.speed === "number"
        ? Math.min(1.3, Math.max(0.8, Math.round(partial.speed * 10) / 10))
        : DEFAULT_VOICE_SETTINGS.speed,
    voice:
      partial.voice === "fable" || partial.voice === "nova" ? "fable" : "meera",
    speakWordFirst: partial.speakWordFirst !== false,
  };
}

function readVoiceSettings(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return normalizeVoiceSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

function writeVoiceSettings(next, storage) {
  const normalized = normalizeVoiceSettings(next);
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function createMockStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const storage = createMockStorage();

// 1. Empty storage → defaults
assert(
  deepEqual(readVoiceSettings(storage), DEFAULT_VOICE_SETTINGS),
  "empty storage should return defaults",
);

// 2. Write session mode + custom fields, read back
const custom = {
  micMode: "session",
  sessionMinutes: 45,
  speed: 1.25,
  voice: "fable",
  speakWordFirst: false,
};
const written = writeVoiceSettings(custom, storage);
const expected = {
  micMode: "session",
  sessionMinutes: 45,
  speed: 1.3, // clamped from 1.25? 1.25 rounds to 1.3? Let's check: Math.round(1.25 * 10) / 10 = 1.3
  voice: "fable",
  speakWordFirst: false,
};
assert(deepEqual(written, expected), `write normalization failed: ${JSON.stringify(written)}`);

const raw = storage.getItem(STORAGE_KEY);
assert(raw === JSON.stringify(expected), "storage raw JSON mismatch");

const loaded = readVoiceSettings(storage);
assert(deepEqual(loaded, expected), `read round-trip failed: ${JSON.stringify(loaded)}`);

// 3. Invalid JSON → defaults
storage.setItem(STORAGE_KEY, "not-json{{{");
assert(
  deepEqual(readVoiceSettings(storage), DEFAULT_VOICE_SETTINGS),
  "invalid JSON should return defaults",
);

// 4. Partial JSON → normalized merge
storage.setItem(STORAGE_KEY, JSON.stringify({ micMode: "session", speed: 99 }));
const partial = readVoiceSettings(storage);
assert(partial.micMode === "session", "partial micMode");
assert(partial.speed === 1.3, "partial speed clamped");
assert(partial.voice === "meera", "partial voice default");

console.log("✓ All voice settings localStorage tests passed");
