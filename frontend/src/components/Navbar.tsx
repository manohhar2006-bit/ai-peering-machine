import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Flame, Trophy, Award, BookOpen, Sun, Moon, Monitor, ChevronDown, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, studentProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [aiStatus, setAiStatus] = useState<'online' | 'busy' | 'offline'>('online');
  const [muted, setMuted] = useState(() => localStorage.getItem('gamification_sound_muted') === 'true');

  useEffect(() => {
    const handleAiStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setAiStatus(customEvent.detail);
      }
    };
    window.addEventListener('ai-status', handleAiStatus);
    return () => {
      window.removeEventListener('ai-status', handleAiStatus);
    };
  }, []);

  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setMuted(customEvent.detail);
    };
    window.addEventListener('sound-mute-changed', handleMuteChange);
    return () => {
      window.removeEventListener('sound-mute-changed', handleMuteChange);
    };
  }, []);

  const toggleMute = () => {
    const newMuted = !muted;
    setMuted(newMuted);
    localStorage.setItem('gamification_sound_muted', String(newMuted));
    window.dispatchEvent(new CustomEvent('sound-mute-changed', { detail: newMuted }));
  };

  const nextLevelXp = studentProfile ? studentProfile.level * 500 : 500;
  const prevLevelXp = studentProfile ? (studentProfile.level - 1) * 500 : 0;
  const currentLevelProgressXp = studentProfile ? studentProfile.xp - prevLevelXp : 0;
  const levelProgressPercent = studentProfile
    ? Math.min(100, Math.max(0, (currentLevelProgressXp / 500) * 100))
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#1E293B]/80 transition-all duration-300">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-4.5 w-4.5 animate-float" />
          </div>
          <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-lg font-black tracking-tight text-transparent uppercase">
            Agentic Quest
          </span>
        </Link>

        {/* User Stats / Actions */}
        <div className="flex items-center space-x-4">
          {user && user.role === 'student' && studentProfile && (
            <div className="hidden md:flex items-center space-x-4">
              {/* Streak Counter */}
              <div className="flex items-center space-x-1.5 rounded-full bg-amber-50/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 border border-amber-100 dark:bg-amber-955/15 dark:border-amber-900/30">
                <Flame className="h-4 w-4 fill-amber-500 animate-pulse text-amber-500" />
                <span>{studentProfile.streak} Day Streak</span>
              </div>

              {/* Coins Counter */}
              <div className="flex items-center space-x-1.5 rounded-full bg-yellow-50/60 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-600 border border-yellow-150 dark:bg-yellow-955/15 dark:border-yellow-900/30">
                <span className="text-xs leading-none">🪙</span>
                <span>{studentProfile.coins || 0} Coins</span>
              </div>

              {/* Sound Toggle */}
              <button
                onClick={toggleMute}
                title={muted ? "Unmute sounds" : "Mute sounds"}
                className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#0F172A] transition-all text-slate-500 dark:text-slate-400 active:scale-95 cursor-pointer"
              >
                {muted ? <VolumeX className="h-4 w-4 text-rose-500" /> : <Volume2 className="h-4 w-4 text-emerald-500" />}
              </button>

              {/* XP Level Progress */}
              <div className="flex flex-col w-40 space-y-1">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Level {studentProfile.level}</span>
                  <span>{studentProfile.xp} / {nextLevelXp} XP</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all duration-500"
                    style={{ width: `${levelProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Total points */}
              <div className="flex items-center space-x-2 rounded-xl bg-slate-50/60 p-2 text-xs border border-slate-150 dark:bg-[#1E293B]/60 dark:border-slate-800 transition-all duration-300">
                <Award className="h-4.5 w-4.5 text-brand-500" />
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">RESOLVED</div>
                  <div className="font-extrabold text-slate-700 dark:text-slate-350">{studentProfile.resolvedDoubtsCount} doubts</div>
                </div>
              </div>
            </div>
          )}

          {user && user.role === 'teacher' && (
            <div className="hidden sm:flex items-center space-x-2 rounded-xl bg-brand-50/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-655 border border-brand-100 dark:bg-brand-955/15 dark:text-brand-400 dark:border-brand-900/30">
              <BookOpen className="h-3.5 w-3.5" />
              <span>FACULTY DASHBOARD</span>
            </div>
          )}

          {/* AI Status Indicator */}
          <div className="flex items-center space-x-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all bg-slate-50/60 border-slate-150 dark:bg-slate-900/60 dark:border-slate-800">
            <span className={`h-1.5 w-1.5 rounded-full ${
              aiStatus === 'online' 
                ? 'bg-emerald-500 animate-pulse' 
                : aiStatus === 'busy' 
                ? 'bg-amber-500 animate-ping' 
                : 'bg-rose-500 animate-pulse'
            }`} />
            <span className="text-slate-500 dark:text-slate-400">
              {aiStatus === 'online' ? 'AI Online' : aiStatus === 'busy' ? 'AI Busy' : 'AI Offline'}
            </span>
          </div>

          {/* Theme Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="flex h-8.5 items-center space-x-2 rounded-xl bg-slate-50 px-3 text-slate-550 border border-slate-200 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-405 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-[10px] font-black uppercase tracking-wider cursor-pointer"
              title="Change Theme"
            >
              {theme === 'light' && <Sun className="h-3.5 w-3.5 text-amber-550" />}
              {theme === 'dark' && <Moon className="h-3.5 w-3.5 text-brand-400" />}
              {theme === 'system' && <Monitor className="h-3.5 w-3.5 text-slate-400" />}
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
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => { setTheme('dark'); setShowThemeDropdown(false); }}
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-550 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 text-brand-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => { setTheme('system'); setShowThemeDropdown(false); }}
                    className={`flex w-full items-center space-x-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      theme === 'system'
                        ? 'bg-slate-50 text-brand-600 dark:bg-slate-800 dark:text-brand-400'
                        : 'text-slate-550 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5 text-slate-400" />
                    <span>System</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {user ? (
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 dark:border-slate-800">
              {/* User Identity */}
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{user.name}</span>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">{user.role}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Log Out"
                className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-200 hover:border-red-200/50 transition-all dark:bg-[#1E293B] dark:border-slate-800 dark:hover:bg-red-955/20 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-xs font-extrabold uppercase tracking-wider text-slate-500 hover:text-brand-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-premium hover:bg-brand-700 transition-all"
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
