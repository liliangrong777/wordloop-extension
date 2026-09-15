import type { SavedWord } from "@/utils/types";
import { buildWordPattern, normalizeWord } from "@/utils/word";
import { isSkippedNode } from "./skip";

const MAX_HIGHLIGHTS = 80;

export function clearHighlights(root: ParentNode = document.body) {
  root.querySelectorAll<HTMLElement>(".wordloop-highlight").forEach((el) => {
    const text = document.createTextNode(el.textContent ?? "");
    el.replaceWith(text);
    text.parentElement?.normalize();
  });
}

export function highlightWords(
  words: SavedWord[],
  root: ParentNode = document.body,
): string[] {
  clearHighlights(root);
  const pattern = buildWordPattern(words.map((item) => item.word));
  if (!pattern || !document.body) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (isSkippedNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  const hits: string[] = [];
  let count = 0;

  for (const textNode of textNodes) {
    if (count >= MAX_HIGHLIGHTS) break;
    const text = textNode.nodeValue ?? "";
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;

    const frag = document.createDocumentFragment();
    let last = 0;
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match && count < MAX_HIGHLIGHTS) {
      const [value] = match;
      const start = match.index;
      if (start > last) frag.append(text.slice(last, start));

      const mark = document.createElement("mark");
      mark.className = "wordloop-highlight";
      mark.dataset.word = normalizeWord(value);
      mark.textContent = value;
      frag.append(mark);
      hits.push(normalizeWord(value));
      count += 1;
      last = start + value.length;
      match = pattern.exec(text);
    }
    if (last < text.length) frag.append(text.slice(last));
    textNode.replaceWith(frag);
  }

  return [...new Set(hits)];
}
