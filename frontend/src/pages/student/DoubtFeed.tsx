import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Compass, Filter, Sparkles, Clock, MessageSquare, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

export const DoubtFeed: React.FC = () => {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [recommendedOnly, setRecommendedOnly] = useState(false);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSubject) params.subjectCode = selectedSubject;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedStatus) params.status = selectedStatus;
      if (recommendedOnly) params.recommendedOnly = true;

      const response = await axios.get(`${API_URL}/doubts`, { params });
      setDoubts(response.data);
    } catch (err) {
      console.error('Failed to retrieve doubts feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const response = await axios.get(`${API_URL}/subjects`);
        setSubjects(response.data);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [selectedSubject, selectedDifficulty, selectedStatus, recommendedOnly]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-sans">Active Doubt Quests</h2>
            <p className="text-sm text-slate-400">Review, answer, and resolve peer doubts to claim rewards</p>
          </div>
        </div>
        <Link
          to="/ask-doubt"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-premium hover:bg-brand-700 transition-all text-center"
        >
          Post a New Doubt
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mr-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-350"
          >
            <option value="">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub._id} value={sub.code}>
                {sub.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-350"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-600 focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-350"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        {/* AI Recommendations Toggle */}
        <button
          onClick={() => setRecommendedOnly(!recommendedOnly)}
          className={`flex items-center space-x-1.5 rounded-xl px-4.5 py-2 text-xs font-bold transition-all border ${
            recommendedOnly
              ? 'bg-gradient-to-tr from-brand-600 to-accent-500 text-white border-transparent shadow-sm'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-400'
          }`}
        >
          <Sparkles className={`h-4 w-4 ${recommendedOnly ? 'animate-pulse' : ''}`} />
          <span>Recommended For You</span>
        </button>
      </div>

      {/* Doubts Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-white border border-slate-100 shadow-sm animate-pulse dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300" />
          ))}
        </div>
      ) : doubts.length === 0 ? (
        <div className="rounded-3xl bg-white border border-slate-100 p-12 text-center flex flex-col items-center justify-center space-y-3 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <Compass className="h-12 w-12 text-slate-300" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">No doubt quests match your filters</h3>
          <p className="text-sm text-slate-450">Try resetting filters or post a new doubt query to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {doubts.map((doubt) => {
            const isEscalated = doubt.status === 'escalated';
            const isResolved = ['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status);

            return (
              <div
                key={doubt._id}
                className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-premium transition-all duration-300 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                    <span className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-lg text-[10px] font-bold dark:bg-brand-950/20 dark:text-brand-400">
                      {doubt.subjectId?.code || 'GEN'}
                    </span>
                    <span className="bg-slate-100 text-slate-655 px-2.5 py-1 rounded-lg text-[10px] font-bold dark:bg-slate-800 dark:text-slate-400">
                      {doubt.topic}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450'
                        : isEscalated
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-450'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                    }`}
                  >
                    {doubt.status}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-base line-clamp-1 group-hover:text-brand-650 transition-colors dark:text-slate-105">
                  {doubt.title}
                </h3>
                <p className="mt-2 text-xs text-slate-500 line-clamp-2 dark:text-slate-400 mb-4 leading-relaxed italic">
                  {doubt.inputType === 'text' ? doubt.description : `[Attached ${doubt.inputType?.toUpperCase()}]`}
                </p>

                <hr className="border-slate-50 dark:border-slate-800 mb-4" />

                <div className="flex justify-between items-center text-xs text-slate-450">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-350">
                      Asked by: {doubt.askerId?.name || 'Student'}
                    </span>
                  </div>
                  <Link
                    to={`/doubt/${doubt._id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-brand-600 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Enter Room</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
