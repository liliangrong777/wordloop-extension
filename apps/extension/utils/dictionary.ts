import type { LookupResult } from "./types";
import { normalizeWord } from "./word";

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: { definition?: string }[];
  }[];
};

export async function lookupWord(raw: string): Promise<LookupResult> {
  const word = normalizeWord(raw);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal },
    );
    if (!response.ok) return { definition: "" };

    const data = (await response.json()) as DictionaryEntry[];
    const entry = data[0];
    const firstSense = entry?.meanings?.[0]?.definitions?.[0]?.definition ?? "";
    const part = entry?.meanings?.[0]?.partOfSpeech;
    const definition = part && firstSense ? `${part}. ${firstSense}` : firstSense;
    const phonetic =
      entry?.phonetic || entry?.phonetics?.find((item) => item.text)?.text;
    const audioUrl = entry?.phonetics?.find((item) => item.audio)?.audio;

    return { definition, phonetic, audioUrl };
  } catch {
    return { definition: "" };
  } finally {
    clearTimeout(timer);
  }
}
