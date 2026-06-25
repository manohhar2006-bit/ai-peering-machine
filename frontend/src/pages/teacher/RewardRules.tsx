import React, { useState } from 'react';
import { Settings, Save, RotateCcw, ShieldCheck, Sparkles, Award } from 'lucide-react';

export const RewardRules: React.FC = () => {
  const [askerPoints, setAskerPoints] = useState(25);
  const [solverPoints, setSolverPoints] = useState(100);
  const [bonusPoints, setBonusPoints] = useState(50);
  const [verificationPoints, setVerificationPoints] = useState(100);
  const [streakMultiplier, setStreakMultiplier] = useState(1.5);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 3000);
  };

  const handleReset = () => {
    setAskerPoints(25);
    setSolverPoints(100);
    setBonusPoints(50);
    setVerificationPoints(100);
    setStreakMultiplier(1.5);
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-805 dark:text-slate-100 font-sans">Gamification & Reward Rules</h2>
          <p className="text-sm text-slate-400">Tune the points engine parameters to balance peer interaction and work reduction</p>
        </div>
      </div>

      {isSaved && (
        <div className="flex items-center space-x-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
          <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          <span>Rules updated successfully! Points engine synchronized.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-premium space-y-6 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Asker points */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Asker Participation (XP)</label>
            <input
              type="number"
              value={askerPoints}
              onChange={(e) => setAskerPoints(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">Points awarded to a student for asking a meaningful and approved doubt.</p>
          </div>

          {/* Solver points */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Solver Base (XP)</label>
            <input
              type="number"
              value={solverPoints}
              onChange={(e) => setSolverPoints(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">Baseline points awarded for resolving a doubt (requires AI evaluation score &gt;= 50).</p>
          </div>

          {/* AI Bonus points */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">AI Quality Rating Bonus (XP)</label>
            <input
              type="number"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">Extra points granted automatically if the answer score from AI evaluation is &gt;= 85.</p>
          </div>

          {/* Verification points */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Faculty Verification Bonus (XP)</label>
            <input
              type="number"
              value={verificationPoints}
              onChange={(e) => setVerificationPoints(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">Bonus points awarded to a student solver if their answer is verified as an official answer by a teacher.</p>
          </div>

          {/* Streak multiplier */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Streak Multiplier (x)</label>
            <input
              type="number"
              step="0.1"
              value={streakMultiplier}
              onChange={(e) => setStreakMultiplier(Number(e.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-slate-400">Multiplier applied to daily quests if the user maintains a continuous activity streak.</p>
          </div>
        </div>

        <hr className="border-slate-100 dark:border-slate-800" />

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 py-3 text-sm font-bold text-white shadow-premium transition-all flex items-center justify-center space-x-1.5"
          >
            <Save className="h-4.5 w-4.5" />
            <span>Save Rules</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 py-3 px-6 text-sm font-semibold dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-400 flex items-center space-x-1.5 transition-all"
          >
            <RotateCcw className="h-4.5 w-4.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </form>
    </div>
  );
};
