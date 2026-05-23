const FILLER = new Set(["um", "uh", "like", "so", "and"]);

const STOPWORDS = new Set([
  "what",
  "does",
  "mean",
  "the",
  "a",
  "an",
  "is",
  "it",
  "this",
  "that",
  "and",
  "or",
  "but",
  "for",
  "with",
  "from",
  "how",
  "why",
  "when",
  "where",
  "who",
]);

const EXPLICIT_PATTERNS: RegExp[] = [
  /^what does (.+?) mean$/,
  /^what is (.+)$/,
  /^define (.+)$/,
  /^meaning of (.+)$/,
  /^(.+?) meaning$/,
  /^what's (.+)$/,
  /^explain (.+)$/,
];

function stripWordEdges(word: string): string {
  return word.replace(/^[^\w'-]+|[^\w'-]+$/g, "");
}

function stripPunctuation(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map(stripWordEdges)
    .filter(Boolean)
    .join(" ");
}

function countWords(phrase: string): number {
  return phrase.split(/\s+/).filter(Boolean).length;
}

function hasFiller(phrase: string): boolean {
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => FILLER.has(stripWordEdges(word)));
}

function tryExplicitPatterns(normalized: string): string | null {
  for (const pattern of EXPLICIT_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const captured = stripPunctuation(match[1].trim());
    if (!captured) continue;

    const words = countWords(captured);
    if (words >= 1 && words <= 3) return captured;
  }

  return null;
}

const SENTENCE_STARTERS = new Set(["i", "we", "they", "he", "she", "you"]);

function looksLikeFullSentence(normalized: string): boolean {
  const first = normalized.split(/\s+/).filter(Boolean)[0];
  return first ? SENTENCE_STARTERS.has(stripWordEdges(first)) : false;
}

function longestNonStopword(normalized: string): string | null {
  let longest = "";

  for (const token of normalized.split(/\s+/).filter(Boolean)) {
    const word = stripWordEdges(token);
    if (!word || STOPWORDS.has(word)) continue;
    if (word.length > longest.length) longest = word;
  }

  return longest || null;
}

/**
 * Extracts a likely dictionary lookup target from a voice or text transcript.
 *
 * Applies normalization (trim, lowercase), explicit phrase patterns (e.g.
 * "what does X mean", "define X"), then heuristics based on word count:
 * 1–3 words without filler tokens, or the longest non-stopword among 4–7 words.
 *
 * @param transcript - Raw speech or text input
 * @returns Lowercased target word or short phrase (1–3 words), or null if none found
 */
export function extractTargetWord(transcript: string): string | null {
  const normalized = transcript.trim().toLowerCase();
  if (!normalized || normalized.length > 60) return null;

  const fromPattern = tryExplicitPatterns(normalized);
  if (fromPattern) return fromPattern;

  const words = countWords(normalized);
  if (words >= 8) return null;

  if (words >= 1 && words <= 3) {
    if (hasFiller(normalized)) return null;
    const cleaned = stripPunctuation(normalized);
    return cleaned || null;
  }

  if (words >= 4 && words <= 7) {
    if (looksLikeFullSentence(normalized)) return null;
    return longestNonStopword(normalized);
  }

  return null;
}

export function isLikelyWord(s: string): boolean {
  return extractTargetWord(s) !== null;
}
