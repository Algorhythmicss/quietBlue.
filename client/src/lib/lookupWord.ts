import { extractTargetWord } from "./extractWord";
import { apiUrl } from "./apiBase";
import type { LookupResult } from "../types/lookup";

export type LookupMode = "quick" | "simple" | "feel-it";

export interface BookContext {
  bookName: string;
  description?: string;
}

/** Same word resolution for typed input and voice transcripts. */
export function resolveLookupWord(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return extractTargetWord(trimmed);
}

function isRetryableLookupError(message: string) {
  return /overloaded|rate limit|try again/i.test(message);
}

export async function fetchLookup(
  word: string,
  mode: LookupMode,
  bookContext?: BookContext,
): Promise<LookupResult> {
  const body: Record<string, unknown> = { word, mode };
  if (mode === "feel-it" && bookContext) {
    body.bookContext = bookContext;
  }

  const maxAttempts = 2;
  let lastError = "Something went wrong.";

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(apiUrl("/api/lookup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      return (await res.json()) as LookupResult;
    }

    const data = await res.json().catch(() => ({}));
    lastError = (data as { error?: string }).error || lastError;

    if (isRetryableLookupError(lastError) && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
}
