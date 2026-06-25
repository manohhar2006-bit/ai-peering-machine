import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Flame, Trophy, Award, BookOpen, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, studentProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const nextLevelXp = studentProfile ? studentProfile.level * 500 : 500;
  const prevLevelXp = studentProfile ? (studentProfile.level - 1) * 500 : 0;
  const currentLevelProgressXp = studentProfile ? studentProfile.xp - prevLevelXp : 0;
  const levelProgressPercent = studentProfile
    ? Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-[#1E293B]/80 transition-colors duration-300">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-5 w-5 animate-float" />
          </div>
          <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Agentic Quest
          </span>
        </Link>

        {/* User Stats / Actions */}
        <div className="flex items-center space-x-6">
          {user && user.role === 'student' && studentProfile && (
            <div className="hidden md:flex items-center space-x-6">
              {/* Streak Counter */}
              <div className="flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-600 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-900/40">
                <Flame className="h-4.5 w-4.5 fill-amber-500 animate-pulse text-amber-500" />
                <span>{studentProfile.streak} Day Streak</span>
              </div>

              {/* XP Level Progress */}
              <div className="flex flex-col w-48 space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Level {studentProfile.level}</span>
                  <span>{studentProfile.xp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-500"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Total points */}
              <div className="flex items-center space-x-2 rounded-xl bg-slate-50 p-2 text-sm border border-slate-200 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
                <Award className="h-5 w-5 text-brand-500" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">RESOLVED</div>
                  <div className="font-extrabold text-slate-700 dark:text-slate-200">{studentProfile.resolvedDoubtsCount} doubts</div>
                </div>
              </div>
            </div>
          )}

          {user && user.role === 'teacher' && (
            <div className="hidden sm:flex items-center space-x-2 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 border border-brand-200/40 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/40">
              <BookOpen className="h-4 w-4" />
              <span>FACULTY DASHBOARD</span>
            </div>
          )}

          {/* Theme Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="flex h-9 items-center space-x-2 rounded-xl bg-slate-50 px-3 text-slate-600 border border-slate-200 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              title="Change Theme"
            >
              {theme === 'light' && <Sun className="h-4 w-4 text-amber-500" />}
              {theme === 'dark' && <Moon className="h-4 w-4 text-brand-400" />}
              {theme === 'system' && <Monitor className="h-4 w-4 text-slate-400" />}
              <span className="capitalize hidden sm:inline">{theme}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showThemeDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowThemeDropdown(false)} 
                />
                <div className="absolute right-0 mt-2 w-32 rounded-2xl border border-slate-150 bg-white p-1.5 shadow-premium dark:border-slate-800 dark:bg-[#1E293B] z-50 animate-float">
                  <button
                    onClick={() => { setTheme('light'); setShowThemeDropdown(false); }}
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      theme === 'light'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="h-4 w-4 text-brand-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => { setTheme('system'); setShowThemeDropdown(false); }}
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      theme === 'system'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Monitor className="h-4 w-4 text-slate-400" />
                    <span>System</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {user ? (
            <div className="flex items-center space-x-4 border-l border-slate-200 pl-6 dark:border-slate-800">
              {/* User Identity */}
              <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.name}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{user.role}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Log Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-200 hover:border-red-200/50 transition-all dark:bg-[#1E293B] dark:border-slate-800 dark:hover:bg-red-950/20"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-premium hover:bg-brand-700 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
