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

export async function fetchLookup(
  word: string,
  mode: LookupMode,
  bookContext?: BookContext,
): Promise<LookupResult> {
  const body: Record<string, unknown> = { word, mode };
  if (mode === "feel-it" && bookContext) {
    body.bookContext = bookContext;
  }

  const res = await fetch(apiUrl("/api/lookup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error || "Something went wrong.",
    );
  }

  return (await res.json()) as LookupResult;
}
