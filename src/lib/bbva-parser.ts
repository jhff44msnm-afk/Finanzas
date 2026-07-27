import { categorizeTransaction } from "./categories";
import { v4 as uuidv4 } from "uuid";
import type { Transaction } from "./types";

interface TextItem {
  text: string;
  x: number;
  y: number;
}

const MONTH_MAP: Record<string, string> = {
  ENE: "01", FEB: "02", MAR: "03", ABR: "04",
  MAY: "05", JUN: "06", JUL: "07", AGO: "08",
  SEP: "09", OCT: "10", NOV: "11", DIC: "12",
};

function parseBbvaAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
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

interface BbvaAccountInfo {
  cuentaNumber: string;
  clabeNumber: string;
  periodStart: string;
  periodEnd: string;
  year: number;
}

function extractAccountInfo(fullText: string): BbvaAccountInfo {
  const info: BbvaAccountInfo = {
    cuentaNumber: "",
    clabeNumber: "",
    periodStart: "",
    periodEnd: "",
    year: new Date().getFullYear(),
  };

  const cuentaMatch = fullText.match(/No\.\s*de\s*Cuenta\s+(\d+)/i);
  if (cuentaMatch) info.cuentaNumber = cuentaMatch[1];

  const clabeMatch = fullText.match(/No\.\s*Cuenta\s*CLABE\s+([\d\s]+)/i);
  if (clabeMatch) info.clabeNumber = clabeMatch[1].trim();

  const periodMatch = fullText.match(
    /DEL\s+(\d{2})\/(\d{2})\/(\d{4})\s+AL\s+(\d{2})\/(\d{2})\/(\d{4})/i
  );
  if (periodMatch) {
    info.periodStart = `${periodMatch[3]}-${periodMatch[2]}-${periodMatch[1]}`;
    info.periodEnd = `${periodMatch[6]}-${periodMatch[5]}-${periodMatch[4]}`;
    info.year = parseInt(periodMatch[6]);
  }

  return info;
}

interface BbvaParsedLine {
  dateOper: string;
  dateLiq: string;
  description: string;
  cargo: number | null;
  abono: number | null;
  saldoOper: number | null;
  saldoLiq: number | null;
}

function parseBbvaTransactionLine(
  items: TextItem[],
  year: number,
): BbvaParsedLine | null {
  const sorted = items.sort((a, b) => a.x - b.x);
  const nonEmpty = sorted.filter((i) => i.text.trim().length > 0);
  if (nonEmpty.length < 2) return null;

  const datePattern = /^(\d{2})\/([A-Z]{3})$/;
  const firstMatch = nonEmpty[0].text.match(datePattern);
  if (!firstMatch) return null;

  const month1 = MONTH_MAP[firstMatch[2]];
  if (!month1) return null;

  let dateLiq = "";
  let descStartIdx = 1;

  if (nonEmpty.length > 1) {
    const secondMatch = nonEmpty[1].text.match(datePattern);
    if (secondMatch) {
      const month2 = MONTH_MAP[secondMatch[2]];
      if (month2) {
        dateLiq = `${year}-${month2}-${secondMatch[1]}`;
        descStartIdx = 2;
      }
    }
  }

  const dateOper = `${year}-${month1}-${firstMatch[1]}`;
  if (!dateLiq) dateLiq = dateOper;

  const descParts: string[] = [];
  const amounts: { value: number; x: number }[] = [];

  for (let i = descStartIdx; i < nonEmpty.length; i++) {
    const text = nonEmpty[i].text.trim();
    const x = nonEmpty[i].x;

    if (x >= 350) {
      const cleaned = text.replace(/,/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        amounts.push({ value: num, x });
      }
    } else {
      descParts.push(text);
    }
  }

  if (descParts.length === 0) return null;

  let cargo: number | null = null;
  let abono: number | null = null;
  let saldoOper: number | null = null;
  let saldoLiq: number | null = null;

  // Column thresholds: CARGO x<415, ABONO 415<=x<470, SALDO x>=470
  const CARGO_MAX = 415;
  const SALDO_MIN = 470;

  const amountItems = amounts.filter((a) => a.x < SALDO_MIN);
  const saldoItems = amounts.filter((a) => a.x >= SALDO_MIN);

  if (saldoItems.length >= 2) {
    saldoOper = saldoItems[0].value;
    saldoLiq = saldoItems[1].value;
  } else if (saldoItems.length === 1) {
    saldoLiq = saldoItems[0].value;
  }

  if (amountItems.length >= 1) {
    const first = amountItems[0];
    if (first.x < CARGO_MAX) {
      cargo = first.value;
    } else {
      abono = first.value;
    }
  }

  return {
    dateOper,
    dateLiq,
    description: descParts.join(" ").trim(),
    cargo,
    abono,
    saldoOper,
    saldoLiq,
  };
}

export async function parseBbvaPdf(
  file: File,
  statementId: string,
): Promise<{
  transactions: Transaction[];
  text: string;
  accountInfo: BbvaAccountInfo;
}> {
  // @ts-expect-error -- load worker on main thread
  globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "data:,";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const allText: string[] = [];
  const pageLines: TextItem[][][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: TextItem[] = content.items
      .filter((item) => "str" in item)
      .map((item) => {
        const ti = item as { str: string; transform: number[] };
        return { text: ti.str, x: ti.transform[4], y: ti.transform[5] };
      });

    const lines = groupIntoLines(items);
    pageLines.push(lines);

    for (const lineItems of lines) {
      const lineText = lineItems
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join(" ");
      allText.push(lineText);
    }
  }

  const fullText = allText.join("\n");
  const accountInfo = extractAccountInfo(fullText);

  const transactions: Transaction[] = [];
  let seqCounter = 0;
  let lastBalance = 0;

  for (const lines of pageLines) {
    for (const lineItems of lines) {
      const parsed = parseBbvaTransactionLine(lineItems, accountInfo.year);
      if (!parsed) continue;
      if (!parsed.cargo && !parsed.abono) continue;

      const amount = parsed.abono
        ? parsed.abono
        : parsed.cargo
          ? -parsed.cargo
          : 0;

      if (amount === 0) continue;

      const balance = parsed.saldoLiq ?? parsed.saldoOper ?? lastBalance + amount;
      lastBalance = balance;

      transactions.push({
        id: uuidv4(),
        date: parsed.dateOper,
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

  return { transactions, text: fullText, accountInfo };
}

export function isBbvaPdf(text: string): boolean {
  return (
    text.includes("BBVA") &&
    (text.includes("Estado de Cuenta") || text.includes("MONEDA NACIONAL"))
  );
}
