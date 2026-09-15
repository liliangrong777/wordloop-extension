export type SavedWord = {
  id: string;
  word: string;
  definition: string;
  phonetic?: string;
  audioUrl?: string;
  sourceUrl: string;
  sourceTitle?: string;
  sentence: string;
  createdAt: number;
  updatedAt: number;
};

export type SaveWordInput = {
  word: string;
  definition?: string;
  phonetic?: string;
  audioUrl?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sentence?: string;
};

export type AppSettings = {
  onboarded: boolean;
  pageHighlightDisabled: Record<string, boolean>;
  reviewPromptCount: number;
  reviewWentToStore: boolean;
  reviewSnoozedUntil: number;
  reminderDisabled: boolean;
  lastReminderAt: number;
};

export type LookupResult = {
  definition: string;
  phonetic?: string;
  audioUrl?: string;
};
