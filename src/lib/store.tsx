"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  Transaction,
  Statement,
  Goal,
  InvestmentHolding,
  InsurancePolicy,
  RecurringBill,
  BillPayment,
  Account,
} from "./types";

interface AppState {
  accounts: Account[];
  activeAccountId: string;
  transactions: Transaction[];
  statements: Statement[];
  goals: Goal[];
  investments: InvestmentHolding[];
  insurance: InsurancePolicy[];
  bills: RecurringBill[];
  billPayments: BillPayment[];
}

type Action =
  | { type: "ADD_ACCOUNT"; payload: Account }
  | { type: "UPDATE_ACCOUNT"; payload: Account }
  | { type: "DELETE_ACCOUNT"; payload: string }
  | { type: "SET_ACTIVE_ACCOUNT"; payload: string }
  | { type: "ADD_TRANSACTIONS"; payload: Transaction[] }
  | { type: "ADD_TRANSACTION"; payload: Transaction }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "DELETE_TRANSACTION"; payload: string }
  | { type: "ADD_STATEMENT"; payload: Statement }
  | { type: "REMOVE_STATEMENT"; payload: string }
  | { type: "ADD_GOAL"; payload: Goal }
  | { type: "UPDATE_GOAL"; payload: Goal }
  | { type: "DELETE_GOAL"; payload: string }
  | { type: "SET_INVESTMENTS"; payload: InvestmentHolding[] }
  | { type: "ADD_INVESTMENT"; payload: InvestmentHolding }
  | { type: "DELETE_INVESTMENT"; payload: string }
  | { type: "SET_INSURANCE"; payload: InsurancePolicy[] }
  | { type: "ADD_INSURANCE"; payload: InsurancePolicy }
  | { type: "DELETE_INSURANCE"; payload: string }
  | { type: "ADD_BILL"; payload: RecurringBill }
  | { type: "UPDATE_BILL"; payload: RecurringBill }
  | { type: "DELETE_BILL"; payload: string }
  | { type: "ADD_BILL_PAYMENT"; payload: BillPayment }
  | { type: "LOAD_STATE"; payload: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "LOAD_STATE":
      return action.payload;
    case "ADD_ACCOUNT":
      return { ...state, accounts: [...state.accounts, action.payload] };
    case "UPDATE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };
    case "DELETE_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.filter((a) => a.id !== action.payload),
        transactions: state.transactions.filter(
          (t) => t.accountId !== action.payload
        ),
        statements: state.statements.filter(
          (s) => s.accountId !== action.payload
        ),
        bills: state.bills.filter((b) => b.accountId !== action.payload),
        activeAccountId:
          state.activeAccountId === action.payload
            ? state.accounts.find((a) => a.id !== action.payload)?.id ?? "all"
            : state.activeAccountId,
      };
    case "SET_ACTIVE_ACCOUNT":
      return { ...state, activeAccountId: action.payload };
    case "ADD_TRANSACTIONS":
      return {
        ...state,
        transactions: [...state.transactions, ...action.payload],
      };
    case "ADD_TRANSACTION":
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
      };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    case "DELETE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.filter(
          (t) => t.id !== action.payload
        ),
      };
    case "ADD_STATEMENT":
      return {
        ...state,
        statements: [...state.statements, action.payload],
      };
    case "REMOVE_STATEMENT":
      return {
        ...state,
        statements: state.statements.filter((s) => s.id !== action.payload),
        transactions: state.transactions.filter(
          (t) => t.statementId !== action.payload
        ),
      };
    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.payload] };
    case "UPDATE_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    case "DELETE_GOAL":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.payload),
      };
    case "SET_INVESTMENTS":
      return { ...state, investments: action.payload };
    case "ADD_INVESTMENT":
      return {
        ...state,
        investments: [...state.investments, action.payload],
      };
    case "DELETE_INVESTMENT":
      return {
        ...state,
        investments: state.investments.filter((i) => i.id !== action.payload),
      };
    case "SET_INSURANCE":
      return { ...state, insurance: action.payload };
    case "ADD_INSURANCE":
      return {
        ...state,
        insurance: [...state.insurance, action.payload],
      };
    case "DELETE_INSURANCE":
      return {
        ...state,
        insurance: state.insurance.filter((i) => i.id !== action.payload),
      };
    case "ADD_BILL":
      return { ...state, bills: [...state.bills, action.payload] };
    case "UPDATE_BILL":
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case "DELETE_BILL":
      return {
        ...state,
        bills: state.bills.filter((b) => b.id !== action.payload),
        billPayments: state.billPayments.filter(
          (p) => p.billId !== action.payload
        ),
      };
    case "ADD_BILL_PAYMENT":
      return {
        ...state,
        billPayments: [...state.billPayments, action.payload],
      };
    default:
      return state;
  }
}

const STORAGE_KEY = "finanzas-app-state";

const emptyState: AppState = {
  accounts: [],
  activeAccountId: "all",
  transactions: [],
  statements: [],
  goals: [],
  investments: [],
  insurance: [],
  bills: [],
  billPayments: [],
};

function loadState(): AppState {
  if (typeof window === "undefined") return emptyState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...emptyState, ...parsed };
    }
  } catch {}
  return emptyState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const StateContext = createContext<AppState>(emptyState);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyState);

  useEffect(() => {
    const loaded = loadState();
    if (
      loaded.transactions.length > 0 ||
      loaded.goals.length > 0 ||
      loaded.investments.length > 0 ||
      loaded.insurance.length > 0 ||
      loaded.statements.length > 0 ||
      loaded.bills?.length > 0 ||
      loaded.accounts?.length > 0
    ) {
      dispatch({ type: "LOAD_STATE", payload: loaded });
    }
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  return useContext(StateContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
