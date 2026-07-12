import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Trophy, Flame, Star, Award, Search } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await axios.get(`${API_URL}/leaderboard`);
        setLeaderboard(response.data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading Leaderboard rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Global Leaderboard</h2>
          <p className="text-sm text-slate-400 font-sans">Rankings of top solvers and active learners in the network</p>
        </div>
      </div>

      {/* Podium for top 3 */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 items-end pt-10 pb-6 max-w-2xl mx-auto">
          {/* Rank 2 */}
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-bold text-slate-500 text-lg dark:bg-[#0F172A] shadow">
              2
            </div>
            <div className="mt-3 text-center space-y-1">
              <span className="font-extrabold text-sm text-slate-750 block truncate w-28 dark:text-slate-200">
                {leaderboard[1].name}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full dark:bg-slate-800">
                {leaderboard[1].xp} XP
              </span>
            </div>
            <div className="h-28 w-full bg-slate-200 rounded-t-2xl mt-4 dark:bg-[#0F172A] flex items-center justify-center text-slate-405 font-bold shadow-sm">
              Silver
            </div>
          </div>

          {/* Rank 1 */}
          <div className="flex flex-col items-center">
            <Trophy className="h-7 w-7 text-yellow-500 animate-float mb-1" />
            <div className="h-18 w-18 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center font-bold text-yellow-600 text-xl dark:bg-yellow-950/25 shadow-lg">
              1
            </div>
            <div className="mt-3 text-center space-y-1">
              <span className="font-extrabold text-base text-slate-850 block truncate w-32 dark:text-slate-105">
                {leaderboard[0].name}
              </span>
              <span className="text-xs bg-yellow-100 text-yellow-650 px-2.5 py-0.5 rounded-full font-bold dark:bg-yellow-950/40">
                {leaderboard[0].xp} XP
              </span>
            </div>
            <div className="h-36 w-full bg-yellow-400 rounded-t-2xl mt-4 dark:bg-yellow-655 flex items-center justify-center text-yellow-900 font-extrabold shadow-md">
              GOLD
            </div>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-orange-50 border-2 border-orange-300 flex items-center justify-center font-bold text-orange-600 text-base dark:bg-orange-950/25 shadow">
              3
            </div>
            <div className="mt-3 text-center space-y-1">
              <span className="font-extrabold text-sm text-slate-750 block truncate w-28 dark:text-slate-200">
                {leaderboard[2].name}
              </span>
              <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full dark:bg-orange-950/20">
                {leaderboard[2].xp} XP
              </span>
            </div>
            <div className="h-20 w-full bg-orange-200 rounded-t-2xl mt-4 dark:bg-[#0F172A] flex items-center justify-center text-orange-800 font-bold shadow-sm">
              Bronze
            </div>
          </div>
        </div>
      )}

      {/* Main Leaderboard Table */}
      {leaderboard.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-3 dark:bg-[#1E293B] dark:border-slate-800 shadow-sm">
          <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">No rankings available yet.</h3>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 dark:bg-[#0F172A] dark:border-slate-800 text-xs font-bold text-slate-450 uppercase tracking-wider">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-6">Solver</th>
                <th className="py-4 px-6 text-center">Level</th>
                <th className="py-4 px-6 text-center">Streak</th>
                <th className="py-4 px-6 text-center">Resolved</th>
                <th className="py-4 px-6 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {leaderboard.map((student) => (
                <tr key={student.rank} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                  <td className="py-4.5 px-6 font-extrabold text-slate-700 dark:text-slate-300">
                    #{student.rank}
                  </td>
                  <td className="py-4.5 px-6">
                    <div className="font-bold text-slate-800 dark:text-slate-100">{student.name}</div>
                    <div className="text-xs text-slate-400">{student.email}</div>
                  </td>
                  <td className="py-4.5 px-6 text-center font-bold text-slate-700 dark:text-slate-355">
                    Lvl {student.level}
                  </td>
                  <td className="py-4.5 px-6 text-center font-semibold">
                    <div className="inline-flex items-center space-x-1 text-orange-555">
                      <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                      <span>{student.streak} days</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 text-center font-semibold text-slate-500">
                    {student.solvedCount} doubts
                  </td>
                  <td className="py-4.5 px-6 text-right font-black text-brand-600 dark:text-brand-400">
                    {student.xp} XP
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
