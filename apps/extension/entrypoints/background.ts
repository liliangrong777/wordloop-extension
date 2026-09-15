import { lookupWord } from "@/utils/dictionary";
import { getReviewUrl } from "@/utils/store-links";
import {
  deleteWord,
  getInstallId,
  getSettings,
  getWords,
  importWords,
  saveSettings,
  saveWord,
} from "@/utils/storage";
import type { SaveWordInput } from "@/utils/types";

const REMINDER_ALARM = "wordloop-weekly-reminder";

export default defineBackground(() => {
  void getInstallId();

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void browser.tabs.create({ url: browser.runtime.getURL("/onboarding.html") });
    }
    void browser.alarms.create(REMINDER_ALARM, { periodInMinutes: 60 * 24 * 7 });
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== REMINDER_ALARM) return;
    void maybeRemind();
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handleMessage(message).then(sendResponse);
    return true;
  });
});

async function handleMessage(message: { type?: string; [key: string]: unknown }) {
  switch (message.type) {
    case "LOOKUP_WORD":
      return lookupWord(String(message.word ?? ""));
    case "SAVE_WORD": {
      const saved = await saveWord(message.payload as SaveWordInput);
      void enrichWord(saved.word);
      return saved;
    }
    case "GET_WORDS":
      return getWords();
    case "DELETE_WORD":
      await deleteWord(String(message.id ?? ""));
      return { ok: true };
    case "IMPORT_WORDS":
      return { count: await importWords(message.items as SaveWordInput[]) };
    case "GET_SETTINGS":
      return getSettings();
    case "SAVE_SETTINGS":
      return saveSettings(message.patch as Parameters<typeof saveSettings>[0]);
    case "MARK_ONBOARDED":
      return saveSettings({ onboarded: true });
    case "RECORD_HIGHLIGHT_HIT":
      return recordHighlightHit(String(message.word ?? ""));
    case "OPEN_REVIEW_STORE":
      await saveSettings({ reviewWentToStore: true });
      await browser.tabs.create({ url: getReviewUrl() });
      return { ok: true };
    default:
      return { error: "unknown_message" };
  }
}

async function enrichWord(word: string) {
  const lookup = await lookupWord(word);
  if (!lookup.definition && !lookup.phonetic && !lookup.audioUrl) return;
  await saveWord({ word, ...lookup });
}

async function recordHighlightHit(word: string) {
  const settings = await getSettings();
  const now = Date.now();
  const shouldPrompt =
    !settings.reviewWentToStore &&
    settings.reviewPromptCount < 2 &&
    now >= settings.reviewSnoozedUntil;

  return { word, shouldPrompt, promptIndex: settings.reviewPromptCount };
}

async function maybeRemind() {
  const settings = await getSettings();
  if (settings.reminderDisabled) return;

  const words = await getWords();
  if (words.length === 0) return;

  const now = Date.now();
  if (now - settings.lastReminderAt < 6 * 24 * 60 * 60 * 1000) return;

  await saveSettings({ lastReminderAt: now });
  try {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("/icon/128.png"),
      title: "默默背单词",
      message: `词表里有 ${words.length} 个词。这周读英文时，看看它们会不会再亮起来。`,
    });
  } catch {
    // 通知权限或图标缺失时忽略，不挡主流程
  }
}
