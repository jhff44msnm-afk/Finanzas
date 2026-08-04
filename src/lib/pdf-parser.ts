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

// ---- GECU Account History (web export) parser ----

const GECU_HIST_SKIP = new Set([
  "Menu", "Account History", "Switch Account", "Account Details",
  "Available Balance", "Balance", "Transfer", "Bill Pay",
  "Card Management", "eStatements", "Text Alerts", "Sort By",
  "Search", "Filters", "DATE (Newest)", "Description", "Amount",
  "Pending", "Posted", "'",
  "You've reached the end of your transaction history in your search window.",
]);
const GECU_HIST_SKIP_RE = [
  /^Checking \*+\d+/,
  /^Showing all transactions for/,
  /^All Transaction Types,/,
];

const MONTH_MAP: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

function parseHistDate(s: string): string | null {
  const m = s.trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${MONTH_MAP[m[1]]}-${m[2].padStart(2, "0")}`;
}

function parseHistDollar(s: string): number | null {
  const m = s.trim().match(/^(-?)\$([\d,]+\.?\d*)$/);
  if (!m) return null;
  const val = parseFloat(m[2].replace(/,/g, ""));
  return m[1] === "-" ? -val : val;
}

export function isGecuHistoryPdf(text: string): boolean {
  return text.includes("Account History") && text.includes("Showing all transactions for");
}

export async function parseGecuHistoryPdf(
  file: File,
  statementId: string
): Promise<{ transactions: Transaction[]; periodStart: string; periodEnd: string }> {
  // @ts-expect-error -- load worker on main thread to avoid iOS Safari Worker issues
  globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "data:,";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  interface RawItem { text: string; x: number; y: number; order: number }
  const allItems: RawItem[] = [];
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const ti = item as { str: string; transform: number[] };
      if (!ti.str.trim()) continue;
      const x = Math.round(ti.transform[4]);
      const y = Math.round(ti.transform[5]);
      allItems.push({ text: ti.str, x, y, order: (pdf.numPages - pageNum) * 100000 + y });
      textParts.push(ti.str);
    }
  }

  // Process top-to-bottom; for same y, right-column items (high x) before left-column
  allItems.sort((a, b) => b.order !== a.order ? b.order - a.order : b.x - a.x);

  const fullText = textParts.join(" ");
  const periodMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})/);
  const slashToIso = (s: string) => { const [m, d, y] = s.split("/"); return `${y}-${m}-${d}`; };
  const periodStart = periodMatch ? slashToIso(periodMatch[1]) : "";
  const periodEnd   = periodMatch ? slashToIso(periodMatch[2]) : "";

  const transactions: Transaction[] = [];
  let seq = 0;
  let descParts: string[] = [];
  let rightItems: { y: number; val: number }[] = [];
  let maxDescY = -Infinity;

  const flush = (dateStr: string) => {
    const description = descParts.join(" ").trim();
    const snapMaxDescY = maxDescY;
    descParts = [];
    maxDescY = -Infinity;
    if (!description || !dateStr) { rightItems = []; return; }
    // Only include right-column items at or below the topmost description line
    const valid = rightItems.filter((r) => r.y <= snapMaxDescY).sort((a, b) => b.y - a.y);
    rightItems = [];
    const amount  = valid[0]?.val ?? 0;
    const balance = valid[1]?.val ?? 0;
    transactions.push({
      id: uuidv4(), date: dateStr, description, amount, balance,
      category: categorizeTransaction(description),
      statementId, seq: seq++, source: "statement",
    });
  };

  for (const { text, x, y } of allItems) {
    const t = text.trim();
    if (!t) continue;
    if (GECU_HIST_SKIP.has(t) || GECU_HIST_SKIP_RE.some((r) => r.test(t))) continue;

    const date = x < 150 ? parseHistDate(t) : null;
    if (date !== null) { flush(date); continue; }

    const dollar = x > 450 ? parseHistDollar(t) : null;
    if (dollar !== null) { rightItems.push({ y, val: dollar }); continue; }

    if (x < 400) {
      descParts.push(t);
      if (y > maxDescY) maxDescY = y;
    }
  }
  flush(""); // discard any trailing partial block

  return { transactions, periodStart, periodEnd };
}

// ---- GECU PDF Print Export parser (second format) ----
// Detected by "G E C U |" header and a "CHECKING ..." account line — masked
// ("CHECKING ******7755") or the full unmasked number ("CHECKING 10961639 - 2000").
// Layout: date x≈79, description x≈154 (multi-line), amount x≈388, balance x≈490, all dollar values same y as date.

export function isGecuPdfExport(text: string): boolean {
  return text.includes("G E C U |") && /CHECKING \S/.test(text);
}

const GECU_PDF_SKIP = new Set([
  "DATE", "Description", "Amount", "Balance", "Posted", "Pending",
  "Available Balance", "G E C U |",
]);
const GECU_PDF_SKIP_RE = [
  /^CHECKING \S.*/i,
  /^G E C U \|/,
  /^Página \d+ de \d+$/,
  /^https?:\/\//,
  /^\d+ de \d+$/,
  /^\(\d+ days?\)$/,
];

export async function parseGecuPdfExport(
  file: File,
  statementId: string
): Promise<{
  transactions: Transaction[];
  periodStart: string;
  periodEnd: string;
  availableBalance?: number;
  postedBalance?: number;
}> {
  // @ts-expect-error -- load worker on main thread to avoid iOS Safari Worker issues
  globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "data:,";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  interface PageItem { text: string; x: number; y: number; pageNum: number }
  const allPageItems: PageItem[] = [];
  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const ti = item as { str: string; transform: number[] };
      if (!ti.str.trim()) continue;
      const x = Math.round(ti.transform[4]);
      const y = Math.round(ti.transform[5]);
      allPageItems.push({ text: ti.str, x, y, pageNum });
      textParts.push(ti.str);
    }
  }

  const fullText = textParts.join(" ");

  // Parse period: "Jul 1, 2026 - Jul 26, 2026" style
  const periodM = fullText.match(/([A-Za-z]+ \d{1,2}, \d{4})\s*-\s*([A-Za-z]+ \d{1,2}, \d{4})/);
  const periodStart = periodM ? (parseHistDate(periodM[1]) ?? "") : "";
  const periodEnd = periodM ? (parseHistDate(periodM[2]) ?? "") : "";

  const skipItem = (text: string) =>
    GECU_PDF_SKIP.has(text) || GECU_PDF_SKIP_RE.some((r) => r.test(text));

  const datePat = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}$/;

  // ---- Summary balances (page 1, above the DATE column header) ----
  // "Available Balance" sits at x≈92 with its value ~32pt below it; the posted
  // "Balance" label sits at x≈329 with its value directly below. The word
  // "Balance" also appears as a column header, so only look above that row.
  const page1 = allPageItems.filter((i) => i.pageNum === 1);
  const headerY = page1.find((i) => i.text.trim() === "DATE")?.y ?? 0;
  const summaryBalance = (label: string): number | undefined => {
    const lab = page1.find((i) => i.text.trim() === label && i.y > headerY);
    if (!lab) return undefined;
    const value = page1
      .filter(
        (i) =>
          i.y < lab.y &&
          lab.y - i.y <= 60 &&
          Math.abs(i.x - lab.x) <= 25 &&
          parseHistDollar(i.text) !== null
      )
      .sort((a, b) => b.y - a.y)[0];
    return value ? parseHistDollar(value.text) ?? undefined : undefined;
  };
  const availableBalance = summaryBalance("Available Balance");
  const postedBalance = summaryBalance("Balance");

  const transactions: Transaction[] = [];
  let seq = 0;
  // The "Pending" / "Posted" headers only appear where the section changes, so
  // the section carries over onto continuation pages.
  let carriedSection: "pending" | "posted" = "posted";

  // Process page by page to keep y-coordinates within page scope
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const rawPageItems = allPageItems.filter((i) => i.pageNum === pageNum);
    const pageItems = rawPageItems.filter((i) => !skipItem(i.text));

    // Section markers on this page, top to bottom
    const markers = rawPageItems
      .filter((i) => i.x < 110 && (i.text.trim() === "Pending" || i.text.trim() === "Posted"))
      .map((i) => ({ y: i.y, section: i.text.trim().toLowerCase() as "pending" | "posted" }))
      .sort((a, b) => b.y - a.y);

    // The section in force at a given y: the lowest marker still above it.
    const sectionAt = (y: number): "pending" | "posted" => {
      const above = markers.filter((m) => m.y > y);
      return above.length > 0 ? above[above.length - 1].section : carriedSection;
    };

    // Date items: x in [70,100], matching date pattern
    const dateItems = pageItems
      .filter((i) => i.x >= 70 && i.x <= 100 && datePat.test(i.text.trim()))
      .sort((a, b) => b.y - a.y); // top (high y) to bottom (low y)

    if (dateItems.length === 0) continue;

    for (let di = 0; di < dateItems.length; di++) {
      const { y: dateY, text: dateText } = dateItems[di];
      const dateStr = parseHistDate(dateText.trim());
      if (!dateStr) continue;

      // Y range: midpoint boundaries between consecutive dates
      const yMax = di === 0 ? dateY + 80 : (dateItems[di - 1].y + dateY) / 2;
      const yMin = di === dateItems.length - 1 ? dateY - 80 : (dateY + dateItems[di + 1].y) / 2;

      const inRange = pageItems.filter((i) => i.y >= yMin && i.y <= yMax);

      // Description: x in [140, 385], any y in range
      const descParts = inRange
        .filter((i) => i.x >= 140 && i.x <= 385)
        .sort((a, b) => b.y - a.y)
        .map((i) => i.text.trim())
        .filter(Boolean);

      // Amount: x in [370, 450], same y as date (±8)
      const amountItem = inRange.find((i) => i.x >= 370 && i.x <= 450 && Math.abs(i.y - dateY) <= 8);
      // Balance: x in [460, 560], same y as date (±8)
      const balanceItem = inRange.find((i) => i.x >= 460 && i.x <= 560 && Math.abs(i.y - dateY) <= 8);

      const amount = amountItem ? parseHistDollar(amountItem.text) : null;
      const balance = balanceItem ? parseHistDollar(balanceItem.text) : null;

      // Pending rows print "-" in the balance column — keep the charge, drop
      // the balance. Posted rows without a balance are malformed; skip those.
      const isPending = sectionAt(dateY) === "pending";
      if (amount === null) continue;
      if (!isPending && balance === null) continue;

      const description = descParts.join(" ").trim();
      if (!description) continue;

      transactions.push({
        id: uuidv4(),
        date: dateStr,
        description,
        amount,
        balance: isPending ? 0 : balance!,
        category: categorizeTransaction(description),
        statementId,
        seq: seq++,
        source: "statement",
        ...(isPending ? { pending: true } : {}),
      });
    }

    if (markers.length > 0) carriedSection = markers[markers.length - 1].section;
  }

  return { transactions, periodStart, periodEnd, availableBalance, postedBalance };
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
