"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2, Landmark } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import { parsePdfFile, detectStatementPeriod } from "@/lib/pdf-parser";
import { parseBbvaPdf, isBbvaPdf } from "@/lib/bbva-parser";

export default function StatementsView() {
  const { statements, accounts, activeAccountId } = useAppState();
  const dispatch = useAppDispatch();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const filteredStatements =
    activeAccountId === "all"
      ? statements
      : statements.filter((s) => s.accountId === activeAccountId || !s.accountId);

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

        if (isBbva) {
          const { transactions, text, accountInfo } = await parseBbvaPdf(file, statementId);

          if (transactions.length === 0) {
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

          const taggedTransactions = transactions.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          dispatch({
            type: "ADD_STATEMENT",
            payload: {
              id: statementId,
              fileName: file.name,
              uploadDate: new Date().toISOString().slice(0, 10),
              periodStart: accountInfo.periodStart,
              periodEnd: accountInfo.periodEnd,
              transactionCount: transactions.length,
              accountId: targetAccountId,
            },
          });

          dispatch({ type: "ADD_TRANSACTIONS", payload: taggedTransactions });
          setSuccess(`Imported ${transactions.length} BBVA transactions from "${file.name}".`);
        } else {
          const { transactions, text, year } = await parsePdfFile(file, statementId);

          if (transactions.length === 0) {
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

          const taggedTransactions = transactions.map((t) => ({
            ...t,
            accountId: targetAccountId,
            source: "statement" as const,
          }));

          dispatch({
            type: "ADD_STATEMENT",
            payload: {
              id: statementId,
              fileName: file.name,
              uploadDate: new Date().toISOString().slice(0, 10),
              periodStart: period.start,
              periodEnd: period.end,
              transactionCount: transactions.length,
              accountId: targetAccountId,
            },
          });

          dispatch({ type: "ADD_TRANSACTIONS", payload: taggedTransactions });
          setSuccess(`Imported ${transactions.length} transactions from "${file.name}".`);
        }
      } catch (err) {
        setError(`Failed to process PDF: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setUploading(false);
      }
    },
    [dispatch, accounts, activeAccountId]
  );

  const processFiles = useCallback(
    async (files: FileList) => {
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
    },
    [processFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFiles(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFiles(files);
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
          The parser auto-detects the bank and reads transactions automatically.
          You can upload multiple files at once.
        </p>
      </div>
    </div>
  );
}
