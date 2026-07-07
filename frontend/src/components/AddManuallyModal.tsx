import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface AddManuallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onSuccess: () => void;
}

export const AddManuallyModal: React.FC<AddManuallyModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setRollNumber('');
      setEmail('');
      setBranch('');
      setSection('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNumber.trim()) {
      setErrorMessage('Student Name and Roll Number are required.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/members/manual`,
        {
          name: name.trim(),
          rollNumber: rollNumber.trim(),
          email: email.trim() || undefined,
          branch: branch.trim() || undefined,
          section: section.trim() || undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert('Student added successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add student manually:', err);
      // Retrieve the specific error message from the backend response
      const serverMessage = err.response?.data?.message || 'Failed to manually add student.';
      setErrorMessage(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
      <div className="w-full max-w-md bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-50 text-brand-650 rounded-xl dark:bg-brand-950/20 dark:text-brand-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-850 dark:text-slate-105">Add Student Manually</h2>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">Enrolling in: {roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start space-x-2 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 p-3.5 rounded-2xl text-xs font-semibold">
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Student Name *</label>
            <input
              type="text"
              required
              placeholder="E.g., Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Roll Number *</label>
            <input
              type="text"
              required
              placeholder="E.g., CS2026001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Email Address (Optional)</label>
            <input
              type="email"
              placeholder="E.g., alex@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Branch (Optional)</label>
              <input
                type="text"
                placeholder="E.g., Computer Science"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider block">Section (Optional)</label>
              <input
                type="text"
                placeholder="E.g., A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-slate-205 bg-white hover:bg-slate-55 text-slate-655 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-black bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center space-x-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Enroll Student</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
