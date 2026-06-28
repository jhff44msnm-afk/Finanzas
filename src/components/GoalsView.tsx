"use client";

import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";

const GOAL_COLORS = [
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#ef4444",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

export default function GoalsView() {
  const { goals } = useAppState();
  const dispatch = useAppDispatch();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [deadline, setDeadline] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");

  const addGoal = () => {
    if (!name || !target) return;
    dispatch({
      type: "ADD_GOAL",
      payload: {
        id: uuidv4(),
        name,
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        deadline,
        color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
      },
    });
    setName("");
    setTarget("");
    setCurrent("");
    setDeadline("");
    setShowForm(false);
  };

  const updateProgress = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal || !addAmount) return;
    dispatch({
      type: "UPDATE_GOAL",
      payload: {
        ...goal,
        currentAmount: Math.min(
          goal.currentAmount + parseFloat(addAmount),
          goal.targetAmount
        ),
      },
    });
    setAddAmount("");
    setEditId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Financial Goals</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-700">Create New Goal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              placeholder="Goal name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Target amount ($)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Current amount ($)"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addGoal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create Goal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-gray-200 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Target size={48} className="text-gray-300 mb-3" />
          <p className="text-gray-500">No goals set yet.</p>
          <p className="text-gray-400 text-sm">
            Create your first financial goal to start tracking progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const pct = Math.min(
              (goal.currentAmount / goal.targetAmount) * 100,
              100
            );
            const daysLeft = goal.deadline
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(goal.deadline).getTime() - Date.now()) /
                      86400000
                  )
                )
              : null;
            return (
              <div
                key={goal.id}
                className="bg-white rounded-xl border border-gray-200 p-5 space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{goal.name}</h3>
                    {daysLeft !== null && (
                      <p className="text-xs text-gray-400 mt-1">
                        {daysLeft > 0
                          ? `${daysLeft} days remaining`
                          : "Deadline passed"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      dispatch({ type: "DELETE_GOAL", payload: goal.id })
                    }
                    className="text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">
                      ${goal.currentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-medium text-gray-700">
                      ${goal.targetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {pct.toFixed(1)}%
                  </p>
                </div>

                {editId === goal.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => updateProgress(goal.id)}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditId(goal.id)}
                    className="w-full border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Add Progress
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
