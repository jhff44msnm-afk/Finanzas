"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import { parsePdfFile, detectStatementPeriod } from "@/lib/pdf-parser";

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
          setError(
            "Could not parse any transactions from this PDF. Make sure it is a bank statement."
          );
          setUploading(false);
          return;
        }

        const yearMatch = text.match(
          /Statement\s+from\s+\d{2}\/\d{2}\/(\d{2,4})/i
        );
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

        setSuccess(
          `Successfully imported ${transactions.length} transactions from "${file.name}".`
        );
      } catch (err) {
        setError(
          `Failed to process PDF: ${err instanceof Error ? err.message : "Unknown error"}`
        );
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Bank Statements</h2>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={40} className="text-blue-500 animate-spin" />
            <p className="text-gray-600">Processing your statement...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-gray-400" />
            <div>
              <p className="text-gray-600 font-medium">
                Drag and drop your bank statement PDF here
              </p>
              <p className="text-gray-400 text-sm mt-1">
                or click to browse files
              </p>
            </div>
            <label className="mt-2 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors">
              Select PDF
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      {statements.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700">
            Uploaded Statements
          </h3>
          {statements.map((stmt) => (
            <div
              key={stmt.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <FileText size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{stmt.fileName}</p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    {stmt.periodStart && stmt.periodEnd && (
                      <span>
                        Period: {stmt.periodStart} to {stmt.periodEnd}
                      </span>
                    )}
                    <span>{stmt.transactionCount} transactions</span>
                    <span>Uploaded: {stmt.uploadDate}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeStatement(stmt.id)}
                className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          Supported Format
        </h3>
        <p className="text-sm text-gray-500">
          Currently supports GECU Federal Credit Union member statements in PDF format.
          The parser reads Date, Description, Amount, and Balance columns automatically.
          Transactions are categorized based on the description.
        </p>
      </div>
    </div>
  );
}
