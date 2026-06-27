"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type {
  Transaction,
  Statement,
  Goal,
  InvestmentHolding,
  InsurancePolicy,
} from "./types";
import { MOCK_INVESTMENTS, MOCK_INSURANCE } from "./mock-data";

interface AppState {
  transactions: Transaction[];
  statements: Statement[];
  goals: Goal[];
  investments: InvestmentHolding[];
  insurance: InsurancePolicy[];
}

type Action =
  | { type: "ADD_TRANSACTIONS"; payload: Transaction[] }
  | { type: "UPDATE_TRANSACTION"; payload: Transaction }
  | { type: "ADD_STATEMENT"; payload: Statement }
  | { type: "REMOVE_STATEMENT"; payload: string }
  | { type: "ADD_GOAL"; payload: Goal }
  | { type: "UPDATE_GOAL"; payload: Goal }
  | { type: "DELETE_GOAL"; payload: string }
  | { type: "SET_INVESTMENTS"; payload: InvestmentHolding[] }
  | { type: "SET_INSURANCE"; payload: InsurancePolicy[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_TRANSACTIONS":
      return {
        ...state,
        transactions: [...state.transactions, ...action.payload],
      };
    case "UPDATE_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
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
    case "SET_INSURANCE":
      return { ...state, insurance: action.payload };
    default:
      return state;
  }
}

const initialState: AppState = {
  transactions: [],
  statements: [],
  goals: [
    {
      id: "g1",
      name: "Emergency Fund",
      targetAmount: 5000,
      currentAmount: 1200,
      deadline: "2026-12-31",
      color: "#3b82f6",
    },
    {
      id: "g2",
      name: "Vacation",
      targetAmount: 3000,
      currentAmount: 750,
      deadline: "2026-09-01",
      color: "#10b981",
    },
    {
      id: "g3",
      name: "New Laptop",
      targetAmount: 1500,
      currentAmount: 400,
      deadline: "2026-08-15",
      color: "#a855f7",
    },
  ],
  investments: MOCK_INVESTMENTS,
  insurance: MOCK_INSURANCE,
};

const StateContext = createContext<AppState>(initialState);
const DispatchContext = createContext<Dispatch<Action>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
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
