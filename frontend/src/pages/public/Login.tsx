import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Wait a moment for context to populate
      setTimeout(() => {
        // Redirection based on credentials or local storage role check
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.role === 'teacher') {
            navigate('/teacher-dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6 py-12 dark:bg-[#0F172A] transition-colors duration-300">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-slate-100 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Welcome Back</h2>
          <p className="text-sm text-slate-400">Log in to continue your learning quest</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center space-x-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-450 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@school.edu"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 dark:focus:bg-[#0F172A] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-450 dark:text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 dark:focus:bg-[#0F172A] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-premium hover:bg-brand-700 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Register here
          </Link>
        </p>

        {/* Demo hints */}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-250/50 text-[11px] text-slate-500 dark:bg-[#0F172A] dark:border-slate-800">
          <p className="font-bold text-slate-650 mb-1 dark:text-slate-400">Quick Demo Logins:</p>
          <ul className="space-y-0.5">
            <li>• Student: <span className="font-bold text-slate-705 dark:text-slate-300">alex@school.edu</span> / password123</li>
            <li>• Student 2: <span className="font-bold text-slate-705 dark:text-slate-300">jane@school.edu</span> / password123</li>
            <li>• Faculty: <span className="font-bold text-slate-705 dark:text-slate-300">teacher@school.edu</span> / password123</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
