import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HelpCircle, Sparkles, Brain, CheckCircle, Users, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const AskDoubt: React.FC = () => {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get(`${API_URL}/subjects`);
        setSubjects(response.data);
        if (response.data.length > 0) {
          setSubjectCode(response.data[0].code);
        }
      } catch (err) {
        console.error('Failed to retrieve subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subjectCode) return;

    setLoading(true);
    setAnalysis(null);

    try {
      const response = await axios.post(`${API_URL}/doubts`, {
        title,
        description,
        subjectCode
      });
      
      setAnalysis(response.data.analysis);
      setPeers(response.data.suggestedPeers || []);
      setSubmitting(true);
      await refreshProfile(); // Refresh XP for posting
    } catch (err) {
      console.error('Failed to post doubt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    navigate('/feed');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="flex items-center space-x-3 mb-2">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Initiate a Doubt Quest</h2>
          <p className="text-sm text-slate-400">Submit your query for AI routing and peer assistance</p>
        </div>
      </div>

      {!submitting ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-premium space-y-6 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Subject Classification</label>
            <select
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            >
              {subjects.map((sub) => (
                <option key={sub._id} value={sub.code}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Doubt Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How to solve the Squeeze Theorem limit for sin(x)/x?"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Detailed Description (Optional)</label>
            <textarea
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you have tried, where you are getting stuck, and any equations or code snippets..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-premium hover:bg-brand-700 transition-all flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>AI analyzing & routing query...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>Submit to Quest Board</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-premium space-y-8 dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-305 animate-pulse-soft">
          <div className="flex flex-col items-center justify-center space-y-3 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-55 px-2.5 py-2.5 flex items-center justify-center bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100">Doubt Dispatched Successfully!</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-brand-600">
              +25 XP Awarded for meaningful participation
            </p>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* AI Analysis Cards */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 dark:text-slate-350">
              <Brain className="h-5 w-5 text-brand-500" />
              <span>Orchestrator AI Classification:</span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center dark:bg-[#0F172A] dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Detected Topic</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{analysis?.topic || 'General'}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center dark:bg-[#0F172A] dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Difficulty</span>
                <span className={`text-sm font-bold capitalize ${
                  analysis?.difficulty === 'easy' ? 'text-emerald-500' : analysis?.difficulty === 'hard' ? 'text-red-500' : 'text-amber-500'
                }`}>
                  {analysis?.difficulty || 'medium'}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center dark:bg-[#0F172A] dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Peer Answerable</span>
                <span className={`text-sm font-bold ${analysis?.isPeerAnswerable ? 'text-emerald-500' : 'text-red-500'}`}>
                  {analysis?.isPeerAnswerable ? 'High Probability' : 'Low Probability'}
                </span>
              </div>
            </div>

            <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100 text-sm text-slate-600 leading-relaxed dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-400">
              <span className="font-bold text-brand-700 block mb-1 dark:text-brand-400">AI Concept Breakdown:</span>
              {analysis?.explanation}
            </div>
          </div>

          {/* Peer recommendations */}
          {peers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 dark:text-slate-350">
                <Users className="h-5 w-5 text-accent-500" />
                <span>AI Recommended Solvers Routed:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {peers.map((peer) => (
                  <span
                    key={peer.id}
                    className="bg-accent-50 text-accent-700 border border-accent-200/50 px-3 py-1.5 rounded-full text-xs font-bold dark:bg-accent-950/20 dark:text-accent-400"
                  >
                    @{peer.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDone}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 shadow-premium transition-all"
          >
            Go to Doubt Feed
          </button>
        </div>
      )}
    </div>
  );
};
