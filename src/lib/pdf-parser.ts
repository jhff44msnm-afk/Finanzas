import { categorizeTransaction } from "./categories";
import { v4 as uuidv4 } from "uuid";
import type { Transaction } from "./types";

function parseAmount(raw: string): number {
  const cleaned = raw.trim();
  const negative = cleaned.endsWith("-");
  const num = parseFloat(cleaned.replace(/[,-]/g, ""));
  return negative ? -num : num;
}

function inferYear(monthDay: string, fallbackYear: number): string {
  const [month, day] = monthDay.split("/");
  return `${fallbackYear}-${month}-${day}`;
}

interface TextItem {
  text: string;
  x: number;
  y: number;
}

interface ParsedLine {
  date: string;
  description: string;
  amount: string;
  balance: string;
}

function groupIntoLines(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: TextItem[][] = [];
  let currentLine: TextItem[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentY) > 3) {
      lines.push(currentLine);
      currentLine = [sorted[i]];
      currentY = sorted[i].y;
    } else {
      currentLine.push(sorted[i]);
    }
  }
  lines.push(currentLine);
  return lines;
}

function parseLineItems(items: TextItem[]): ParsedLine | null {
  const sorted = items.sort((a, b) => a.x - b.x);
  const nonEmpty = sorted.filter((i) => i.text.trim().length > 0);
  if (nonEmpty.length < 3) return null;

  const firstItem = nonEmpty[0];
  const dateMatch = firstItem.text.match(/^(\d{2}\/\d{2})$/);
  if (!dateMatch) return null;

  const descParts: string[] = [];
  let amountStr = "";
  let balanceStr = "";

  for (let i = 1; i < nonEmpty.length; i++) {
    const item = nonEmpty[i];
    const text = item.text.trim();
    if (!text) continue;

    if (item.x >= 500) {
      balanceStr = text;
    } else if (item.x >= 400) {
      if (!amountStr) amountStr = text;
      else if (!balanceStr) balanceStr = text;
    } else if (item.x >= 90) {
      descParts.push(text);
    }
  }

  if (!amountStr && !balanceStr) return null;

  if (!balanceStr && amountStr) {
    const desc = descParts.join(" ");
    if (desc.includes("Balance Forward")) {
      return {
        date: dateMatch[1],
        description: "Balance Forward",
        amount: "0",
        balance: amountStr,
      };
    }
  }

  if (!balanceStr || !amountStr) return null;

  return {
    date: dateMatch[1],
    description: descParts.join(" ").replace(/-+>$/, "").trim(),
    amount: amountStr,
    balance: balanceStr,
  };
}

function detectYearFromText(text: string): number {
  const statementMatch = text.match(
    /Statement\s+from\s+\d{2}\/\d{2}\/(\d{2,4})/i
  );
  if (statementMatch) {
    let y = parseInt(statementMatch[1]);
    if (y < 100) y += 2000;
    return y;
  }

  const thruMatch = text.match(/Thru\s+\d{2}\/\d{2}\/(\d{2,4})/i);
  if (thruMatch) {
    let y = parseInt(thruMatch[1]);
    if (y < 100) y += 2000;
    return y;
  }

  const monthYearMatch = text.match(
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(\d{4})/i
  );
  if (monthYearMatch) {
    const y = parseInt(monthYearMatch[1]);
    if (y >= 2000 && y <= 2099) return y;
  }

  const slashDateMatch = text.match(/\d{2}\/\d{2}\/(\d{4})/);
  if (slashDateMatch) {
    const y = parseInt(slashDateMatch[1]);
    if (y >= 2000 && y <= 2099) return y;
  }

  return 0;
}

export async function parsePdfFile(
  file: File,
  statementId: string
): Promise<{ transactions: Transaction[]; text: string; year: number }> {
  // @ts-expect-error -- load worker on main thread to avoid iOS Safari Worker issues
  globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "data:,";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const allText: string[] = [];
  const pageData: { lineGroups: TextItem[][] }[] = [];

  // First pass: extract all text and detect the year
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: TextItem[] = content.items
      .filter((item) => "str" in item)
      .map((item) => {
        const ti = item as { str: string; transform: number[] };
        return { text: ti.str, x: ti.transform[4], y: ti.transform[5] };
      });

    const lineGroups = groupIntoLines(items);
    pageData.push({ lineGroups });

    for (const lineItems of lineGroups) {
      const lineText = lineItems
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(" ");
      allText.push(lineText);
    }
  }

  const fullText = allText.join("\n");
  let year = detectYearFromText(fullText);
  if (year === 0) year = new Date().getFullYear();

  // Second pass: parse transactions using the detected year
  const allTransactions: Transaction[] = [];
  let seqCounter = 0;

  for (const { lineGroups } of pageData) {
    for (const lineItems of lineGroups) {
      const parsed = parseLineItems(lineItems);
      if (!parsed) continue;

      if (
        parsed.description === "Balance Forward" ||
        parsed.description.includes("Balance Forward")
      ) {
        allTransactions.push({
          id: uuidv4(),
          date: inferYear(parsed.date, year),
          description: "Balance Forward",
          amount: 0,
          balance: parseFloat(parsed.balance.replace(/[,-]/g, "")),
          category: "Adjustments",
          statementId,
          seq: seqCounter++,
          source: "statement",
        });
        continue;
      }

      const amount = parseAmount(parsed.amount);
      const balance = parseFloat(parsed.balance.replace(/[,-]/g, ""));

      if (isNaN(amount) || isNaN(balance)) continue;

      allTransactions.push({
        id: uuidv4(),
        date: inferYear(parsed.date, year),
        description: parsed.description,
        amount,
        balance,
        category: categorizeTransaction(parsed.description),
        statementId,
        seq: seqCounter++,
        source: "statement",
      });
    }
  }

  return { transactions: allTransactions, text: fullText, year };
}

export function detectStatementPeriod(
  text: string,
  year: number
): { start: string; end: string } {
  const match = text.match(
    /Statement\s+from\s+(\d{2}\/\d{2})\/\d{2,4}\s+Thru\s+(\d{2}\/\d{2})\/\d{2,4}/i
  );
  if (match) {
    return {
      start: `${year}-${match[1].replace("/", "-")}`,
      end: `${year}-${match[2].replace("/", "-")}`,
    };
  }
  return { start: "", end: "" };
}
