const WORD_RE = /^[A-Za-z][A-Za-z'-]{0,47}$/;

export function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/^\W+|\W+$/g, "");
}

export function isCollectableWord(raw: string): boolean {
  const word = normalizeWord(raw);
  return word.length >= 2 && WORD_RE.test(word);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildWordPattern(words: string[]): RegExp | null {
  const unique = [...new Set(words.map(normalizeWord).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  if (unique.length === 0) return null;
  return new RegExp(`\\b(${unique.map(escapeRegExp).join("|")})\\b`, "gi");
}
