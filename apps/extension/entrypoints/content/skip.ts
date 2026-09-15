const SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "textarea",
  "input",
  "select",
  "code",
  "pre",
  "[contenteditable]",
  ".wordloop-highlight",
  ".wordloop-ui",
  "[data-immersive-translate-translation-element-mark]",
  ".immersive-translate-target-wrapper",
  ".immersive-translate-target-inner",
  '[class*="immersive-translate-target"]',
].join(",");

export function isSkippedNode(node: Node): boolean {
  const el =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return Boolean(el?.closest(SKIP_SELECTOR));
}

export function sentenceFromSelection(selection: Selection): string {
  const node = selection.anchorNode;
  const el =
    node?.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node?.parentElement;
  const block = el?.closest("p, li, dd, blockquote, h1, h2, h3, h4, td, article");
  const text = (block?.textContent ?? selection.toString()).replace(/\s+/g, " ").trim();
  return text.slice(0, 280);
}
