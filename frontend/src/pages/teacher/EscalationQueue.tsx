import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, HelpCircle, Clock, CheckCircle } from 'lucide-react';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

export const EscalationQueue: React.FC = () => {
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        const response = await axios.get(`${API_URL}/analytics/escalations`);
        setEscalations(response.data);
      } catch (err) {
        console.error('Failed to load escalation queue:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQueue();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading escalation queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-red-50 text-red-650 rounded-xl flex items-center justify-center dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-805 dark:text-slate-100">Faculty Escalation Queue</h2>
          <p className="text-sm text-slate-400 font-sans">Prioritized tickets flagged by AI routing requiring teacher intervention</p>
        </div>
      </div>

      {/* Queue list */}
      {escalations.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-3 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">All caught up! Queue empty.</h3>
          <p className="text-sm text-slate-450">AI orchestration and peer solvers are keeping resolution rates high.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((esc) => {
            const doubt = esc.doubtId;
            if (!doubt) return null;

            return (
              <div
                key={esc._id}
                className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm hover:shadow-premium transition-all duration-300 dark:bg-[#1E293B] dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 max-w-[70%]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-red-50 text-red-650 px-2.5 py-0.5 rounded text-[10px] font-extrabold dark:bg-red-950/20 dark:text-red-400">
                      Reason: {esc.reason.replace('-', ' ')}
                    </span>
                    <span className="bg-slate-100 text-slate-655 px-2.5 py-0.5 rounded text-[10px] font-bold dark:bg-slate-800 dark:text-slate-400">
                      {doubt.subjectId?.code || 'GEN'}
                    </span>
                    <span className="bg-slate-100 text-slate-655 px-2.5 py-0.5 rounded text-[10px] font-bold dark:bg-slate-800 dark:text-slate-400">
                      {doubt.topic}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base dark:text-slate-105">{doubt.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400 leading-relaxed italic">
                    {doubt.inputType === 'text' ? doubt.description : `[Attached ${doubt.inputType?.toUpperCase()}]`}
                  </p>

                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 pt-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Escalated: {new Date(esc.escalatedAt).toLocaleDateString()} at {new Date(esc.escalatedAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <Link
                  to={`/doubt/${doubt._id}`}
                  className="w-full md:w-auto rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 text-xs shadow-premium flex items-center justify-center space-x-1 transition-all"
                >
                  <span>Resolve Doubt</span>
                  <ChevronRight className="h-4.5 w-4.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
