import type { AppSettings, SavedWord, SaveWordInput } from "./types";
import { normalizeWord } from "./word";

const WORDS_KEY = "words";
const SETTINGS_KEY = "settings";
const INSTALL_ID_KEY = "installId";

const defaultSettings = (): AppSettings => ({
  onboarded: false,
  pageHighlightDisabled: {},
  reviewPromptCount: 0,
  reviewWentToStore: false,
  reviewSnoozedUntil: 0,
  reminderDisabled: false,
  lastReminderAt: 0,
});

export async function getInstallId(): Promise<string> {
  const stored = await storage.getItem<string>(`local:${INSTALL_ID_KEY}`);
  if (stored) return stored;
  const id = crypto.randomUUID();
  await storage.setItem(`local:${INSTALL_ID_KEY}`, id);
  return id;
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await storage.getItem<AppSettings>(`local:${SETTINGS_KEY}`);
  return { ...defaultSettings(), ...stored };
}

export async function saveSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  const next = { ...(await getSettings()), ...patch };
  await storage.setItem(`local:${SETTINGS_KEY}`, next);
  return next;
}

export async function getWords(): Promise<SavedWord[]> {
  return (await storage.getItem<SavedWord[]>(`local:${WORDS_KEY}`)) ?? [];
}

export async function saveWord(input: SaveWordInput): Promise<SavedWord> {
  const word = normalizeWord(input.word);
  const now = Date.now();
  const words = await getWords();
  const existing = words.find((item) => item.id === word);
  const next: SavedWord = {
    id: word,
    word,
    definition: input.definition?.trim() || existing?.definition || "",
    phonetic: input.phonetic || existing?.phonetic,
    audioUrl: input.audioUrl || existing?.audioUrl,
    sourceUrl: input.sourceUrl || existing?.sourceUrl || "",
    sourceTitle: input.sourceTitle || existing?.sourceTitle,
    sentence: input.sentence?.trim() || existing?.sentence || "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const updated = existing
    ? words.map((item) => (item.id === word ? next : item))
    : [next, ...words];

  await storage.setItem(`local:${WORDS_KEY}`, updated);
  return next;
}

export async function deleteWord(id: string): Promise<void> {
  const words = await getWords();
  await storage.setItem(
    `local:${WORDS_KEY}`,
    words.filter((item) => item.id !== id),
  );
}

export async function importWords(items: SaveWordInput[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (!item.word.trim()) continue;
    await saveWord(item);
    count += 1;
  }
  return count;
}
