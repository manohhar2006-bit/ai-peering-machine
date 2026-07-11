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
      <div className="w-full max-w-md premium-card p-8">
        <div className="flex flex-col items-center space-y-2.5 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-400 text-white shadow-premium">
            <Trophy className="h-5.5 w-5.5 animate-float" />
          </div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">Create Account</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Join our collaborative learning platform</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center space-x-2 rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-955/20 dark:text-red-400">
            <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl dark:bg-[#0F172A] mb-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                role === 'student'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              STUDENT ROLE
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                role === 'teacher'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              FACULTY ROLE
            </button>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full premium-input pl-11 text-xs"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@school.edu"
                className="w-full premium-input pl-11 text-xs"
              />
            </div>
          </div>

          {/* Department (Teacher Only) */}
          {role === 'teacher' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</label>
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Mathematics / Engineering"
                  className="w-full premium-input pl-11 text-xs"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full premium-input pl-11 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full premium-btn-primary py-3 text-xs font-black uppercase tracking-wider mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-semibold text-slate-450 dark:text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-extrabold text-brand-600 hover:text-brand-700 dark:text-brand-400">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
};
