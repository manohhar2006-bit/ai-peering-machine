import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Flame,
  Award,
  BookOpen,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  Compass
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const StudentDashboard: React.FC = () => {
  const { user, studentProfile, refreshProfile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        await refreshProfile(); // Refresh profile state to sync XP
        const response = await axios.get(`${API_URL}/analytics/student`);
        setData(response.data);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading your dashboard quest...</p>
        </div>
      </div>
    );
  }

  const askedDoubts = data?.askedDoubts || [];
  const solvedAnswers = data?.solvedAnswers || [];
  const subjects = data?.subjects || [];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-700 via-brand-600 to-accent-400 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-4.5 w-4.5 text-yellow-300 fill-yellow-300" />
            <span>Active Quest Level: {studentProfile?.level}</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Ready for a challenge, {user?.name}?</h2>
          <p className="text-brand-100 max-w-xl text-sm leading-relaxed">
            Resolve doubts posted by your peers to gain XP, unlock custom badges, and increase your reputation among faculty and classmates!
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/ask-doubt"
            className="inline-flex items-center space-x-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-md hover:bg-slate-50 transition-all"
          >
            <HelpCircle className="h-4.5 w-4.5" />
            <span>Ask a Doubt</span>
          </Link>
          <Link
            to="/feed"
            className="inline-flex items-center space-x-2 rounded-xl bg-brand-800/40 border border-brand-500/25 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800/60 transition-all"
          >
            <Compass className="h-4.5 w-4.5" />
            <span>Help a Peer</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total XP</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{studentProfile?.xp}</div>
            <p className="text-xs text-slate-400 mt-1">Level {studentProfile?.level} explorer</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Streak</span>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/20">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{studentProfile?.streak} Days</div>
            <p className="text-xs text-slate-400 mt-1">Keep it up to multiply rewards</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doubts Solved</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-500 dark:bg-teal-950/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{studentProfile?.resolvedDoubtsCount}</div>
            <p className="text-xs text-slate-400 mt-1">Helped peer students succeed</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Participation</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-500 dark:bg-sky-950/20">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100">{studentProfile?.participationCount}</div>
            <p className="text-xs text-slate-400 mt-1">Questions and interactions</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Columns (Doubts Asked & Answers Given) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asked Doubts */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Doubts Quests</h3>
              <Link to="/feed" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View Feed
              </Link>
            </div>
            {askedDoubts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <HelpCircle className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400 text-center">No doubts asked yet. Need clarification on a topic?</p>
                <Link to="/ask-doubt" className="text-xs font-bold text-brand-600 hover:underline">
                  Ask Your First Doubt
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {askedDoubts.map((doubt: any) => (
                  <Link
                    key={doubt._id}
                    to={`/doubt/${doubt._id}`}
                    className="flex justify-between items-center py-4 hover:bg-slate-50/50 rounded-xl px-2 transition-all"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <h4 className="font-bold text-slate-705 text-sm truncate dark:text-slate-205">{doubt.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {doubt.subjectId?.code || 'GEN'}
                        </span>
                        <span>•</span>
                        <span>{doubt.topic}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          doubt.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                            : doubt.status === 'escalated'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                        }`}
                      >
                        {doubt.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Solved Answers */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Solve Contributions</h3>
              <span className="text-xs text-slate-400">Points & ratings awarded</span>
            </div>
            {solvedAnswers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Award className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400 text-center">No doubts solved yet. Jump on the Doubt Feed to start help routing.</p>
                <Link to="/feed" className="text-xs font-bold text-brand-600 hover:underline">
                  Browse Active Doubts
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {solvedAnswers.map((ans: any) => (
                  <Link
                    key={ans._id}
                    to={`/doubt/${ans.doubtId?._id}`}
                    className="flex justify-between items-center py-4 hover:bg-slate-50/50 rounded-xl px-2 transition-all"
                  >
                    <div className="space-y-1 max-w-[65%]">
                      <h4 className="font-bold text-slate-705 text-sm truncate dark:text-slate-205">
                        {ans.doubtId?.title || 'Doubt thread'}
                      </h4>
                      <p className="text-xs text-slate-450 truncate dark:text-slate-400">{ans.content}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {ans.aiEvaluation && (
                        <div className="text-right">
                          <div className="text-xs font-extrabold text-emerald-500">AI: {ans.aiEvaluation.score}/100</div>
                          <div className="text-[10px] text-slate-400">+{ans.pointsAwarded} XP</div>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subject reputation & Streaks overview */}
        <div className="space-y-6">
          {/* Subject Reputation */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-50 dark:text-slate-100 dark:border-slate-800">
              Subject Mastery
            </h3>
            <div className="space-y-4">
              {subjects.map((sub: any) => {
                const rep = studentProfile?.subjectReputation?.[sub._id] || 0;
                // Maximum scale for reputation visualization
                const percent = Math.min(100, Math.round((rep / 500) * 100));

                return (
                  <div key={sub._id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-650 dark:text-slate-350">{sub.name}</span>
                      <span className="text-brand-600 font-bold dark:text-brand-400">{rep} Rep</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-brand-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges Preview */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Earned Badges</h3>
              <Link to="/rewards" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View All
              </Link>
            </div>
            {!studentProfile?.badges || studentProfile.badges.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No badges unlocked yet. Solve doubts to earn them!</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {studentProfile.badges.slice(0, 4).map((badgeObj: any) => (
                  <div
                    key={badgeObj.badgeId}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 dark:bg-[#0F172A] dark:border-slate-800"
                    title={badgeObj.badgeId}
                  >
                    <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1 dark:bg-brand-950/20 dark:text-brand-400">
                      <Award className="h-6 w-6" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight text-center truncate w-full">
                      {badgeObj.badgeId.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
