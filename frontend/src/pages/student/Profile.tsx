import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { User, Award, Flame, BookOpen, Star, Sparkles } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const Profile: React.FC = () => {
  const { user, studentProfile, refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        await refreshProfile();
        const response = await axios.get(`${API_URL}/subjects`);
        setSubjects(response.data);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    loadSubjects();
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <User className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Student Profile</h2>
          <p className="text-sm text-slate-400">Your gamer statistics and academic reputation scores</p>
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

        {/* Gamified stats breakdown */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 md:col-span-2 space-y-6">
          <h4 className="text-sm font-bold text-slate-805 uppercase tracking-wider dark:text-slate-300">Quest Statistics</h4>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 dark:bg-indigo-950/20">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total XP</span>
                <span className="font-black text-slate-700 text-lg dark:text-slate-205">{studentProfile?.xp} XP</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 dark:bg-orange-950/20">
                <Flame className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-slate-405 uppercase tracking-wider block font-bold">Active Streak</span>
                <span className="font-black text-slate-700 text-lg dark:text-slate-205">{studentProfile?.streak} Days</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 bg-emerald-55/10 rounded-xl flex items-center justify-center text-emerald-500 dark:bg-emerald-950/20">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-405 uppercase tracking-wider block font-bold">Solved Doubts</span>
                <span className="font-black text-slate-700 text-lg dark:text-slate-205">{studentProfile?.resolvedDoubtsCount} Resolved</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-500 dark:bg-sky-950/20">
                <Sparkles className="h-6 w-6 text-brand-500" />
              </div>
              <div>
                <span className="text-[10px] text-slate-405 uppercase tracking-wider block font-bold">Current Level</span>
                <span className="font-black text-slate-700 text-lg dark:text-slate-205">Level {studentProfile?.level}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200 block">{sub.name}</span>
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
