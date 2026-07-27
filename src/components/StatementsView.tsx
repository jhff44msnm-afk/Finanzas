"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, Camera, Download, UploadCloud } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import type { Transaction, Statement } from "@/lib/types";
import { parsePdfFile, detectStatementPeriod } from "@/lib/pdf-parser";
import { parseScreenshot, fileToBase64, resolveMediaType, type ExtractedTransaction } from "@/lib/screenshot-parser";
import { categorizeTransaction } from "@/lib/categories";

export default function StatementsView() {
  const { statements } = useAppState();
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file.");
        return;
      }
      setUploading(true);
      setError(null);
      setSuccess(null);

      try {
        const statementId = uuidv4();
        const { transactions, text } = await parsePdfFile(file, statementId);

        if (transactions.length === 0) {
          setError("Could not parse any transactions from this PDF. Make sure it is a bank statement.");
          setUploading(false);
          return;
        }

        const yearMatch = text.match(/Statement\s+from\s+\d{2}\/\d{2}\/(\d{2,4})/i);
        let year = new Date().getFullYear();
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
          if (year < 100) year += 2000;
        }
        const period = detectStatementPeriod(text, year);

        dispatch({
          type: "ADD_STATEMENT",
          payload: {
            id: statementId,
            fileName: file.name,
            uploadDate: new Date().toISOString().slice(0, 10),
            periodStart: period.start,
            periodEnd: period.end,
            transactionCount: transactions.length,
          },
        });

        dispatch({ type: "ADD_TRANSACTIONS", payload: transactions });

        setSuccess(`Imported ${transactions.length} transactions from "${file.name}".`);
      } catch (err) {
        setError(`Failed to process PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setUploading(false);
      }
    },
    [dispatch]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const removeStatement = (id: string) => {
    dispatch({ type: "REMOVE_STATEMENT", payload: id });
    setSuccess(null);
    setError(null);
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
                Drop your bank statement PDF here
              </p>
              <p className="text-[#B5AFA6] text-xs mt-1">or tap to browse files</p>
            </div>
            <label className="mt-1 bg-[#7C8C6E] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] cursor-pointer transition-colors">
              Select PDF
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
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

      {statements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[#2D2D2D]">Uploaded Statements</h3>
          {statements.map((stmt) => (
            <div
              key={stmt.id}
              className="bg-white rounded-2xl border border-[#E8E2DA] p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[#7C8C6E]/10 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-[#7C8C6E]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[#2D2D2D] text-sm truncate">{stmt.fileName}</p>
                  <div className="flex flex-wrap gap-x-3 text-xs text-[#B5AFA6] mt-0.5">
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
          ))}
        </div>
      )}

      <ScreenshotImport dispatch={dispatch} />

      <DataBackup dispatch={dispatch} onMessage={(msg, isError) => {
        if (isError) { setError(msg); setSuccess(null); }
        else { setSuccess(msg); setError(null); }
      }} />

      <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4">
        <h3 className="text-xs font-semibold text-[#8B8578] uppercase tracking-wider mb-2">
          Supported Format
        </h3>
        <p className="text-xs text-[#B5AFA6] leading-relaxed">
          Currently supports GECU Federal Credit Union member statements in PDF format.
          The parser reads Date, Description, Amount, and Balance columns automatically.
        </p>
      </div>
    </div>
  );
}

const API_KEY_STORAGE = "finanzas-anthropic-key";

function ScreenshotImport({
  dispatch,
}: {
  dispatch: ReturnType<typeof useAppDispatch>;
}) {
  const [apiKey, setApiKey] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(API_KEY_STORAGE) ?? "") : ""
  );
  const [keyInput, setKeyInput] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedTransaction[] | null>(null);
  const [imageName, setImageName] = useState("");
  const [imgDragOver, setImgDragOver] = useState(false);

  const saveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
    setEditingKey(false);
    setKeyInput("");
  };

  const processImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, or WEBP).");
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
      const txns = await parseScreenshot(base64, mediaType, apiKey);
      if (txns.length === 0) {
        setError("No transactions found. Try a clearer or closer screenshot.");
        return;
      }
      setExtracted(txns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
    } finally {
      setProcessing(false);
    }
  };

  const confirmImport = () => {
    if (!extracted || extracted.length === 0) return;
    const statementId = uuidv4();
    const today = new Date().toISOString().slice(0, 10);
    const validDates = extracted
      .map((t) => t.date)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    const periodStart = validDates[0] ?? today;
    const periodEnd = validDates[validDates.length - 1] ?? today;

    const taggedTransactions: Transaction[] = extracted.map((t, i) => ({
      id: uuidv4(),
      date: t.date || today,
      description: t.description,
      amount: t.amount,
      balance: t.balance ?? 0,
      category: categorizeTransaction(t.description),
      statementId,
      seq: i,
    }));

    const statement: Statement = {
      id: statementId,
      fileName: imageName || "screenshot",
      uploadDate: today,
      periodStart,
      periodEnd,
      transactionCount: extracted.length,
    };

    dispatch({ type: "ADD_STATEMENT", payload: statement });
    dispatch({ type: "ADD_TRANSACTIONS", payload: taggedTransactions });
    setSuccess(`Imported ${extracted.length} transactions.`);
    setExtracted(null);
    setImageName("");
  };

  const handleImgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setImgDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#9B7EB5]/10 flex items-center justify-center shrink-0">
          <Camera size={16} className="text-[#9B7EB5]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#2D2D2D]">AI Screenshot Import</h3>
          <p className="text-xs text-[#B5AFA6]">Read transactions from any bank screenshot</p>
        </div>
      </div>

      {/* API Key setup */}
      {!apiKey || editingKey ? (
        <div className="space-y-2">
          <p className="text-xs text-[#8B8578] leading-relaxed">
            Enter your Anthropic API key to enable AI-powered screenshot reading.
            Your key is stored only in this browser and never sent to our servers.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && keyInput.trim() && saveApiKey(keyInput.trim())}
              placeholder="sk-ant-..."
              className="flex-1 text-xs border border-[#E8E2DA] rounded-xl px-3 py-2 outline-none focus:border-[#9B7EB5] bg-[#F5F0EB]"
            />
            <button
              onClick={() => { if (keyInput.trim()) saveApiKey(keyInput.trim()); }}
              disabled={!keyInput.trim()}
              className="bg-[#9B7EB5] text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#8B6EA5] disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            {editingKey && (
              <button
                onClick={() => { setEditingKey(false); setKeyInput(""); }}
                className="text-[#B5AFA6] px-2 py-2 rounded-xl text-xs hover:bg-[#F5F0EB] transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8B8578]">
              API key: <span className="font-mono text-[#2D2D2D]">sk-ant-···{apiKey.slice(-4)}</span>
            </span>
            <button
              onClick={() => { setEditingKey(true); setKeyInput(""); }}
              className="text-[#9B7EB5] hover:underline"
            >
              Change
            </button>
          </div>

          {/* Image drop zone */}
          {!extracted && !processing && (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                imgDragOver
                  ? "border-[#9B7EB5] bg-[#9B7EB5]/5"
                  : "border-[#E8E2DA] hover:border-[#B5AFA6]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setImgDragOver(true); }}
              onDragLeave={() => setImgDragOver(false)}
              onDrop={handleImgDrop}
            >
              <label className="flex flex-col items-center gap-2 cursor-pointer">
                <Camera size={22} className="text-[#9B7EB5]/50" />
                <div>
                  <p className="text-sm font-medium text-[#2D2D2D]">Drop a screenshot here</p>
                  <p className="text-xs text-[#B5AFA6] mt-0.5">or tap to select &middot; JPG, PNG, WEBP</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {/* Processing spinner */}
          {processing && (
            <div className="flex flex-col items-center gap-3 py-5">
              <Loader2 size={26} className="text-[#9B7EB5] animate-spin" />
              <p className="text-sm text-[#8B8578]">Reading &ldquo;{imageName}&rdquo;&hellip;</p>
            </div>
          )}

          {/* Extracted transactions review */}
          {extracted && !processing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2D2D2D]">
                  {extracted.length} transaction{extracted.length !== 1 ? "s" : ""} found
                </p>
                <button
                  onClick={() => { setExtracted(null); setImageName(""); setError(null); }}
                  className="text-xs text-[#B5AFA6] hover:text-[#C4756E] transition-colors"
                >
                  Discard
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                {extracted.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F5F0EB] gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#2D2D2D] truncate">{t.description || "—"}</p>
                      <p className="text-[11px] text-[#B5AFA6]">{t.date}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        t.amount >= 0 ? "text-[#6B9B7A]" : "text-[#2D2D2D]"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={confirmImport}
                className="w-full bg-[#9B7EB5] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#8B6EA5] transition-colors"
              >
                Import {extracted.length} Transaction{extracted.length !== 1 ? "s" : ""}
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
        Export all your data to a JSON file so you can restore it later or share it between devices.
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
