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
            navigate('/teacher/dashboard');
          } else {
            navigate('/student/dashboard');
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
      <div className="w-full max-w-md premium-card p-8">
        <div className="flex flex-col items-center space-y-2.5 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-5.5 w-5.5 animate-float" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Welcome Back</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Log in to continue your learning quest</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center space-x-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@school.edu"
                className="w-full premium-input pl-11 py-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full premium-input pl-11 py-3 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full premium-btn-primary py-3 text-xs font-black uppercase tracking-wider"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setEmail('student@demo.com');
              setPassword('student123');
            }}
            className="premium-btn-secondary py-2 text-[10px] font-black uppercase tracking-wider"
          >
            Login as Student
          </button>
          <button
            type="button"
            onClick={() => {
              setEmail('teacher@demo.com');
              setPassword('teacher123');
            }}
            className="premium-btn-secondary py-2 text-[10px] font-black uppercase tracking-wider"
          >
            Login as Faculty
          </button>
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-slate-450 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-extrabold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Register here
          </Link>
        </p>

        {/* Demo hints */}
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 border border-slate-100 text-[10px] text-slate-500 dark:bg-[#0F172A] dark:border-slate-800 font-semibold leading-relaxed">
          <p className="font-black text-slate-400 mb-1.5 uppercase tracking-wider">Quick Demo Logins:</p>
          <ul className="space-y-1">
            <li>• Student: <span className="font-bold text-slate-700 dark:text-slate-300">student@demo.com</span> / student123</li>
            <li>• Student 2: <span className="font-bold text-slate-700 dark:text-slate-300">manohhar@demo.com</span> / manohhar123</li>
            <li>• Teacher: <span className="font-bold text-slate-700 dark:text-slate-300">teacher@demo.com</span> / teacher123</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
