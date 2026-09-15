import { useEffect, useRef, useState } from "react";
import { highlightWords } from "@/entrypoints/content/highlight";
import { sentenceFromSelection } from "@/entrypoints/content/skip";
import type { LookupResult, SavedWord } from "@/utils/types";
import { isCollectableWord } from "@/utils/word";

const SAMPLE = `When you meet a word again in a real page, it stays longer than a list. Collect a curious word here, then notice how it lights up in this paragraph. Later, the same thing happens in the articles you already read every day.`;

export function Onboarding() {
  const articleRef = useRef<HTMLElement>(null);
  const [saved, setSaved] = useState<SavedWord | null>(null);

  const paint = async () => {
    const words = (await browser.runtime.sendMessage({
      type: "GET_WORDS",
    })) as SavedWord[];
    if (articleRef.current) highlightWords(words, articleRef.current);
  };

  useEffect(() => {
    void browser.runtime.sendMessage({ type: "MARK_ONBOARDED" });
    if (articleRef.current && !articleRef.current.dataset.ready) {
      articleRef.current.textContent = SAMPLE;
      articleRef.current.dataset.ready = "1";
    }
    void paint();
  }, [saved]);

  const collectSelection = async () => {
    const selection = window.getSelection();
    const raw = selection?.toString().trim() ?? "";
    if (!selection || !isCollectableWord(raw)) return;
    const lookup = (await browser.runtime.sendMessage({
      type: "LOOKUP_WORD",
      word: raw,
    })) as LookupResult;
    const word = (await browser.runtime.sendMessage({
      type: "SAVE_WORD",
      payload: {
        word: raw,
        definition: lookup.definition,
        phonetic: lookup.phonetic,
        audioUrl: lookup.audioUrl,
        sourceUrl: location.href,
        sourceTitle: "引导页",
        sentence: sentenceFromSelection(selection),
      },
    })) as SavedWord;
    setSaved(word);
    selection.removeAllRanges();
    await paint();
  };

  return (
    <main className="page">
      <p className="eyebrow">3 分钟上手</p>
      <h1>把单词送回你正在读的英文里</h1>
      <ol>
        <li>把「默默背单词」固定到浏览器工具栏，以后找得到。</li>
        <li>在下面这段英文里划一个词，点出现的收藏，或直接松开鼠标后再划一次并按下面按钮。</li>
        <li>收藏成功后，这个词会在这段里亮起来。之后你自己的网页也会这样。</li>
      </ol>
      <article
        ref={articleRef}
        className="sample"
        onMouseUp={() => void collectSelection()}
      />
      <div className="row">
        <button onClick={() => void collectSelection()}>收藏选中的词</button>
        <p className="hint">词表、删除和导入都在右上角插件弹层里。</p>
      </div>
      {saved ? (
        <p className="ok">
          已收藏 <strong>{saved.word}</strong>
          {saved.phonetic ? ` ${saved.phonetic}` : ""}。
          {saved.definition || "先记下这个词，释义稍后也可以再补。"}
          打开任意英文网页时，它会再次亮起。换设备同步要等邮箱登录，现在先不用管。
        </p>
      ) : (
        <p className="hint">试试划 curious、paragraph 或 articles。</p>
      )}
    </main>
  );
}
