import type { SaveWordInput } from "./types";

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseImportText(text: string, filename = ""): SaveWordInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const isCsv = filename.toLowerCase().endsWith(".csv") || lines[0]?.includes(",");

  if (!isCsv) {
    return lines.map((word) => ({ word }));
  }

  return lines
    .filter((line, index) => {
      if (index !== 0) return true;
      const head = line.toLowerCase();
      return !head.startsWith("word") && !head.startsWith("单词");
    })
    .map((line) => {
      const [word = "", definition = "", sentence = ""] = splitCsvLine(line);
      return { word, definition, sentence };
    })
    .filter((item) => item.word);
}
