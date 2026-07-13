import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { User, Award, Flame, BookOpen, Star, Sparkles, HelpCircle, CheckCircle, Brain } from 'lucide-react';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

export const Profile: React.FC = () => {
  const { user, studentProfile, refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        await refreshProfile();
        const subResponse = await axios.get(`${API_URL}/subjects`);
        setSubjects(subResponse.data);

        const statsResponse = await axios.get(`${API_URL}/analytics/student`);
        setStatistics(statsResponse.data.statistics);
      } catch (err) {
        console.error('Failed to load profile data:', err);
      }
    };
    loadData();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Student Profile</h2>
          <p className="text-sm text-slate-400">Your private learning analytics, badges, and reputation metrics</p>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 flex flex-col items-center justify-center text-center space-y-4 md:col-span-1">
          <div className="h-20 w-20 rounded-full bg-brand-100 text-brand-655 flex items-center justify-center font-bold text-3xl dark:bg-brand-950/30">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{user.name}</h3>
            <p className="text-xs text-slate-450 mt-0.5">{user.email}</p>
          </div>
          <span className="bg-brand-50 text-brand-700 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider dark:bg-brand-950/20 dark:text-brand-400">
            Student Explorer
          </span>
        </div>

        {/* Private Stats breakdown */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 md:col-span-2 space-y-6">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider dark:text-slate-350">Private Statistics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Questions Asked</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.questionsAsked ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Questions Solved</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.questionsSolved ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <CheckCircle className="h-5 w-5 text-teal-505" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Accepted Answers</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.acceptedAnswers ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Top Answers</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.topAnswers ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Award className="h-5 w-5 text-yellow-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">XP / Level</span>
                <span className="font-black text-slate-700 text-xs dark:text-slate-200">{studentProfile?.xp} XP (Lvl {studentProfile?.level})</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">AI Evaluation Score</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.aiScore ?? 0}%</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2">
              <Star className="h-5 w-5 text-brand-500" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Contribution Score</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{statistics?.contributionScore ?? 0} Pts</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
              <div>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-bold">Streak</span>
                <span className="font-black text-slate-700 text-sm dark:text-slate-200">{studentProfile?.streak} Days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      {studentProfile?.badges && studentProfile.badges.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider dark:text-slate-350">Earned Badges</h4>
          <div className="flex flex-wrap gap-3">
            {studentProfile.badges.map((badge: any, i: number) => (
              <span key={i} className="bg-brand-50 dark:bg-brand-950/20 text-brand-655 dark:text-brand-405 border border-brand-200/40 dark:border-brand-950/30 px-3 py-1.5 rounded-xl text-xs font-bold capitalize flex items-center space-x-1.5">
                <Award className="h-4 w-4" />
                <span>{badge.badgeId.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Subject mastery */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
        <h4 className="text-sm font-bold text-slate-805 uppercase tracking-wider dark:text-slate-350 flex items-center space-x-1.5">
          <Star className="h-4.5 w-4.5 text-brand-500" />
          <span>Subject Reputation Matrix</span>
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          {subjects.map((sub) => {
            const rep = studentProfile?.subjectReputation?.[sub._id] || 0;
            return (
              <div key={sub._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 dark:bg-[#0F172A] dark:border-slate-800">
                <div>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-205 block">{sub.name}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{sub.code}</span>
                </div>
                <span className="font-black text-brand-655 text-base dark:text-brand-400">{rep} Rep</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
