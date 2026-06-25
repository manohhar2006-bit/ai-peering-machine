import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Activity, ShieldAlert, ChevronRight, Search, Clock, HelpCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const DoubtMonitoring: React.FC = () => {
  const [doubts, setDoubts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadAllDoubts = async () => {
      try {
        const response = await axios.get(`${API_URL}/doubts`);
        setDoubts(response.data);
      } catch (err) {
        console.error('Failed to load doubts for monitoring:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAllDoubts();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading monitoring feed...</p>
        </div>
      </div>
    );
  }

  const filteredDoubts = doubts.filter((d) =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-805 dark:text-slate-100">Live Doubt Monitoring</h2>
            <p className="text-sm text-slate-400 font-sans">Supervise the real-time doubt resolution stream across all subjects</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search doubts by title or topic..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all shadow-sm"
        />
      </div>

      {/* Doubts Monitoring Table */}
      <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        {filteredDoubts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
            <HelpCircle className="h-10 w-10 text-slate-350" />
            <p className="font-bold text-slate-650 dark:text-slate-400">No doubt logs found</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 dark:bg-[#0F172A] dark:border-slate-800 text-xs font-bold text-slate-450 uppercase tracking-wider">
                <th className="py-4 px-6">Doubt Info</th>
                <th className="py-4 px-6">Subject / Topic</th>
                <th className="py-4 px-6 text-center">Difficulty</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredDoubts.map((doubt) => (
                <tr key={doubt._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                  <td className="py-4.5 px-6">
                    <div className="font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 max-w-sm">{doubt.title}</div>
                    <div className="text-xs text-slate-400 flex items-center space-x-1.5 mt-0.5">
                      <span>Asker: {doubt.askerId?.name || 'Student'}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-0.5">
                        <Clock className="h-3.5 w-3.5 text-slate-300" />
                        <span>{new Date(doubt.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 font-semibold">
                    <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[10px] font-bold mr-1.5 dark:bg-brand-950/20 dark:text-brand-400">
                      {doubt.subjectId?.code || 'GEN'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{doubt.topic}</span>
                  </td>
                  <td className="py-4.5 px-6 text-center">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full capitalize ${
                      doubt.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                      doubt.difficulty === 'hard' ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-450' :
                      'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {doubt.difficulty}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-center font-bold">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                      doubt.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' :
                      doubt.status === 'escalated' ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400' :
                      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                    }`}>
                      {doubt.status}
                    </span>
                  </td>
                  <td className="py-4.5 px-6 text-right font-semibold">
                    <Link
                      to={`/doubt/${doubt._id}`}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-brand-655 hover:underline"
                    >
                      <span>Moderate Room</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
