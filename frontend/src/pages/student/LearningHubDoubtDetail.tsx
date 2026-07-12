import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
  BookOpen,
  ThumbsUp,
  Brain,
  List,
  AlertTriangle,
  Lightbulb,
  FileText,
  User,
  Activity,
  LineChart,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

export const LearningHubDoubtDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doubt, setDoubt] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'question' | 'all-answers' | 'top-answers' | 'consensus' | 'analytics'>('question');

  // Question Edit Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editDiff, setEditDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [updating, setUpdating] = useState(false);

  // Sorting State for Answers
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'helpful' | 'highest-ai'>('newest');

  // AI Consensus State
  const [consensusData, setConsensusData] = useState<any>(null);
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensusError, setConsensusError] = useState<'busy' | 'timeout' | null>(null);

  // Analytics computed states
  const [views, setViews] = useState(0);
  const [timeToFirst, setTimeToFirst] = useState<string>('N/A');

  const fetchDoubtDetails = async () => {
    try {
      setLoading(true);
      const doubtRes = await axios.get(`${API_URL}/doubts/${id}`);
      setDoubt(doubtRes.data.doubt);
      setViews(doubtRes.data.doubt?.views || 0);

      // Fetch answers
      const answersRes = await axios.get(`${API_URL}/answers/doubt/${id}`);
      const list = answersRes.data.answers || answersRes.data || [];
      setAnswers(list);

      // Compute time to first answer
      if (list.length > 0 && doubtRes.data.doubt) {
        const firstCreated = new Date(Math.min(...list.map((a: any) => new Date(a.createdAt).getTime())));
        const doubtCreated = new Date(doubtRes.data.doubt.createdAt);
        const diffMs = firstCreated.getTime() - doubtCreated.getTime();
        const diffMins = Math.round(diffMs / (1000 * 60));
        
        if (diffMins < 60) {
          setTimeToFirst(`${diffMins} min`);
        } else {
          setTimeToFirst(`${Math.round(diffMins / 60)} hrs`);
        }
      } else {
        setTimeToFirst('N/A');
      }

      // Initialize edit fields
      if (doubtRes.data.doubt) {
        setEditTitle(doubtRes.data.doubt.title || '');
        setEditDesc(doubtRes.data.doubt.description || doubtRes.data.doubt.question || '');
        setEditTopic(doubtRes.data.doubt.topic || 'General');
        setEditDiff(doubtRes.data.doubt.difficulty || 'medium');
      }
    } catch (err) {
      console.error('Failed to load doubt workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsensus = async () => {
    try {
      setConsensusLoading(true);
      setConsensusError(null);
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'busy' }));
      
      const response = await axios.get(`${API_URL}/ai/consensus/${id}`);
      
      // Check if backend returned structured error
      if (response.data && response.data.success === false && response.data.status === 'AI_BUSY') {
        window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
        setConsensusError('busy');
        setConsensusLoading(false);
        return;
      }

      setConsensusData(response.data);
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'online' }));
    } catch (err: any) {
      console.error('Failed to generate AI Consensus:', err);
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
      
      const errMsg = err.response?.data?.message || err.message || '';
      if (errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || err.code === 'ECONNABORTED') {
        setConsensusError('timeout');
      } else {
        setConsensusError('busy');
      }
    } finally {
      setConsensusLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDoubtDetails();
    }
  }, [id]);

  useEffect(() => {
    if (activeSubTab === 'consensus' && !consensusData) {
      fetchConsensus();
    }
  }, [activeSubTab]);

  const handleEditDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const response = await axios.put(`${API_URL}/doubts/${id}`, {
        title: editTitle,
        description: editDesc,
        question: editDesc,
        topic: editTopic,
        difficulty: editDiff
      });
      setDoubt(response.data.doubt);
      setIsEditing(false);
      alert('Question updated successfully!');
    } catch (err) {
      console.error('Failed to edit doubt:', err);
      alert('Could not update the question.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteDoubt = async () => {
    if (window.confirm('Are you absolutely sure you want to delete this doubt? This will delete all answers and AI metrics.')) {
      try {
        await axios.delete(`${API_URL}/doubts/${id}`);
        alert('Doubt deleted.');
        navigate('/student/learning-hub');
      } catch (err) {
        console.error('Failed to delete doubt:', err);
        alert('Could not delete the doubt.');
      }
    }
  };

  const handleResolveDoubt = async () => {
    try {
      const response = await axios.patch(`${API_URL}/doubts/${id}/status`, { status: 'peer_solved' });
      setDoubt(response.data.doubt);
      alert('Question marked as resolved!');
    } catch (err) {
      console.error('Failed to resolve doubt:', err);
      alert('Could not update question status.');
    }
  };

  // Badges styling
  const getQualityBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' };
    if (score >= 70) return { label: 'Very Helpful', style: 'bg-teal-100 text-teal-850 dark:bg-teal-950/30 dark:text-teal-400' };
    if (score >= 50) return { label: 'Good', style: 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' };
    return { label: 'Needs Improvement', style: 'bg-amber-100 text-amber-850 dark:bg-amber-950/30 dark:text-amber-400' };
  };

  // Sorting logic
  const sortedAnswers = [...answers].sort((a, b) => {
    const scoreA = a.aiScore || a.aiEvaluation?.score || 0;
    const scoreB = b.aiScore || b.aiEvaluation?.score || 0;

    if (sortOption === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOption === 'helpful') {
      return (b.pointsAwarded || 0) - (a.pointsAwarded || 0);
    }
    if (sortOption === 'highest-ai') {
      return scoreB - scoreA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
  });

  // Top Answers filter: Score >= 90% or Teacher Approved
  const topAnswersList = answers.filter((a: any) => {
    const score = a.aiScore || a.aiEvaluation?.score || 0;
    return score >= 90 || a.isTeacherVerified || a.teacherApproved;
  });

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Opening Doubt Workspace...</p>
        </div>
      </div>
    );
  }

  if (!doubt) {
    return (
      <div className="text-center py-20 font-sans">
        <HelpCircle className="h-16 w-16 text-slate-350 mx-auto mb-4 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Doubt Workspace Not Found</h3>
        <button onClick={() => navigate('/student/learning-hub')} className="mt-4 text-sm text-brand-600 hover:underline">
          Return to Learning Hub
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto font-sans">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/student/learning-hub')}
        className="inline-flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-bold transition-all"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Learning Hub</span>
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400">
            {doubt.subjectId?.name || 'General Subject'}
          </span>
          <div className="flex gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-50 border dark:bg-slate-900 dark:border-slate-800 text-slate-500">
              Difficulty: {doubt.difficulty}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
              ['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status)
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                : doubt.status === 'escalated'
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                : 'bg-sky-50 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400'
            }`}>
              {doubt.status}
            </span>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
          {doubt.title}
        </h2>

        <div className="flex gap-5 text-xs text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Asked on {new Date(doubt.createdAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {views} Views
          </span>
        </div>
      </div>

      {/* Sub-tabs switch */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-5 overflow-x-auto pb-1.5">
        <button
          onClick={() => setActiveSubTab('question')}
          className={`pb-3 text-xs md:text-sm font-bold whitespace-nowrap relative transition-all ${
            activeSubTab === 'question'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          ❓ Question
          {activeSubTab === 'question' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('all-answers')}
          className={`pb-3 text-xs md:text-sm font-bold whitespace-nowrap relative transition-all ${
            activeSubTab === 'all-answers'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          💬 All Answers ({answers.length})
          {activeSubTab === 'all-answers' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('top-answers')}
          className={`pb-3 text-xs md:text-sm font-bold whitespace-nowrap relative transition-all ${
            activeSubTab === 'top-answers'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          🏆 Top Answers ({topAnswersList.length})
          {activeSubTab === 'top-answers' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('consensus')}
          className={`pb-3 text-xs md:text-sm font-bold whitespace-nowrap relative transition-all ${
            activeSubTab === 'consensus'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          🤖 AI Consensus
          {activeSubTab === 'consensus' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`pb-3 text-xs md:text-sm font-bold whitespace-nowrap relative transition-all ${
            activeSubTab === 'analytics'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          📊 Analytics
          {activeSubTab === 'analytics' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
      </div>

      {/* ======================================================
          SUB-TAB 1: QUESTION
          ====================================================== */}
      {activeSubTab === 'question' && (
        <div className="space-y-6">
          {!isEditing ? (
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              {doubt.inputType === 'text' ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Question Description</span>
                  <p className="text-slate-750 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {doubt.description || doubt.question}
                  </p>
                </div>
              ) : (
                doubt.originalUploadUrl && (
                  <div className="space-y-4 pt-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Uploaded Question Material ({doubt.inputType?.toUpperCase()})</span>
                    {doubt.inputType === 'image' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(() => {
                          let urls: string[] = [];
                          if (doubt.originalUploadUrl.startsWith('[')) {
                            try {
                              urls = JSON.parse(doubt.originalUploadUrl);
                            } catch (e) {
                              urls = [doubt.originalUploadUrl];
                            }
                          } else {
                            urls = [doubt.originalUploadUrl];
                          }
                          return urls.map((url, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 p-2 flex items-center justify-center shadow-sm">
                              <img src={url} alt={`Student upload ${idx + 1}`} className="max-h-[300px] object-contain" />
                            </div>
                          ));
                        })()}
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 h-[450px]">
                        <iframe src={doubt.originalUploadUrl} className="w-full h-full border-none" title="Student pdf upload" />
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Doubt Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Topic classification</span>
                  <span className="block font-extrabold text-slate-800 dark:text-slate-100">{doubt.topic || 'General'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">AI Difficulty Assessment</span>
                  <span className="block font-extrabold text-slate-800 dark:text-slate-100 capitalize">{doubt.difficulty || 'Medium'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Views Count</span>
                  <span className="block font-extrabold text-slate-800 dark:text-slate-100">{views} views</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">Submit Answers Count</span>
                  <span className="block font-extrabold text-slate-800 dark:text-slate-100">{answers.length} answers</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50 dark:border-slate-800">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 border border-slate-205 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Question</span>
                </button>
                <button
                  onClick={handleDeleteDoubt}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-red-50 text-red-650 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Question</span>
                </button>
                {!['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status) && (
                  <button
                    onClick={handleResolveDoubt}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-650 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold shadow-md transition-all ml-auto"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Mark as Resolved</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Editing form */
            <form onSubmit={handleEditDoubt} className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Edit Doubt Details</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Doubt Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400">Doubt Description / Question Text</label>
                <textarea
                  required
                  rows={6}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Topic</label>
                  <input
                    type="text"
                    required
                    value={editTopic}
                    onChange={e => setEditTopic(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Difficulty</label>
                  <select
                    value={editDiff}
                    onChange={e => setEditDiff(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-850 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ======================================================
          SUB-TAB 2: ALL ANSWERS
          ====================================================== */}
      {activeSubTab === 'all-answers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <span className="text-xs text-slate-400">Submissions are anonymous to protect student identity.</span>
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-bold">Sort by</span>
              <select
                value={sortOption}
                onChange={e => setSortOption(e.target.value as any)}
                className="p-1.5 border border-slate-205 rounded-lg bg-white dark:bg-[#1E293B] dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="helpful">Most Helpful</option>
                <option value="highest-ai">Highest AI Score</option>
              </select>
            </div>
          </div>

          {sortedAnswers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <Clock className="h-12 w-12 text-slate-350 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-350">No answers submitted yet</h4>
              <p className="text-slate-400 mt-1 text-sm">Classmates have not yet posted solutions for this doubt.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedAnswers.map((ans: any) => {
                const scoreValue = ans.aiScore || (ans.aiEvaluation && (ans.aiEvaluation.score ?? ans.aiEvaluation.usefulness)) || 0;
                const badge = getQualityBadge(scoreValue);
                return (
                  <div key={ans._id} className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-slate-800 dark:text-slate-200">
                            {ans.solverName || 'Anonymous Contributor'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Submitted on {new Date(ans.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 justify-end">
                        {ans.teacherApproved && (
                          <span className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200/50">
                            <ShieldCheck className="h-3.5 w-3.5" /> Faculty Approved
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badge.style}`}>
                          AI: {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-800">
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                        "{ans.content}"
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-450 dark:text-slate-400">
                      <span>AI Score: <strong className="text-slate-850 dark:text-slate-200">{scoreValue}%</strong></span>
                      <span>•</span>
                      <span>Awarded: <strong className="text-brand-605 dark:text-brand-400">+{ans.pointsAwarded || 0} XP</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          SUB-TAB 3: TOP ANSWERS
          ====================================================== */}
      {activeSubTab === 'top-answers' && (
        <div className="space-y-6">
          {topAnswersList.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <Award className="h-12 w-12 text-slate-350 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 font-sans">No Top Answers found</h4>
              <p className="text-slate-400 mt-1 text-sm">Top Answers must satisfy an AI Score of 90%+ or have official Teacher Verification.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {topAnswersList.map((ans: any) => {
                const scoreValue = ans.aiScore || (ans.aiEvaluation && (ans.aiEvaluation.score ?? ans.aiEvaluation.usefulness)) || 0;
                const badge = getQualityBadge(scoreValue);
                return (
                  <div key={ans._id} className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <span className="block font-bold text-sm text-slate-800 dark:text-slate-200">
                            {ans.solverName || 'Anonymous Contributor'}
                          </span>
                          <span className="text-[10px] text-slate-400">Top Verified Answer</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {ans.teacherApproved && (
                          <span className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                            Teacher Approved
                          </span>
                        )}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badge.style}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-800">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 italic leading-relaxed">
                        "{ans.content}"
                      </p>
                    </div>

                    {/* Rubrics stats */}
                    {ans.aiEvaluation && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-50 dark:border-slate-800 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Correctness</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-200">{ans.aiEvaluation.correctness || 90}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Completeness</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-200">{ans.aiEvaluation.completeness || 90}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Clarity</span>
                          <span className="font-extrabold text-slate-850 dark:text-slate-200">{ans.aiEvaluation.clarity || 90}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">AI Confidence</span>
                          <span className="font-extrabold text-emerald-500">{ans.confidence || 85}%</span>
                        </div>
                      </div>
                    )}

                    {/* Recommendation reason */}
                    <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100/50 dark:border-emerald-950/20 text-xs">
                      <h5 className="font-black text-emerald-800 dark:text-emerald-450 uppercase text-[10px] tracking-wider mb-1">
                        Recommendation Reasoning
                      </h5>
                      <p className="text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                        {ans.aiEvaluation?.whyStrong || 'This answer matches peer scoring guidelines and has verified accuracy covering core math formulas.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          SUB-TAB 4: AI CONSENSUS ANSWER
          ====================================================== */}
      {activeSubTab === 'consensus' && (
        <div className="space-y-6">
          {consensusLoading ? (
            <div className="flex flex-col py-20 items-center justify-center space-y-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-xs text-slate-400 font-semibold">Gemini AI is reading answers to construct consensus...</p>
            </div>
          ) : consensusError ? (
            <div className="bg-rose-50/50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-900/30 p-6 rounded-2xl text-center space-y-4 max-w-md mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 mx-auto">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                {consensusError === 'timeout'
                  ? 'The AI service is taking longer than expected. Please try again.'
                  : 'The AI service is temporarily busy due to high demand. Please wait a few seconds and try again.'}
              </p>
              <button
                type="button"
                onClick={() => fetchConsensus()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all mx-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry AI Consensus</span>
              </button>
            </div>
          ) : consensusData ? (
            <div className="space-y-6">
              {/* Ideal consensus answer */}
              <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-black text-brand-700 dark:text-brand-400 flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-brand-600 animate-float" />
                  <span>Ideal Combined Answer</span>
                </h3>
                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-50 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                    {consensusData.idealCombinedAnswer}
                  </p>
                </div>
              </div>

              {/* Rubric metrics: mistakes, corrects, missing */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Common Correct Concepts
                  </h4>
                  {consensusData.commonCorrectConcepts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">None logged.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-slate-650 dark:text-slate-350 space-y-1">
                      {consensusData.commonCorrectConcepts?.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-red-655 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Common Mistakes
                  </h4>
                  {consensusData.commonMistakes?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">None logged.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-slate-650 dark:text-slate-350 space-y-1">
                      {consensusData.commonMistakes?.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-indigo-650 uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" /> Missing Concepts
                  </h4>
                  {consensusData.missingConcepts?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">None logged.</p>
                  ) : (
                    <ul className="list-disc pl-4 text-xs text-slate-650 dark:text-slate-355 space-y-1">
                      {consensusData.missingConcepts?.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Study Recommendations */}
              <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="h-4 w-4 text-brand-500" />
                  <span>Recommended Learning Resources</span>
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {consensusData.recommendedLearningResources?.map((res: string, idx: number) => (
                    <span key={idx} className="bg-brand-50/50 text-brand-700 border border-brand-200 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-950/30 text-xs px-3 py-1 rounded-xl font-bold">
                      {res}
                    </span>
                  ))}
                </div>
              </div>

              {/* Faculty feedback if available */}
              {consensusData.teacherNotes && (
                <div className="bg-indigo-50/20 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-950/20 p-5 rounded-2xl text-xs space-y-2">
                  <h4 className="font-black text-indigo-755 dark:text-indigo-400 uppercase text-[10px] tracking-wider">
                    Teacher Feedback notes
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 italic font-semibold leading-relaxed">
                    "{consensusData.teacherNotes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-400">Failed to generate AI Consensus.</p>
          )}
        </div>
      )}

      {/* ======================================================
          SUB-TAB 5: ANALYTICS
          ====================================================== */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Views</span>
              <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{views}</span>
              <span className="text-[10px] text-slate-400 block mt-2">clicks on details workspace</span>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Community Answers</span>
              <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{answers.length}</span>
              <span className="text-[10px] text-slate-405 block mt-2">
                {answers.filter(a => a.aiScore >= 90 || a.isTeacherVerified).length} excellent solutions
              </span>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Time to First Answer</span>
              <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{timeToFirst}</span>
              <span className="text-[10px] text-slate-405 block mt-2">average peer reaction speed</span>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Average AI Score</span>
              <span className="block text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                {answers.length > 0 
                  ? `${Math.round(answers.reduce((acc, cur) => acc + (cur.aiScore || cur.aiEvaluation?.score || 0), 0) / answers.length)}%`
                  : '0%'
                }
              </span>
              <span className="text-[10px] text-slate-405 block mt-2">based on AI rubrics grading</span>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Knowledge Base Status</span>
              <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-450 mt-1">
                {answers.some(a => a.knowledgeBaseStatus === 'saved') ? 'Indexed' : 'Pending'}
              </span>
              <span className="text-[10px] text-slate-405 block mt-2">indexed for future RAG searches</span>
            </div>

            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">Resolution Status</span>
              <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 capitalize mt-1">
                {doubt.status}
              </span>
              <span className="text-[10px] text-slate-405 block mt-2">current state of resolving doubt</span>
            </div>
          </div>

          {/* Learning Progress Summary */}
          <div className="bg-gradient-to-tr from-brand-650 to-accent-500 p-6 rounded-2xl text-white shadow-premium space-y-3">
            <h3 className="font-black text-base flex items-center gap-1.5">
              <LineChart className="h-5 w-5" />
              <span>Doubt Learning Progress Report</span>
            </h3>
            <p className="text-xs text-brand-100 leading-relaxed">
              {answers.length === 0 
                ? 'No answers submitted yet. Once peers submit responses, Gemini AI evaluates rubrics (Clarity, Correctness, Completeness) to rate progress.'
                : answers.some(a => a.aiScore >= 90 || a.isTeacherVerified)
                ? 'Excellent progress! Your query has resolved successfully with outstanding 90%+ community answers that satisfy core curriculum standards and have been archived into the institution\'s RAG Knowledge Base.'
                : 'Progress is active. Community responses have been submitted, but average scores indicate further concept refinements are recommended. Check the AI Consensus sub-tab to view common correct concepts and study resources.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default LearningHubDoubtDetail;
