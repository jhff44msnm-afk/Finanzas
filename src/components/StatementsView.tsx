"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, Landmark, AlertTriangle, Download, UploadCloud, Camera } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import type { Transaction, Statement, Account } from "@/lib/types";
import { parsePdfFile, detectStatementPeriod, isGecuHistoryPdf, parseGecuHistoryPdf, isGecuPdfExport, parseGecuPdfExport } from "@/lib/pdf-parser";
import { parseBbvaPdf, isBbvaPdf } from "@/lib/bbva-parser";
import { parseScreenshot, fileToBase64, resolveMediaType, type ExtractedTransaction, type AiProvider } from "@/lib/screenshot-parser";
import { categorizeTransaction } from "@/lib/categories";

interface PendingUpload {
  statement: Statement;
  taggedTransactions: Transaction[];
  conflictingManualIds: string[];
  successMsg: string;
}

export default function StatementsView() {
  const { statements, accounts, activeAccountId, transactions } = useAppState();
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const filteredStatements =
    activeAccountId === "all"
      ? statements
      : statements.filter((s) => s.accountId === activeAccountId || !s.accountId);

  const finalizeUpload = useCallback(
    (pending: PendingUpload, deleteManuals: boolean) => {
      if (deleteManuals && pending.conflictingManualIds.length > 0) {
        dispatch({ type: "REMOVE_TRANSACTIONS", payload: pending.conflictingManualIds });
      }
      dispatch({ type: "ADD_STATEMENT", payload: pending.statement });
      dispatch({ type: "ADD_TRANSACTIONS", payload: pending.taggedTransactions });
      setSuccess(pending.successMsg);
      setPendingUpload(null);
    },
    [dispatch]
  );

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file.");
        return;
      }
      setUploading(true);
      setError(null);
      setSuccess(null);
      setPendingUpload(null);

      try {
        const statementId = uuidv4();

        const arrayBuffer = await file.arrayBuffer();

        // @ts-expect-error -- load worker on main thread
        globalThis.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "data:,";
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        let sampleText = "";
        for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          sampleText += content.items
            .filter((item) => "str" in item)
            .map((item) => (item as { str: string }).str)
            .join(" ");
        }

        const isBbva = isBbvaPdf(sampleText);
        const isGecuHistory = isGecuHistoryPdf(sampleText);
        const isGecuExport = !isGecuHistory && isGecuPdfExport(sampleText);

        if (isGecuExport) {
          const { transactions: parsed, periodStart, periodEnd } = await parseGecuPdfExport(file, statementId);

          if (parsed.length === 0) {
            setError("No transactions found in this GECU PDF export.");
            setUploading(false);
            return;
          }

          let targetAccountId = activeAccountId !== "all" ? activeAccountId : undefined;
          if (!targetAccountId) {
            const existing = accounts.find((a) => a.type === "us");
            if (existing) {
              targetAccountId = existing.id;
            } else {
              const newAccount = {
                id: uuidv4(),
                name: "GECU Checking",
                bankName: "GECU Federal Credit Union",
                type: "us" as const,
                currency: "USD" as const,
              };
              dispatch({ type: "ADD_ACCOUNT", payload: newAccount });
              targetAccountId = newAccount.id;
              if (accounts.length === 0) {
                dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: newAccount.id });
              }
            }
          }

          const taggedTransactions = parsed.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          const statement: Statement = {
            id: statementId,
            fileName: file.name,
            uploadDate: new Date().toISOString().slice(0, 10),
            periodStart,
            periodEnd,
            transactionCount: parsed.length,
            accountId: targetAccountId,
          };

          const conflictingManualIds = transactions
            .filter(
              (t) =>
                t.source === "manual" &&
                (t.accountId === targetAccountId || !t.accountId) &&
                t.date >= periodStart &&
                t.date <= periodEnd
            )
            .map((t) => t.id);

          const pending: PendingUpload = {
            statement,
            taggedTransactions,
            conflictingManualIds,
            successMsg: `Imported ${parsed.length} transactions from GECU PDF export "${file.name}".`,
          };

          if (conflictingManualIds.length > 0) {
            setPendingUpload(pending);
          } else {
            finalizeUpload(pending, false);
          }
        } else if (isGecuHistory) {
          const { transactions: parsed, periodStart, periodEnd } = await parseGecuHistoryPdf(file, statementId);

          if (parsed.length === 0) {
            setError("No transactions found in this GECU account history export.");
            setUploading(false);
            return;
          }

          let targetAccountId = activeAccountId !== "all" ? activeAccountId : undefined;
          if (!targetAccountId) {
            const existing = accounts.find((a) => a.type === "us");
            if (existing) {
              targetAccountId = existing.id;
            } else {
              const newAccount = {
                id: uuidv4(),
                name: "GECU Checking",
                bankName: "GECU Federal Credit Union",
                type: "us" as const,
                currency: "USD" as const,
              };
              dispatch({ type: "ADD_ACCOUNT", payload: newAccount });
              targetAccountId = newAccount.id;
              if (accounts.length === 0) {
                dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: newAccount.id });
              }
            }
          }

          const taggedTransactions = parsed.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          const statement: Statement = {
            id: statementId,
            fileName: file.name,
            uploadDate: new Date().toISOString().slice(0, 10),
            periodStart,
            periodEnd,
            transactionCount: parsed.length,
            accountId: targetAccountId,
          };

          const conflictingManualIds = transactions
            .filter(
              (t) =>
                t.source === "manual" &&
                (t.accountId === targetAccountId || !t.accountId) &&
                t.date >= periodStart &&
                t.date <= periodEnd
            )
            .map((t) => t.id);

          const pending: PendingUpload = {
            statement,
            taggedTransactions,
            conflictingManualIds,
            successMsg: `Imported ${parsed.length} transactions from GECU account history "${file.name}".`,
          };

          if (conflictingManualIds.length > 0) {
            setPendingUpload(pending);
          } else {
            finalizeUpload(pending, false);
          }
        } else if (isBbva) {
          const { transactions: parsed, accountInfo } = await parseBbvaPdf(file, statementId);

          if (parsed.length === 0) {
            setError("No transactions found in this BBVA statement.");
            setUploading(false);
            return;
          }

          let targetAccountId = activeAccountId !== "all" ? activeAccountId : undefined;

          if (!targetAccountId) {
            const existing = accounts.find(
              (a) => a.type === "mx" && a.cuentaNumber === accountInfo.cuentaNumber
            );
            if (existing) {
              targetAccountId = existing.id;
            } else {
              const newAccount = {
                id: uuidv4(),
                name: "BBVA Cuenta",
                bankName: "BBVA México",
                type: "mx" as const,
                currency: "MXN" as const,
                cuentaNumber: accountInfo.cuentaNumber || undefined,
                clabeNumber: accountInfo.clabeNumber || undefined,
              };
              dispatch({ type: "ADD_ACCOUNT", payload: newAccount });
              targetAccountId = newAccount.id;
              if (accounts.length === 0) {
                dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: newAccount.id });
              }
            }
          }

          const taggedTransactions = parsed.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          const statement: Statement = {
            id: statementId,
            fileName: file.name,
            uploadDate: new Date().toISOString().slice(0, 10),
            periodStart: accountInfo.periodStart,
            periodEnd: accountInfo.periodEnd,
            transactionCount: parsed.length,
            accountId: targetAccountId,
          };

          const conflictingManualIds = transactions
            .filter(
              (t) =>
                t.source === "manual" &&
                (t.accountId === targetAccountId || !t.accountId) &&
                t.date >= accountInfo.periodStart &&
                t.date <= accountInfo.periodEnd
            )
            .map((t) => t.id);

          const pending: PendingUpload = {
            statement,
            taggedTransactions,
            conflictingManualIds,
            successMsg: `Imported ${parsed.length} BBVA transactions from "${file.name}".`,
          };

          if (conflictingManualIds.length > 0) {
            setPendingUpload(pending);
          } else {
            finalizeUpload(pending, false);
          }
        } else {
          const { transactions: parsed, text, year } = await parsePdfFile(file, statementId);

          if (parsed.length === 0) {
            setError("Could not parse any transactions from this PDF.");
            setUploading(false);
            return;
          }

          const period = detectStatementPeriod(text, year);

          let targetAccountId = activeAccountId !== "all" ? activeAccountId : undefined;

          if (!targetAccountId) {
            const existing = accounts.find((a) => a.type === "us");
            if (existing) {
              targetAccountId = existing.id;
            } else {
              const newAccount = {
                id: uuidv4(),
                name: "GECU Checking",
                bankName: "GECU Federal Credit Union",
                type: "us" as const,
                currency: "USD" as const,
              };
              dispatch({ type: "ADD_ACCOUNT", payload: newAccount });
              targetAccountId = newAccount.id;
              if (accounts.length === 0) {
                dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: newAccount.id });
              }
            }
          }

          const taggedTransactions = parsed.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          const statement: Statement = {
            id: statementId,
            fileName: file.name,
            uploadDate: new Date().toISOString().slice(0, 10),
            periodStart: period.start,
            periodEnd: period.end,
            transactionCount: parsed.length,
            accountId: targetAccountId,
          };

          const conflictingManualIds = transactions
            .filter(
              (t) =>
                t.source === "manual" &&
                (t.accountId === targetAccountId || !t.accountId) &&
                t.date >= period.start &&
                t.date <= period.end
            )
            .map((t) => t.id);

          const pending: PendingUpload = {
            statement,
            taggedTransactions,
            conflictingManualIds,
            successMsg: `Imported ${parsed.length} transactions from "${file.name}".`,
          };

          if (conflictingManualIds.length > 0) {
            setPendingUpload(pending);
          } else {
            finalizeUpload(pending, false);
          }
        }
      } catch (err) {
        setError(`Failed to process PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setUploading(false);
      }
    },
    [dispatch, accounts, activeAccountId, transactions, finalizeUpload]
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        await processFile(file);
      }
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Snapshot FileList into a plain array before clearing the input —
    // iOS Safari invalidates the live FileList as soon as value is reset.
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length > 0) processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const removeStatement = (id: string) => {
    dispatch({ type: "REMOVE_STATEMENT", payload: id });
    setSuccess(null);
    setError(null);
  };

  const getAccountForStatement = (stmt: { accountId?: string }) => {
    if (!stmt.accountId) return null;
    return accounts.find((a) => a.id === stmt.accountId) ?? null;
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-[#2D2D2D]">Uploads</h2>

      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          dragOver
            ? "border-[#7C8C6E] bg-[#7C8C6E]/5"
            : "border-[#E8E2DA] hover:border-[#B5AFA6]"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={36} className="text-[#7C8C6E] animate-spin" />
            <p className="text-[#8B8578] text-sm">Processing your statement...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#7C8C6E]/10 flex items-center justify-center">
              <Upload size={24} className="text-[#7C8C6E]" />
            </div>
            <div>
              <p className="text-[#2D2D2D] font-medium text-sm">
                Drop your bank statement PDFs here
              </p>
              <p className="text-[#B5AFA6] text-xs mt-1">Upload one or more files &middot; GECU &amp; BBVA supported</p>
            </div>
            <label className="mt-1 bg-[#7C8C6E] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] cursor-pointer transition-colors">
              Select PDFs
              <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-[#C4756E]/8 border border-[#C4756E]/20 text-[#C4756E] px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-[#6B9B7A]/8 border border-[#6B9B7A]/20 text-[#6B9B7A] px-4 py-3 rounded-xl text-sm">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {pendingUpload && (
        <div className="bg-white rounded-2xl border border-[#D4A76A]/40 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-[#D4A76A] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#2D2D2D]">
                {pendingUpload.conflictingManualIds.length} manual transaction{pendingUpload.conflictingManualIds.length !== 1 ? "s" : ""} found in this statement period
              </p>
              <p className="text-xs text-[#8B8578] mt-0.5">
                These may duplicate entries already in the statement. Delete them to keep things clean, or keep both.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => finalizeUpload(pendingUpload, true)}
              className="flex-1 bg-[#C4756E] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#B36358] transition-colors"
            >
              Delete {pendingUpload.conflictingManualIds.length} Manual {pendingUpload.conflictingManualIds.length !== 1 ? "Entries" : "Entry"}
            </button>
            <button
              onClick={() => finalizeUpload(pendingUpload, false)}
              className="flex-1 bg-[#F5F0EB] text-[#5C5549] px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#EDE7DF] transition-colors"
            >
              Keep Both
            </button>
          </div>
        </div>
      )}

      {filteredStatements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#2D2D2D]">Uploaded Statements</h3>
          {filteredStatements.map((stmt) => {
            const acc = getAccountForStatement(stmt);
            return (
              <div
                key={stmt.id}
                className="bg-white rounded-2xl border border-[#E8E2DA] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    acc?.type === "mx" ? "bg-[#006847]/10" : "bg-[#7C8C6E]/10"
                  }`}>
                    {acc?.type === "mx" ? (
                      <Landmark size={20} className="text-[#006847]" />
                    ) : (
                      <FileText size={20} className="text-[#7C8C6E]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D2D2D] text-sm truncate">{stmt.fileName}</p>
                    <div className="flex flex-wrap gap-x-3 text-xs text-[#B5AFA6] mt-0.5">
                      {acc && (
                        <span className={`font-medium ${acc.type === "mx" ? "text-[#006847]" : "text-[#7C8C6E]"}`}>
                          {acc.name}
                        </span>
                      )}
                      {stmt.periodStart && stmt.periodEnd && (
                        <span>{stmt.periodStart} to {stmt.periodEnd}</span>
                      )}
                      <span>{stmt.transactionCount} transactions</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeStatement(stmt.id)}
                  className="text-[#B5AFA6] hover:text-[#C4756E] transition-colors p-2 rounded-lg hover:bg-[#C4756E]/10 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <h3 className="text-xs font-semibold text-[#8B8578] uppercase tracking-wider mb-2">
          Supported Formats
        </h3>
        <p className="text-xs text-[#B5AFA6] leading-relaxed">
          GECU Federal Credit Union (USD) and BBVA México (MXN) statements in PDF format.
          The parser auto-detects the format — official GECU statements, GECU account history web exports, GECU PDF print exports, and BBVA México statements are all supported.
          You can upload multiple files at once.
        </p>
      </div>

      <ScreenshotImport
        dispatch={dispatch}
        accounts={accounts}
        activeAccountId={activeAccountId}
      />

      <DataBackup dispatch={dispatch} onMessage={(msg, isError) => {
        if (isError) { setError(msg); setSuccess(null); }
        else { setSuccess(msg); setError(null); }
      }} />
    </div>
  );
}

const CLAUDE_KEY = "finanzas-anthropic-key";
const GEMINI_KEY = "finanzas-gemini-key";
const AI_PROVIDER = "finanzas-ai-provider";

function ScreenshotImport({
  dispatch,
  accounts,
  activeAccountId,
}: {
  dispatch: ReturnType<typeof useAppDispatch>;
  accounts: Account[];
  activeAccountId: string;
}) {
  const [provider, setProvider] = useState<AiProvider>(() =>
    (typeof window !== "undefined" ? localStorage.getItem(AI_PROVIDER) : null) as AiProvider ?? "gemini"
  );
  const [claudeKey, setClaudeKey] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(CLAUDE_KEY) ?? "") : ""
  );
  const [geminiKey, setGeminiKey] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(GEMINI_KEY) ?? "") : ""
  );
  const [keyInput, setKeyInput] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedTransaction[] | null>(null);
  const [imageName, setImageName] = useState("");
  const [targetAccountId, setTargetAccountId] = useState(() =>
    activeAccountId !== "all" ? activeAccountId : (accounts[0]?.id ?? "")
  );
  const [imgDragOver, setImgDragOver] = useState(false);

  const activeKey = provider === "gemini" ? geminiKey : claudeKey;
  const storageKey = provider === "gemini" ? GEMINI_KEY : CLAUDE_KEY;

  const switchProvider = (p: AiProvider) => {
    setProvider(p);
    localStorage.setItem(AI_PROVIDER, p);
    setEditingKey(false);
    setKeyInput("");
    setError(null);
    setSuccess(null);
    setExtracted(null);
  };

  const saveKey = (key: string) => {
    localStorage.setItem(storageKey, key);
    if (provider === "gemini") setGeminiKey(key);
    else setClaudeKey(key);
    setEditingKey(false);
    setKeyInput("");
  };

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen (JPG, PNG o WEBP).");
      return;
    }
    setProcessing(true);
    setError(null);
    setSuccess(null);
    setExtracted(null);
    setImageName(file.name);
    try {
      const base64 = await fileToBase64(file);
      const mediaType = resolveMediaType(file);
      const txns = await parseScreenshot(base64, mediaType, activeKey, provider);
      if (txns.length === 0) {
        setError("No se encontraron transacciones. Intenta con un screenshot más claro.");
        return;
      }
      setExtracted(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la imagen");
    } finally {
      setProcessing(false);
    }
  };

  const confirmImport = () => {
    if (!extracted || extracted.length === 0) return;
    const statementId = uuidv4();
    const today = new Date().toISOString().slice(0, 10);
    const validDates = extracted.map((t) => t.date).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    const periodStart = validDates[0] ?? today;
    const periodEnd = validDates[validDates.length - 1] ?? today;
    const targetId = targetAccountId || undefined;

    const taggedTransactions: Transaction[] = extracted.map((t, i) => ({
      id: uuidv4(),
      date: t.date || today,
      description: t.description,
      amount: t.amount,
      balance: t.balance ?? 0,
      category: categorizeTransaction(t.description),
      statementId,
      seq: i,
      accountId: targetId,
      source: "statement" as const,
    }));

    const statement: Statement = {
      id: statementId,
      fileName: imageName || "screenshot",
      uploadDate: today,
      periodStart,
      periodEnd,
      transactionCount: extracted.length,
      accountId: targetId,
    };

    dispatch({ type: "ADD_STATEMENT", payload: statement });
    dispatch({ type: "ADD_TRANSACTIONS", payload: taggedTransactions });
    setSuccess(`${extracted.length} transacciones importadas.`);
    setExtracted(null);
    setImageName("");
  };

  const providerLabel = provider === "gemini" ? "Google Gemini" : "Anthropic Claude";
  const keyPlaceholder = provider === "gemini" ? "AIza..." : "sk-ant-...";
  const keyPrefix = provider === "gemini"
    ? `AIza···${activeKey.slice(-4)}`
    : `sk-ant-···${activeKey.slice(-4)}`;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#9B7EB5]/10 flex items-center justify-center shrink-0">
          <Camera size={16} className="text-[#9B7EB5]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2D2D2D]">AI Screenshot Import</h3>
          <p className="text-xs text-[#B5AFA6]">Lee transacciones de cualquier screenshot bancario</p>
        </div>
      </div>

      {/* Provider toggle */}
      <div className="flex bg-[#F5F0EB] rounded-xl p-0.5 gap-0.5">
        {(["gemini", "claude"] as AiProvider[]).map((p) => (
          <button
            key={p}
            onClick={() => switchProvider(p)}
            className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
              provider === p
                ? "bg-white text-[#2D2D2D] shadow-sm"
                : "text-[#8B8578] hover:text-[#5C5549]"
            }`}
          >
            {p === "gemini" ? "Google Gemini" : "Claude"}
          </button>
        ))}
      </div>

      {/* Key info badge */}
      {provider === "gemini" && !activeKey && (
        <p className="text-[11px] text-[#6B9B7A] bg-[#6B9B7A]/8 rounded-lg px-3 py-1.5 leading-relaxed">
          ✓ Gratis — consigue tu key en <strong>aistudio.google.com</strong> con tu cuenta Google
        </p>
      )}

      {/* API key setup */}
      {!activeKey || editingKey ? (
        <div className="space-y-2">
          <p className="text-xs text-[#8B8578]">
            Ingresa tu API key de <strong>{providerLabel}</strong>. Se guarda solo en este navegador.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && keyInput.trim() && saveKey(keyInput.trim())}
              placeholder={keyPlaceholder}
              className="flex-1 text-xs border border-[#E8E2DA] rounded-xl px-3 py-2 outline-none focus:border-[#9B7EB5] bg-[#F5F0EB]"
            />
            <button
              onClick={() => { if (keyInput.trim()) saveKey(keyInput.trim()); }}
              disabled={!keyInput.trim()}
              className="bg-[#9B7EB5] text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#8B6EA5] disabled:opacity-40 transition-colors"
            >
              Guardar
            </button>
            {editingKey && (
              <button
                onClick={() => { setEditingKey(false); setKeyInput(""); }}
                className="text-[#B5AFA6] px-2 py-2 rounded-xl text-xs hover:bg-[#F5F0EB] transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8B8578]">
              Key: <span className="font-mono text-[#2D2D2D]">{keyPrefix}</span>
            </span>
            <button
              onClick={() => { setEditingKey(true); setKeyInput(""); }}
              className="text-[#9B7EB5] hover:underline"
            >
              Cambiar
            </button>
          </div>

          {/* Image drop zone */}
          {!extracted && !processing && (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                imgDragOver ? "border-[#9B7EB5] bg-[#9B7EB5]/5" : "border-[#E8E2DA] hover:border-[#B5AFA6]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setImgDragOver(false); const f = e.dataTransfer.files[0]; if (f) processImage(f); }}
            >
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Camera size={22} className="text-[#9B7EB5]/50" />
                <div>
                  <p className="text-sm font-medium text-[#2D2D2D]">Sube un screenshot aquí</p>
                  <p className="text-xs text-[#B5AFA6] mt-0.5">o toca para seleccionar &middot; JPG, PNG, WEBP</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processImage(f); e.target.value = ""; }}
                />
              </label>
            </div>
          )}

          {processing && (
            <div className="flex flex-col items-center gap-3 py-5">
              <Loader2 size={26} className="text-[#9B7EB5] animate-spin" />
              <p className="text-sm text-[#8B8578]">Leyendo &ldquo;{imageName}&rdquo;&hellip;</p>
            </div>
          )}

          {extracted && !processing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2D2D2D]">
                  {extracted.length} transacci{extracted.length !== 1 ? "ones" : "ón"} encontrada{extracted.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => { setExtracted(null); setImageName(""); setError(null); }}
                  className="text-xs text-[#B5AFA6] hover:text-[#C4756E] transition-colors"
                >
                  Descartar
                </button>
              </div>

              {accounts.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8B8578] shrink-0">Importar a:</span>
                  <select
                    value={targetAccountId}
                    onChange={(e) => setTargetAccountId(e.target.value)}
                    className="flex-1 text-xs border border-[#E8E2DA] rounded-lg px-2 py-1.5 bg-[#F5F0EB] outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                {extracted.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F5F0EB] gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#2D2D2D] truncate">{t.description || "—"}</p>
                      <p className="text-[11px] text-[#B5AFA6]">{t.date}</p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${t.amount >= 0 ? "text-[#6B9B7A]" : "text-[#2D2D2D]"}`}>
                      {t.amount >= 0 ? "+" : ""}{Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={confirmImport}
                className="w-full bg-[#9B7EB5] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B6EA5] transition-colors"
              >
                Importar {extracted.length} transacci{extracted.length !== 1 ? "ones" : "ón"}
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-[#C4756E] text-xs bg-[#C4756E]/8 px-3 py-2 rounded-lg border border-[#C4756E]/20">
              <AlertCircle size={13} className="shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-[#6B9B7A] text-xs bg-[#6B9B7A]/8 px-3 py-2 rounded-lg border border-[#6B9B7A]/20">
              <CheckCircle2 size={13} className="shrink-0" />
              {success}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DataBackup({
  dispatch,
  onMessage,
}: {
  dispatch: ReturnType<typeof useAppDispatch>;
  onMessage: (msg: string, isError: boolean) => void;
}) {
  const STORAGE_KEY = "finanzas-app-state";

  const handleExport = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) { onMessage("No data to export.", true); return; }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onMessage("Backup downloaded.", false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed || typeof parsed !== "object") throw new Error("Invalid format");
        dispatch({ type: "LOAD_STATE", payload: parsed });
        onMessage("Backup restored successfully.", false);
      } catch {
        onMessage("Invalid backup file — could not restore.", true);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
      <h3 className="text-xs font-semibold text-[#8B8578] uppercase tracking-wider">
        Data Backup
      </h3>
      <p className="text-xs text-[#B5AFA6] leading-relaxed">
        Export all your data to a JSON file so you can restore it later, share it between devices, or keep a local copy.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1.5 bg-[#7C8C6E]/10 text-[#7C8C6E] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7C8C6E]/20 transition-colors"
        >
          <Download size={14} />
          Export Backup
        </button>
        <label className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5F0EB] text-[#5C5549] py-2.5 rounded-xl text-xs font-semibold hover:bg-[#EDE7DF] transition-colors cursor-pointer">
          <UploadCloud size={14} />
          Import Backup
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
