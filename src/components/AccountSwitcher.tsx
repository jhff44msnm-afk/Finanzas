"use client";

import { useState } from "react";
import { ChevronDown, Plus, X, Building2, Landmark } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";
import type { Account, AccountType } from "@/lib/types";

export default function AccountSwitcher() {
  const { accounts, activeAccountId } = useAppState();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<AccountType>("us");
  const [formName, setFormName] = useState("");
  const [formBank, setFormBank] = useState("");
  const [formRouting, setFormRouting] = useState("");
  const [formAccount, setFormAccount] = useState("");
  const [formCuenta, setFormCuenta] = useState("");
  const [formClabe, setFormClabe] = useState("");

  const activeAccount = accounts.find((a) => a.id === activeAccountId);

  const inputClass =
    "w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]";

  const resetForm = () => {
    setFormName("");
    setFormBank("");
    setFormRouting("");
    setFormAccount("");
    setFormCuenta("");
    setFormClabe("");
    setFormType("us");
    setShowForm(false);
  };

  const addAccount = () => {
    if (!formName.trim()) return;
    const account: Account = {
      id: uuidv4(),
      name: formName.trim(),
      bankName: formBank.trim() || (formType === "us" ? "Bank" : "Banco"),
      type: formType,
      currency: formType === "us" ? "USD" : "MXN",
      routingNumber: formType === "us" ? formRouting.trim() || undefined : undefined,
      accountNumber: formType === "us" ? formAccount.trim() || undefined : undefined,
      cuentaNumber: formType === "mx" ? formCuenta.trim() || undefined : undefined,
      clabeNumber: formType === "mx" ? formClabe.trim() || undefined : undefined,
    };
    dispatch({ type: "ADD_ACCOUNT", payload: account });
    if (accounts.length === 0) {
      dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: account.id });
    }
    resetForm();
  };

  if (accounts.length === 0 && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full mb-4 flex items-center justify-center gap-2 bg-white border border-dashed border-[#E8E2DA] rounded-2xl px-4 py-3 text-sm text-[#8B8578] hover:border-[#7C8C6E] hover:text-[#7C8C6E] transition-colors"
      >
        <Plus size={16} />
        Add your first account
      </button>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      {accounts.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between bg-white border border-[#E8E2DA] rounded-2xl px-4 py-2.5 hover:border-[#B5AFA6] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {activeAccountId === "all" ? (
                <>
                  <div className="w-8 h-8 rounded-xl bg-[#7C8C6E]/10 flex items-center justify-center">
                    <Building2 size={16} className="text-[#7C8C6E]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#2D2D2D]">All Accounts</p>
                    <p className="text-[10px] text-[#B5AFA6]">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
                  </div>
                </>
              ) : activeAccount ? (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    activeAccount.type === "mx" ? "bg-[#006847]/10" : "bg-[#7C8C6E]/10"
                  }`}>
                    <Landmark size={16} className={activeAccount.type === "mx" ? "text-[#006847]" : "text-[#7C8C6E]"} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[#2D2D2D]">{activeAccount.name}</p>
                    <p className="text-[10px] text-[#B5AFA6]">
                      {activeAccount.bankName} &middot; {activeAccount.currency}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
            <ChevronDown
              size={16}
              className={`text-[#B5AFA6] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E2DA] rounded-2xl shadow-lg z-40 overflow-hidden">
              <button
                onClick={() => {
                  dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: "all" });
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-[#F5F0EB] transition-colors ${
                  activeAccountId === "all" ? "bg-[#7C8C6E]/5" : ""
                }`}
              >
                <Building2 size={14} className="text-[#7C8C6E]" />
                All Accounts
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    dispatch({ type: "SET_ACTIVE_ACCOUNT", payload: acc.id });
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-[#F5F0EB] transition-colors ${
                    activeAccountId === acc.id ? "bg-[#7C8C6E]/5" : ""
                  }`}
                >
                  <Landmark
                    size={14}
                    className={acc.type === "mx" ? "text-[#006847]" : "text-[#7C8C6E]"}
                  />
                  <div>
                    <p className="font-medium text-[#2D2D2D]">{acc.name}</p>
                    <p className="text-[10px] text-[#B5AFA6]">{acc.bankName} &middot; {acc.currency}</p>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  setShowForm(true);
                }}
                className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 hover:bg-[#F5F0EB] transition-colors text-[#7C8C6E] border-t border-[#E8E2DA]"
              >
                <Plus size={14} />
                Add Account
              </button>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#2D2D2D]">New Account</h3>
            <button onClick={resetForm} className="p-1 text-[#B5AFA6] hover:text-[#5C5549]">
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFormType("us")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                formType === "us"
                  ? "bg-[#7C8C6E] text-white"
                  : "bg-[#F5F0EB] text-[#8B8578]"
              }`}
            >
              US Account (USD)
            </button>
            <button
              onClick={() => setFormType("mx")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                formType === "mx"
                  ? "bg-[#006847] text-white"
                  : "bg-[#F5F0EB] text-[#8B8578]"
              }`}
            >
              MX Account (MXN)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Account Name
              </label>
              <input
                placeholder={formType === "us" ? "e.g. GECU Checking" : "e.g. BBVA Cuenta"}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                Bank Name
              </label>
              <input
                placeholder={formType === "us" ? "e.g. GECU Federal Credit Union" : "e.g. BBVA México"}
                value={formBank}
                onChange={(e) => setFormBank(e.target.value)}
                className={inputClass}
              />
            </div>

            {formType === "us" ? (
              <>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                    Routing Number
                  </label>
                  <input
                    placeholder="Optional"
                    value={formRouting}
                    onChange={(e) => setFormRouting(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                    Account Number
                  </label>
                  <input
                    placeholder="Optional"
                    value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                    No. de Cuenta
                  </label>
                  <input
                    placeholder="Optional"
                    value={formCuenta}
                    onChange={(e) => setFormCuenta(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">
                    No. Cuenta CLABE
                  </label>
                  <input
                    placeholder="Optional"
                    value={formClabe}
                    onChange={(e) => setFormClabe(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={addAccount}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${
                formType === "mx"
                  ? "bg-[#006847] hover:bg-[#005538]"
                  : "bg-[#7C8C6E] hover:bg-[#6B7A5E]"
              }`}
            >
              Add Account
            </button>
            <button
              onClick={resetForm}
              className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#EDE7DF]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
