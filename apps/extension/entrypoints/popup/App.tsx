import { useEffect, useState } from "react";
import { parseImportText } from "@/utils/import-words";
import { getReviewUrl } from "@/utils/store-links";
import type { SavedWord } from "@/utils/types";

export function App() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    const next = await browser.runtime.sendMessage({ type: "GET_WORDS" });
    setWords(next ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const onImport = async (file: File) => {
    const text = await file.text();
    const items = parseImportText(text, file.name);
    const result = await browser.runtime.sendMessage({
      type: "IMPORT_WORDS",
      items,
    });
    setStatus(`已导入 ${result.count} 个词`);
    await load();
  };

  return (
    <div className="app">
      <h1>默默背单词</h1>
      <p className="hint">
        划词收藏后，之后读英文时这些词会自己亮起来。登录同步还没接上，词表现在只存在这台浏览器。
      </p>
      <div className="row">
        <button
          className="ghost"
          onClick={() =>
            browser.tabs.create({ url: browser.runtime.getURL("/onboarding.html") })
          }
        >
          打开引导
        </button>
        <label className="file">
          导入词表
          <input
            type="file"
            accept=".txt,.csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onImport(file);
            }}
          />
        </label>
      </div>
      {status ? <div className="hint">{status}</div> : null}
      {words.length === 0 ? (
        <div className="empty">还没有词。先去一篇英文里划一个，或导入旧词表。</div>
      ) : (
        <div className="list">
          {words.map((word) => (
            <article className="item" key={word.id}>
              <header>
                <strong>
                  {word.word} {word.phonetic}
                </strong>
                <button
                  className="ghost"
                  onClick={async () => {
                    await browser.runtime.sendMessage({
                      type: "DELETE_WORD",
                      id: word.id,
                    });
                    await load();
                  }}
                >
                  删除
                </button>
              </header>
              <p>{word.definition || "没有释义"}</p>
              {word.sentence ? <p className="sentence">{word.sentence}</p> : null}
              {word.sourceUrl ? (
                <p>
                  <a href={word.sourceUrl} target="_blank" rel="noreferrer">
                    回到出处
                  </a>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <p className="meta">
        {words.length} 个词 ·{" "}
        <a href={getReviewUrl()} target="_blank" rel="noreferrer">
          去商店评价
        </a>
      </p>
    </div>
  );
}
