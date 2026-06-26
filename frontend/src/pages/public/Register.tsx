import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Trophy, Mail, Lock, User, AlertCircle, Loader2, BookOpen } from 'lucide-react';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password, role, role === 'teacher' ? department : undefined);
      setTimeout(() => {
        if (role === 'teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-6 py-12 dark:bg-[#0F172A] transition-colors duration-300">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-slate-100 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        <div className="flex flex-col items-center space-y-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Create Account</h2>
          <p className="text-sm text-slate-400">Join our collaborative learning platform</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center space-x-2 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-400">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl dark:bg-[#0F172A]">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                role === 'student'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              STUDENT ROLE
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                role === 'teacher'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-550 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              FACULTY ROLE
            </button>
          </div>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@school.edu"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Department (Teacher Only) */}
          {role === 'teacher' && (
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Department</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Mathematics / Engineering"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
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
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
