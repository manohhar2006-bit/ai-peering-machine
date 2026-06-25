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
  Activity
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/ask-doubt', label: 'Ask Doubt', icon: HelpCircle },
    { to: '/feed', label: 'Doubt Feed', icon: Compass },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/rewards', label: 'Rewards & Badges', icon: Award },
    { to: '/profile', label: 'Profile', icon: User }
  ];

  const teacherLinks = [
    { to: '/teacher-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/monitoring', label: 'Doubt Monitoring', icon: Activity },
    { to: '/teacher/escalations', label: 'Escalation Queue', icon: AlertTriangle },
    { to: '/teacher/analytics', label: 'Analytics', icon: LineChart },
    { to: '/teacher/rules', label: 'Reward Rules', icon: Settings }
  ];

  const links = user.role === 'student' ? studentLinks : teacherLinks;

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] px-4 py-6 dark:border-slate-800 dark:bg-[#1E293B] transition-colors duration-300">
      <nav className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Helpful edtech gamification callout */}
      {user.role === 'student' && (
        <div className="mt-8 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-600 p-4 text-white shadow-premium">
          <h4 className="text-sm font-extrabold">Quest Active!</h4>
          <p className="mt-1 text-xs text-brand-100 leading-relaxed">
            Resolve doubts without using AI hints to gain 1.5x solver multiplier points!
          </p>
        </div>
      )}
    </aside>
  );
};
