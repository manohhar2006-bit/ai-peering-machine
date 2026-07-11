import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  HelpCircle,
  Compass,
  Trophy,
  Award,
  User,
  AlertTriangle,
  Settings,
  LineChart,
  Activity,
  Users,
  BookOpen,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/learning-hub', label: 'My Learning Hub', icon: BookOpen },
    { to: '/ask-doubt', label: 'Ask Doubt', icon: HelpCircle },
    { to: '/feed', label: 'Doubt Feed', icon: Compass },
    { to: '/student/focus-rooms', label: 'Focus Rooms', icon: Users },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/rewards', label: 'Rewards & Badges', icon: Award },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  const teacherLinks = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/my-students', label: 'My Students', icon: Users },
    { to: '/teacher/progress', label: 'Student Progress', icon: LineChart },
    { to: '/teacher/focus-rooms', label: 'Focus Rooms', icon: Users },
    { to: '/teacher/monitoring', label: 'Doubt Monitoring', icon: Activity },
    { to: '/teacher/escalations', label: 'Escalation Queue', icon: AlertTriangle },
    { to: '/teacher/rules', label: 'Reward Rules', icon: Settings }
  ];

  const links = user.role === 'student' ? studentLinks : teacherLinks;

  return (
    <aside className="w-64 border-r border-slate-100 bg-white min-h-[calc(100vh-4rem)] px-4 py-8 dark:border-slate-800/80 dark:bg-[#1E293B] transition-all duration-350 select-none flex flex-col justify-between">
      <div className="space-y-6">
        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `group flex items-center space-x-3 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-[0.98] ${
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/25 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-205'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{link.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Helpful edtech gamification callout */}
      {user.role === 'student' && (
        <div className="mt-8 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-600 p-5 text-white shadow-premium hover:shadow-premium-hover transition-all duration-300">
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-4 w-4 animate-float text-yellow-350" />
            <span>Quest Active!</span>
          </h4>
          <p className="mt-1.5 text-[11px] text-brand-100 leading-relaxed font-semibold">
            Resolve doubts without using AI hints to gain 1.5x solver multiplier points!
          </p>
        </div>
      )}
    </aside>
  );
};
