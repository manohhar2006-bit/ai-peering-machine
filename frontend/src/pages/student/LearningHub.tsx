import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  HelpCircle,
  Award,
  Trophy,
  Activity,
  Flame,
  ChevronRight,
  Eye,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  BookMarked,
  Clock,
  ThumbsUp,
  BrainCircuit,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

export const LearningHub: React.FC = () => {
  const { user, studentProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'doubts' | 'solutions' | 'contributions' | 'analytics'>('doubts');
  
  // Tab 1: Doubts state
  const [myDoubts, setMyDoubts] = useState<any[]>([]);
  const [doubtsLoading, setDoubtsLoading] = useState(true);
  const [doubtSearch, setDoubtSearch] = useState('');
  
  // Tab 2: Solutions state
  const [mySolutions, setMySolutions] = useState<any[]>([]);
  const [solutionsLoading, setSolutionsLoading] = useState(true);
  const [selectedSolution, setSelectedSolution] = useState<any>(null);
  
  // Tab 4: Analytics state
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch student doubts
  const fetchMyDoubts = async () => {
    try {
      setDoubtsLoading(true);
      const response = await axios.get(`${API_URL}/doubts`, {
        params: { askerId: user?.id }
      });
      setMyDoubts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch student doubts:', err);
    } finally {
      setMyDoubts(prev => Array.isArray(prev) ? prev : []);
      setDoubtsLoading(false);
    }
  };

  // Fetch student solutions
  const fetchMySolutions = async () => {
    try {
      setSolutionsLoading(true);
      const response = await axios.get(`${API_URL}/answers/my-solutions`);
      setMySolutions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch student solutions:', err);
    } finally {
      setMySolutions(prev => Array.isArray(prev) ? prev : []);
      setSolutionsLoading(false);
    }
  };

  // Fetch student analytics
  const fetchStudentAnalytics = async () => {
    try {
      setStatsLoading(true);
      await refreshProfile();
      const response = await axios.get(`${API_URL}/analytics/student`);
      setStatsData(response.data);
    } catch (err) {
      console.error('Failed to fetch student analytics:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'doubts') {
      fetchMyDoubts();
    } else if (activeTab === 'solutions') {
      fetchMySolutions();
    } else if (activeTab === 'analytics' || activeTab === 'contributions') {
      fetchStudentAnalytics();
      if (activeTab === 'contributions') {
        fetchMySolutions();
      }
    }
  }, [activeTab]);

  // Status mapping utility
  const mapDoubtStatus = (status: string) => {
    if (['peer_solved', 'ai_hinted', 'teacher_solved'].includes(status)) {
      return { label: 'Resolved', style: 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/30 dark:text-emerald-400' };
    }
    if (status === 'escalated') {
      return { label: 'Pending', style: 'bg-amber-100 text-amber-850 dark:bg-amber-950/30 dark:text-amber-400' };
    }
    return { label: 'Open', style: 'bg-sky-100 text-sky-850 dark:bg-sky-950/30 dark:text-sky-400' };
  };

  // AI Score badge utility
  const getQualityBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', style: 'bg-emerald-500 text-white dark:bg-emerald-600' };
    if (score >= 70) return { label: 'Very Helpful', style: 'bg-teal-500 text-white dark:bg-teal-600' };
    if (score >= 50) return { label: 'Good', style: 'bg-blue-500 text-white dark:bg-blue-600' };
    return { label: 'Needs Improvement', style: 'bg-amber-500 text-white dark:bg-amber-600' };
  };

  // Search filtered doubts
  const filteredDoubts = myDoubts.filter(d => 
    d.title?.toLowerCase().includes(doubtSearch.toLowerCase()) || 
    d.question?.toLowerCase().includes(doubtSearch.toLowerCase()) ||
    d.topic?.toLowerCase().includes(doubtSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto font-sans">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-700 via-brand-600 to-accent-500 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-44 w-44 translate-x-12 translate-y-12 rounded-full bg-white/10 blur-2xl" />
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-yellow-300 fill-yellow-300" />
            <span>Learning Hub Workspace</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Your Personal Learning Hub</h2>
          <p className="text-brand-100 max-w-xl text-sm leading-relaxed">
            Manage your asked doubts, evaluate solutions, track your contributions to the Knowledge Base, and view detailed mastery analytics.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('doubts')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'doubts'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          📌 My Doubts
          {activeTab === 'doubts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('solutions')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'solutions'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          💡 My Solutions
          {activeTab === 'solutions' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('contributions')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'contributions'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          🏆 Top Contributions
          {activeTab === 'contributions' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 text-sm font-bold transition-all relative ${
            activeTab === 'analytics'
              ? 'text-brand-600 dark:text-brand-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          📊 My Analytics
          {activeTab === 'analytics' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />}
        </button>
      </div>

      {/* ======================================================
          TAB 1: MY DOUBTS
          ====================================================== */}
      {activeTab === 'doubts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search doubts..."
                value={doubtSearch}
                onChange={e => setDoubtSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-white dark:bg-[#1E293B] dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition-all"
              />
            </div>
            <Link
              to="/ask-doubt"
              className="w-full sm:w-auto inline-flex justify-center items-center space-x-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-700 transition-all"
            >
              <span>Ask New Doubt</span>
            </Link>
          </div>

          {doubtsLoading ? (
            <div className="flex py-20 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : filteredDoubts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <HelpCircle className="h-12 w-12 text-slate-350 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No doubts found</h4>
              <p className="text-slate-400 mt-1 text-sm">Create a new doubt query to get answers from AI and classmates!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {filteredDoubts.map((doubt: any) => {
                const statusMap = mapDoubtStatus(doubt.status);
                return (
                  <Link
                    key={doubt._id}
                    to={`/student/learning-hub/doubt/${doubt._id}`}
                    className="flex flex-col justify-between p-6 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-500/30 hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400">
                          {doubt.subjectId?.code || 'GEN'}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusMap.style}`}>
                          {statusMap.label}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {doubt.title}
                      </h4>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-3 leading-relaxed italic">
                        {doubt.inputType === 'text' ? (doubt.description || doubt.question) : `[Attached ${doubt.inputType?.toUpperCase()}]`}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 grid grid-cols-4 gap-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="space-y-0.5">
                        <span className="block font-bold text-slate-850 dark:text-slate-200">{doubt.answersCount}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-405">Answers</span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800">
                        <span className="block font-bold text-brand-600 dark:text-brand-400">
                          {doubt.averageAiScore > 0 ? `${doubt.averageAiScore}%` : 'N/A'}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-405">Avg AI</span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800">
                        <span className="block font-bold text-slate-850 dark:text-slate-200 capitalize">{doubt.difficulty}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-405">Diff</span>
                      </div>
                      <div className="space-y-0.5 border-l border-slate-100 dark:border-slate-800">
                        <span className="block font-bold text-slate-855 dark:text-slate-200">{doubt.views || 0}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-405">Views</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(doubt.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-brand-600 dark:text-brand-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Detail Workspace <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          TAB 2: MY SOLUTIONS
          ====================================================== */}
      {activeTab === 'solutions' && (
        <div className="space-y-6">
          {solutionsLoading ? (
            <div className="flex py-20 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : mySolutions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <Award className="h-12 w-12 text-slate-350 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300">No solutions uploaded</h4>
              <p className="text-slate-400 mt-1 text-sm">Help solve doubts on the general Feed to earn XP and showcase expertise!</p>
              <Link to="/feed" className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-brand-600 hover:underline">
                Browse Doubt Feed <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {mySolutions.map((sol: any) => {
                const scoreValue = sol.aiScore || (sol.aiEvaluation && (sol.aiEvaluation.score ?? sol.aiEvaluation.usefulness)) || 0;
                const badge = getQualityBadge(scoreValue);
                return (
                  <div
                    key={sol._id}
                    onClick={() => setSelectedSolution(sol)}
                    className="flex flex-col justify-between p-6 bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-brand-500/30 hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-50 text-slate-650 dark:bg-slate-900 dark:text-slate-400">
                          {sol.doubtId?.subjectId?.name || 'General'}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {sol.teacherApproved && (
                            <span className="flex items-center gap-0.5 text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200/50">
                              <ShieldCheck className="h-3 w-3" /> Faculty Approved
                            </span>
                          )}
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.style}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm line-clamp-2 leading-relaxed">
                        Q: {sol.doubtId?.title || 'Doubt Thread'}
                      </h4>
                      <div className="bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-50 dark:border-slate-800">
                        <p className="text-xs text-slate-650 dark:text-slate-350 line-clamp-2 italic leading-relaxed">
                          "{sol.content}"
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-black text-slate-850 dark:text-slate-200">
                            {scoreValue}%
                          </span>
                          <span className="text-[10px] text-slate-405 block">AI Score</span>
                        </div>
                        {sol.knowledgeBaseStatus === 'saved' && (
                          <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-450 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded text-[10px]">
                            <BookMarked className="h-3 w-3" /> Saved to KB
                          </div>
                        )}
                      </div>
                      <span className="text-brand-600 dark:text-brand-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Review Details <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          TAB 3: TOP CONTRIBUTIONS
          ====================================================== */}
      {activeTab === 'contributions' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-600" />
                <span>Contribution Timeline</span>
              </h3>
              
              {solutionsLoading ? (
                <div className="flex py-10 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : mySolutions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No contribution milestones recorded yet.</p>
              ) : (
                <div className="relative border-l border-slate-200 dark:border-slate-850 ml-4 space-y-8 py-2">
                  {mySolutions.map((sol: any) => {
                    const scoreValue = sol.aiScore || (sol.aiEvaluation && (sol.aiEvaluation.score ?? sol.aiEvaluation.usefulness)) || 0;
                    const badge = getQualityBadge(scoreValue);
                    return (
                      <div key={sol._id} className="relative pl-8 group">
                        {/* Dot */}
                        <div className="absolute left-0 -translate-x-1/2 top-1.5 h-4.5 w-4.5 rounded-full border-4 border-white bg-brand-500 dark:border-slate-900 group-hover:scale-125 transition-transform" />
                        
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(sol.createdAt).toLocaleDateString()}
                          </span>
                          <h4 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm">
                            Solved Doubt: {sol.doubtId?.title || 'Study thread'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-xl">
                            "{sol.content}"
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${badge.style}`}>
                              AI: {scoreValue}%
                            </span>
                            {sol.teacherApproved && (
                              <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full dark:bg-indigo-950/20 dark:text-indigo-400">
                                Faculty Approved
                              </span>
                            )}
                            {sol.knowledgeBaseStatus === 'saved' && (
                              <span className="text-[9px] font-black bg-emerald-50 text-emerald-705 px-2 py-0.5 rounded-full dark:bg-emerald-950/20 dark:text-emerald-400">
                                Institutional KB
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Key contribution boxes */}
          <div className="space-y-6">
            <div className="bg-gradient-to-tr from-brand-650 to-accent-500 p-6 rounded-2xl text-white shadow-premium space-y-4">
              <h3 className="text-base font-black flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-yellow-300 animate-bounce" />
                <span>Impact Highlights</span>
              </h3>
              
              <div className="space-y-3.5 text-xs">
                <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                  <span>Teacher Approved Solutions</span>
                  <span className="font-black text-base">{statsData?.statistics?.teacherApprovedAnswers || 0}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                  <span>Knowledge Base Additions</span>
                  <span className="font-black text-base">{statsData?.statistics?.knowledgeBaseContributions || 0}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                  <span>Answers scoring 90%+ AI</span>
                  <span className="font-black text-base">{statsData?.statistics?.topAnswers || 0}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                  <span>Average AI Performance Score</span>
                  <span className="font-black text-base">{statsData?.statistics?.aiScore || 0}%</span>
                </div>
              </div>
            </div>

            {/* Badges overview */}
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-base">Verified Badges</h3>
              {!studentProfile?.badges || studentProfile.badges.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No badges unlocked yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {studentProfile.badges.map((badgeObj: any) => (
                    <div
                      key={badgeObj.badgeId}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-center"
                    >
                      <div className="h-10 w-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mb-1.5 dark:bg-brand-950/20 dark:text-brand-400">
                        <Award className="h-6 w-6" />
                      </div>
                      <span className="text-[9px] font-black uppercase text-slate-600 block w-full truncate" title={badgeObj.badgeId}>
                        {badgeObj.badgeId.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          TAB 4: MY ANALYTICS
          ====================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex py-20 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : statsData ? (
            <div className="space-y-8">
              {/* Detailed metrics grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">XP Status</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{statsData.statistics?.xp}</span>
                    <span className="text-xs font-bold text-brand-650 dark:text-brand-400">Level {statsData.statistics?.level}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, (statsData.statistics?.xp % 1000) / 10)}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Leaderboard Rank</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100">#{statsData.statistics?.rank || 'N/A'}</span>
                    <span className="text-xs text-slate-400">among all students</span>
                  </div>
                  <span className="text-[10px] text-brand-500 font-bold block mt-3">Ranked on active XP</span>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Answers Rate</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{statsData.statistics?.questionsSolved}</span>
                    <span className="text-xs text-slate-400">/ {statsData.statistics?.answersSubmitted} Solved</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-3">
                    {statsData.statistics?.answersSubmitted > 0
                      ? `${Math.round((statsData.statistics?.questionsSolved / statsData.statistics?.answersSubmitted) * 100)}% accuracy rate`
                      : '0% accuracy rate'}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Contribution Score</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-850 dark:text-slate-100">{statsData.statistics?.contributionScore}</span>
                    <span className="text-xs text-slate-400">points</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-3">Asked: 10xp | Solved: 50xp | Top: 100xp</span>
                </div>
              </div>

              {/* Progress graphs & Subject Mastery */}
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Recharts progress chart */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-base">Weekly Activity Trend</h3>
                  
                  {statsData.statistics?.progress && statsData.statistics.progress.length > 0 ? (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statsData.statistics.progress.map((p: any) => ({
                          name: `W${p.weekNumber}`,
                          XP: p.xpEarned || 0,
                          Answers: p.answersGiven || 0,
                          Resolved: p.doubtsResolved || 0
                        }))}>
                          <defs>
                            <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                          <YAxis stroke="#94A3B8" fontSize={11} />
                          <Tooltip contentStyle={{ background: '#1E293B', color: '#F1F5F9', border: 'none', borderRadius: '8px' }} />
                          <Legend />
                          <Area type="monotone" dataKey="XP" stroke="#3B82F6" fillOpacity={1} fill="url(#colorXP)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex flex-col justify-center items-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl">
                      <Activity className="h-10 w-10 text-slate-355 mb-2 animate-pulse" />
                      <p className="text-xs">Complete learning activities to generate your performance chart.</p>
                    </div>
                  )}
                </div>

                {/* Concept Mastery (reputation per subject) */}
                <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-850 dark:text-slate-100 text-base">Subject Mastery (Concept Reputation)</h3>
                  <div className="space-y-4">
                    {statsData.subjects?.map((sub: any) => {
                      const rep = statsData.profile?.subjectReputation?.[sub._id] || 0;
                      const percent = Math.min(100, Math.round((rep / 500) * 100));

                      return (
                        <div key={sub._id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-650 dark:text-slate-350">{sub.name}</span>
                            <span className="text-brand-600 font-bold dark:text-brand-400">{rep} Rep</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400">Failed to load analytics dashboard.</p>
          )}
        </div>
      )}

      {/* ======================================================
          TAB 2: SOLUTION REVIEW DIALOG (MODAL)
          ====================================================== */}
      {selectedSolution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] border border-slate-100 dark:border-slate-800 space-y-5 text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setSelectedSolution(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>

            <div className="space-y-2.5">
              <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400">
                {selectedSolution.doubtId?.subjectId?.name || 'General'}
              </span>
              <h3 className="text-lg font-black leading-snug">
                {selectedSolution.doubtId?.title || 'Original Doubt'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Posted Question: "{selectedSolution.doubtId?.question || selectedSolution.doubtId?.description}"
              </p>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-black uppercase text-slate-400">Your Submitted Answer</h4>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold italic leading-relaxed text-slate-700 dark:text-slate-200">
                  "{selectedSolution.content}"
                </p>
              </div>
            </div>

            {/* AI Evaluation metrics */}
            {selectedSolution.aiEvaluation && (
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase text-slate-405 flex items-center gap-1">
                  <BrainCircuit className="h-4.5 w-4.5 text-emerald-500" />
                  <span>AI Evaluation Results ({(selectedSolution.aiScore || selectedSolution.aiEvaluation.score || selectedSolution.aiEvaluation.usefulness || 0)}% Overall)</span>
                </h4>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Correctness</span>
                    <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">{selectedSolution.aiEvaluation.correctness || 0}%</span>
                  </div>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-405 block uppercase font-bold">Completeness</span>
                    <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">{selectedSolution.aiEvaluation.completeness || 0}%</span>
                  </div>
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-50 dark:border-slate-800">
                    <span className="text-[10px] text-slate-405 block uppercase font-bold">Clarity</span>
                    <span className="font-extrabold text-sm text-slate-850 dark:text-slate-100">{selectedSolution.aiEvaluation.clarity || 0}%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI Evaluation Feedback</span>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                    {selectedSolution.aiEvaluation.feedback || 'No qualitative feedback log available.'}
                  </p>
                </div>
              </div>
            )}

            {/* Teacher note feedback */}
            {selectedSolution.teacherApproved && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>Teacher Notes & Feedback</span>
                </h4>
                <div className="bg-indigo-50/30 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-950/30 text-xs">
                  <p className="text-indigo-850 dark:text-indigo-300 font-semibold italic">
                    "Official Teacher Verification: This solution correctly covers the core concepts needed. Marked as institutional answer key."
                  </p>
                </div>
              </div>
            )}

            {/* Action suggestions */}
            {selectedSolution.aiEvaluation?.suggestions && selectedSolution.aiEvaluation.suggestions.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase text-amber-500 flex items-center gap-1">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>Suggestions for Improvement</span>
                </h4>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-350 space-y-1.5">
                  {selectedSolution.aiEvaluation.suggestions.map((s: string, idx: number) => (
                    <li key={idx} className="leading-relaxed">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSolution(null)}
                className="bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 px-5 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LearningHub;
