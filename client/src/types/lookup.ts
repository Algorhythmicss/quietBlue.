export interface QuickResult {
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string | null;
}

export interface SimpleResult {
  word: string;
  partOfSpeech: string;
  definition: string;
  example?: string | null;
}

export interface FeelItResult {
  word: string;
  partOfSpeech: string;
  definition: string;
  contextualResonance: string;
}

export type LookupResult = QuickResult | SimpleResult | FeelItResult;

export function isFeelItResult(r: LookupResult): r is FeelItResult {
  return "contextualResonance" in r;
}
