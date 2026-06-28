"use client";

import { useState } from "react";
import { Plus, Trash2, Target, Lightbulb } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAppState, useAppDispatch } from "@/lib/store";

const GOAL_COLORS = [
  "#7C8C6E",
  "#6B9B7A",
  "#9B7EB5",
  "#C4756E",
  "#D4A76A",
  "#6BA3A0",
  "#C48B9F",
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

  const inputClass =
    "w-full border border-[#E8E2DA] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white text-[#2D2D2D]";

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2D2D2D]">Goals</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-[#7C8C6E] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E] transition-colors"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
          <h3 className="font-semibold text-[#2D2D2D] text-sm">Create Goal</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Goal name</label>
              <input placeholder="e.g. Emergency Fund" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Target ($)</label>
              <input type="number" placeholder="5000" value={target} onChange={(e) => setTarget(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Saved ($)</label>
              <input type="number" placeholder="0" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-[#8B8578] mb-1 font-medium uppercase tracking-wider">Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addGoal} className="bg-[#7C8C6E] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#6B7A5E]">Create</button>
            <button onClick={() => setShowForm(false)} className="bg-[#F5F0EB] text-[#5C5549] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#EDE7DF]">Cancel</button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#7C8C6E]/10 flex items-center justify-center mb-3">
            <Target size={28} className="text-[#7C8C6E]" />
          </div>
          <p className="text-[#8B8578] font-medium">No goals set yet</p>
          <p className="text-[#B5AFA6] text-sm mt-1">Create your first savings goal above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const daysLeft = goal.deadline
              ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000))
              : null;
            return (
              <div key={goal.id} className="bg-white rounded-2xl border border-[#E8E2DA] p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-[#2D2D2D]">{goal.name}</h3>
                    {daysLeft !== null && (
                      <p className="text-xs text-[#B5AFA6] mt-0.5">
                        {daysLeft > 0 ? `${daysLeft} days remaining` : "Deadline passed"}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dispatch({ type: "DELETE_GOAL", payload: goal.id })}
                    className="text-[#B5AFA6] hover:text-[#C4756E] transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#8B8578] font-medium">
                      ${goal.currentAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="font-semibold text-[#2D2D2D]">
                      ${goal.targetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full bg-[#F5F0EB] rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                  <p className="text-[10px] text-[#B5AFA6] mt-1 text-right font-medium">
                    {pct.toFixed(1)}%
                  </p>
                </div>

                {(() => {
                  const remaining = goal.targetAmount - goal.currentAmount;
                  if (remaining <= 0) {
                    return (
                      <div className="bg-[#6B9B7A]/8 border border-[#6B9B7A]/20 rounded-xl p-3 flex items-start gap-2">
                        <Lightbulb size={15} className="text-[#6B9B7A] mt-0.5 shrink-0" />
                        <p className="text-xs text-[#6B9B7A] font-medium">Goal reached! Congratulations!</p>
                      </div>
                    );
                  }
                  if (daysLeft !== null && daysLeft > 0) {
                    const perWeek = remaining / Math.max(daysLeft / 7, 1);
                    const perMonth = remaining / Math.max(daysLeft / 30, 1);
                    return (
                      <div className="bg-[#7C8C6E]/6 border border-[#7C8C6E]/15 rounded-xl p-3 flex items-start gap-2">
                        <Lightbulb size={15} className="text-[#7C8C6E] mt-0.5 shrink-0" />
                        <div className="text-xs text-[#5C5549]">
                          <p className="font-medium text-[#7C8C6E] mb-0.5">To reach this goal:</p>
                          <p>Save <span className="font-semibold">${perWeek.toFixed(2)}/week</span> or <span className="font-semibold">${perMonth.toFixed(2)}/month</span></p>
                          <p className="text-[#8B8578] mt-0.5">${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })} remaining</p>
                        </div>
                      </div>
                    );
                  }
                  if (daysLeft !== null && daysLeft === 0) {
                    return (
                      <div className="bg-[#C4756E]/8 border border-[#C4756E]/20 rounded-xl p-3 flex items-start gap-2">
                        <Lightbulb size={15} className="text-[#C4756E] mt-0.5 shrink-0" />
                        <div className="text-xs text-[#5C5549]">
                          <p className="font-medium text-[#C4756E]">Deadline passed</p>
                          <p>${remaining.toLocaleString("en-US", { minimumFractionDigits: 2 })} still needed. Consider extending your deadline.</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-[#F5F0EB] border border-[#E8E2DA] rounded-xl p-3 flex items-start gap-2">
                      <Lightbulb size={15} className="text-[#8B8578] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#8B8578]">Set a deadline to get weekly and monthly saving targets.</p>
                    </div>
                  );
                })()}

                {editId === goal.id ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="flex-1 border border-[#E8E2DA] rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#7C8C6E] bg-white"
                    />
                    <button
                      onClick={() => updateProgress(goal.id)}
                      className="bg-[#6B9B7A] text-white px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#5A8A69]"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditId(goal.id)}
                    className="w-full bg-[#F5F0EB] text-[#5C5549] px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#EDE7DF] transition-colors"
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
