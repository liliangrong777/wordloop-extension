import type { SavedWord } from "@/utils/types";
import { isCollectableWord } from "@/utils/word";
import { highlightWords } from "./highlight";
import { isSkippedNode, sentenceFromSelection } from "./skip";
import "./style.css";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  runAt: "document_idle",
  cssInjectionMode: "manifest",
  async main() {
    let words: SavedWord[] = [];
    let hideTimer = 0;
    let askedReview = false;
    let collecting = false;
    let collectEl: HTMLButtonElement | null = null;
    let cardEl: HTMLDivElement | null = null;
    let reviewEl: HTMLDivElement | null = null;
    const pageKey = location.origin + location.pathname;

    const settings =
      (await browser.runtime.sendMessage({ type: "GET_SETTINGS" }).catch(() => ({}))) ??
      {};
    let highlightOff = Boolean(settings.pageHighlightDisabled?.[pageKey]);
    words = ((await browser.runtime.sendMessage({ type: "GET_WORDS" }).catch(() => [])) ??
      []) as SavedWord[];

    const refresh = () => {
      if (highlightOff) {
        document
          .querySelectorAll(".wordloop-highlight")
          .forEach((el) => el.replaceWith(document.createTextNode(el.textContent ?? "")));
        return;
      }
      const hits = highlightWords(words);
      if (hits[0] && !isExtensionPage()) {
        void maybeAskReview(hits[0]);
      }
    };

    refresh();

    storage.watch<SavedWord[]>("local:words", (next) => {
      words = next ?? [];
      refresh();
    });

    document.addEventListener("mouseup", () => {
      window.setTimeout(showCollectButton, 10);
    });

    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.classList.contains("wordloop-highlight")) {
        event.preventDefault();
        showWordCard(target);
      }
    });

    const observer = new MutationObserver((mutations) => {
      const ignore = mutations.every((mutation) => {
        const target = mutation.target as Element;
        return (
          (target instanceof Element && target.closest(".wordloop-ui, .wordloop-highlight")) ||
          [...mutation.addedNodes].every(
            (node) =>
              node instanceof Element &&
              node.closest?.(".wordloop-ui, .wordloop-highlight"),
          )
        );
      });
      if (ignore) return;
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(refresh, 400);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function showCollectButton() {
      if (collecting) return;
      collectEl?.remove();
      collectEl = null;
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || !isCollectableWord(text)) return;
      if (selection.anchorNode && isSkippedNode(selection.anchorNode)) return;

      const range = selection.getRangeAt(0).getBoundingClientRect();
      const sentence = sentenceFromSelection(selection);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wordloop-ui wordloop-collect";
      button.textContent = "收藏";
      button.style.left = `${Math.max(8, range.left)}px`;
      button.style.top = `${Math.min(window.innerHeight - 48, range.bottom + 8)}px`;
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void collect(text, sentence, button);
      });
      document.documentElement.append(button);
      collectEl = button;
    }

    async function collect(raw: string, sentence: string, button: HTMLButtonElement) {
      collecting = true;
      button.textContent = "收藏中…";
      button.disabled = true;
      try {
        const saved = (await browser.runtime.sendMessage({
          type: "SAVE_WORD",
          payload: {
            word: raw,
            sourceUrl: location.href,
            sourceTitle: document.title,
            sentence,
          },
        })) as SavedWord;
        const next = words.filter((item) => item.id !== saved.id);
        words = [saved, ...next];
        refresh();
        window.getSelection()?.removeAllRanges();
        button.textContent = "已收藏";
        window.setTimeout(() => {
          if (collectEl === button) {
            button.remove();
            collectEl = null;
          }
        }, 700);
      } catch {
        button.textContent = "收藏失败";
        button.disabled = false;
      } finally {
        collecting = false;
      }
    }

    function showWordCard(target: HTMLElement) {
      cardEl?.remove();
      const word = words.find((item) => item.id === target.dataset.word);
      if (!word) return;
      const rect = target.getBoundingClientRect();
      const card = document.createElement("div");
      card.className = "wordloop-ui wordloop-card";
      card.innerHTML = `
        <strong>${escapeHtml(word.word)} ${escapeHtml(word.phonetic ?? "")}</strong>
        <div>${escapeHtml(word.definition || "还没有释义")}</div>
        <div class="wordloop-muted">${escapeHtml(word.sentence || "没有原句")}</div>
        <div class="wordloop-actions">
          ${word.sourceUrl ? `<button data-act="open">回到出处</button>` : ""}
          <button class="secondary" data-act="mute">关闭本页高亮</button>
          <button class="secondary" data-act="close">关闭</button>
        </div>
      `;
      card.style.left = `${Math.min(rect.left, window.innerWidth - 340)}px`;
      card.style.top = `${rect.bottom + 8}px`;
      card.addEventListener("click", (event) => {
        const act = (event.target as HTMLElement).dataset.act;
        if (act === "open" && word.sourceUrl) window.open(word.sourceUrl, "_blank");
        if (act === "mute") {
          highlightOff = true;
          void browser.runtime.sendMessage({
            type: "SAVE_SETTINGS",
            patch: {
              pageHighlightDisabled: {
                ...(settings.pageHighlightDisabled ?? {}),
                [pageKey]: true,
              },
            },
          });
          refresh();
        }
        card.remove();
        cardEl = null;
      });
      document.documentElement.append(card);
      cardEl = card;
    }

    async function maybeAskReview(word: string) {
      const result = await browser.runtime.sendMessage({
        type: "RECORD_HIGHLIGHT_HIT",
        word,
      });
      if (!result?.shouldPrompt || reviewEl || askedReview) return;
      askedReview = true;

      const first = result.promptIndex === 0;
      const box = document.createElement("div");
      box.className = "wordloop-ui wordloop-review";
      box.style.right = "16px";
      box.style.bottom = "16px";
      box.innerHTML = `
        <strong>${first ? "这个词又出现了" : "又遇见了"}</strong>
        <div>${
          first
            ? `你收藏的「${escapeHtml(word)}」刚在这篇里再次出现。如果这对你有用，去商店写一句真实使用感受就行，能帮后面的人找到它。`
            : `又碰到「${escapeHtml(word)}」了。愿意的话，去商店留一句真实感受。`
        }</div>
        <div class="wordloop-actions">
          <button data-act="store">去商店写评价</button>
          <button class="secondary" data-act="later">以后再说</button>
        </div>
      `;
      box.addEventListener("click", (event) => {
        const act = (event.target as HTMLElement).dataset.act;
        if (act === "store") {
          void browser.runtime.sendMessage({ type: "OPEN_REVIEW_STORE" });
        }
        if (act === "later") {
          void browser.runtime.sendMessage({
            type: "SAVE_SETTINGS",
            patch: {
              reviewPromptCount: result.promptIndex + 1,
              reviewSnoozedUntil: Date.now() + 14 * 24 * 60 * 60 * 1000,
            },
          });
        }
        box.remove();
        reviewEl = null;
      });
      document.documentElement.append(box);
      reviewEl = box;
    }
  },
});

function isExtensionPage() {
  return location.href.startsWith(browser.runtime.getURL("/"));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
