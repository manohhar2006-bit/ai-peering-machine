import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { AILearningAssistant } from '../../components/AILearningAssistant';
import {
  Brain,
  Sparkles,
  Award,
  BookOpen,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  FileText,
  User,
  Send,
  Loader2,
  Lock,
  Unlock,
  Image,
  RefreshCw,
  Settings,
  ArrowLeft
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export const DoubtDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, studentProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [doubtData, setDoubtData] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [submitError, setSubmitError] = useState<'busy' | 'timeout' | null>(null);
  const [fallbackData, setFallbackData] = useState<any>(null);

  // Hint State
  const [hints, setHints] = useState<any[]>([]);
  const [hintLoading, setHintLoading] = useState(false);

  // Form State
  const [answerContent, setAnswerContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [evalModal, setEvalModal] = useState<any>(null); // For AI feedback overlay

  // New features state
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [inputType, setInputType] = useState<'text' | 'image' | 'pdf'>('text');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [originalUploadUrl, setOriginalUploadUrl] = useState('');
  const [celebrateUnlock, setCelebrateUnlock] = useState(false);
  const [editMode, setEditMode] = useState<'none' | 'text' | 'file'>('none');
  const [activeVersionIndex, setActiveVersionIndex] = useState<number>(0);

  // Teacher Settings States
  const [allowCommunitySolutions, setAllowCommunitySolutions] = useState(true);
  const [hideCommunitySolutionsUntilFirstAttempt, setHideCommunitySolutionsUntilFirstAttempt] = useState(true);
  const [allowUnlimitedAttempts, setAllowUnlimitedAttempts] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState<number | string>('');
  const [allowAnswerEditing, setAllowAnswerEditing] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await axios.put(`${API_URL}/doubts/${id}/settings`, {
        allowCommunitySolutions,
        hideCommunitySolutionsUntilFirstAttempt,
        allowUnlimitedAttempts,
        maxAttempts: maxAttempts === '' ? null : Number(maxAttempts),
        allowAnswerEditing
      });
      alert('Question settings updated successfully!');
      await fetchDoubt();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      alert(err.response?.data?.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchAIAnalysis = async (doubtId: string, title: string, description: string, subjectName: string) => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await axios.post(`${API_URL}/ai/analyze-doubt`, {
        doubtId,
        doubtText: `${title}\n${description}`,
        subject: subjectName
      });

      if (response.data && response.data.success === false && response.data.status === 'AI_BUSY') {
        setAiError(response.data.message || 'AI is temporarily busy due to high demand.');
        return;
      }

      setAiAnalysis(response.data);
      // Update doubt topic and difficulty in doubtData state
      setDoubtData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          doubt: {
            ...prev.doubt,
            topic: response.data.topic,
            difficulty: response.data.difficulty
          }
        };
      });
    } catch (err: any) {
      console.error('Failed to run AI analysis:', err);
      const errMsg = err.response?.data?.message || err.message || '';
      if (errMsg.includes('busy') || errMsg.includes('demand')) {
        setAiError('AI is temporarily busy due to high demand.');
      } else {
        setAiError('AI analysis unavailable');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDoubt = async () => {
    try {
      const response = await axios.get(`${API_URL}/doubts/${id}`);
      setDoubtData(response.data);

      const doubtObj = response.data.doubt;
      if (doubtObj) {
        setAllowCommunitySolutions(doubtObj.allowCommunitySolutions !== false);
        setHideCommunitySolutionsUntilFirstAttempt(doubtObj.hideCommunitySolutionsUntilFirstAttempt !== false);
        setAllowUnlimitedAttempts(doubtObj.allowUnlimitedAttempts !== false);
        setMaxAttempts(doubtObj.maxAttempts !== undefined && doubtObj.maxAttempts !== null ? doubtObj.maxAttempts : '');
        setAllowAnswerEditing(doubtObj.allowAnswerEditing !== false);
      }

      const answersResponse = await axios.get(`${API_URL}/answers/doubt/${id}`);
      const data = answersResponse.data;
      if (data && typeof data === 'object' && 'unlocked' in data) {
        setIsUnlocked(data.unlocked);
        setAnswers(data.answers || []);
      } else {
        setIsUnlocked(true);
        setAnswers(Array.isArray(data) ? data : []);
      }

      if (user?.role === 'teacher' || (user?.role === 'student' && response.data.doubt.askerId._id === user.id)) {
        const hintsResponse = await axios.get(`${API_URL}/hints/revealed/${id}`);
        setHints(hintsResponse.data);
      }

      if (response.data.aiAnalysis) {
        setAiAnalysis({
          topic: response.data.aiAnalysis.topic,
          difficulty: response.data.aiAnalysis.difficulty,
          conceptExplanation: response.data.aiAnalysis.explanation,
          suggestedApproach: "Review the explained concept details above to resolve key terms.",
          confidenceScore: response.data.aiAnalysis.isPeerAnswerable ? 85 : 45,
          keyTerms: []
        });
      }
    } catch (err) {
      console.error('Failed to load doubt details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDoubt();

    const handleRefresh = () => {
      if (id) fetchDoubt();
    };
    window.addEventListener('refresh-doubt-data', handleRefresh);
    return () => {
      window.removeEventListener('refresh-doubt-data', handleRefresh);
    };
  }, [id, user]);

  const handleRequestHint = async () => {
    if (hints.length >= 6) {
      alert("Maximum hints used. Try answering now!");
      return;
    }
    setHintLoading(true);
    try {
      const response = await axios.post(`${API_URL}/ai/generate-hint`, {
        doubtId: id,
        ladderIndex: hints.length,
        level: hints.length + 1
      });

      if (response.data && response.data.success === false && response.data.status === 'AI_BUSY') {
        alert(response.data.message || 'The AI service is temporarily busy due to high demand. Please wait a few seconds and try again.');
        return;
      }

      setHints([...hints, {
        hintContent: response.data.hintContent,
        hintLadderIndex: response.data.ladderIndex,
        encouragement: response.data.encouragement
      }]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to retrieve hint');
    } finally {
      setHintLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setOcrLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const endpoint = doubtData?.isEscalated ? `${API_URL}/ai/upload` : `${API_URL}/ai/ocr`;
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (doubtData?.isEscalated) {
        const { originalUploadUrl } = response.data;
        setOriginalUploadUrl(originalUploadUrl || '');
        setAnswerContent(file.name || 'Uploaded File');
      } else {
        const { extractedText, originalUploadUrl } = response.data;
        setAnswerContent(extractedText || '');
        setOriginalUploadUrl(originalUploadUrl || '');
      }
    } catch (err: any) {
      console.error('File upload/OCR failed:', err);
      alert(err.response?.data?.message || 'File upload failed. Please check the file format or size.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!answerContent.trim()) return;

    setSubmitLoading(true);
    setSubmitError(null);
    setFallbackData(null);
    window.dispatchEvent(new CustomEvent('ai-status', { detail: 'busy' }));

    try {
      const response = await axios.post(`${API_URL}/answers`, {
        doubtId: id,
        content: answerContent,
        hintsUsedCount: hints.length,
        inputType,
        originalUploadUrl,
        extractedText: inputType !== 'text' ? answerContent : undefined
      });

      if (response.data && response.data.success === false) {
        window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
        if (response.data.status === 'AI_FALLBACK') {
          setFallbackData(response.data.fallbackAnswer);
        } else {
          setSubmitError('busy');
        }
        setSubmitLoading(false);
        return;
      }

      if (!isUnlocked) {
        setIsUnlocked(true);
        setCelebrateUnlock(true);
      }

      const submittedText = answerContent;
      setEvalModal(response.data);
      // Preserve all previous work on submission (do not clear here)
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'online' }));
      
      // Dispatch to AI Coach chatbot
      window.dispatchEvent(new CustomEvent('post-solution-to-coach', { detail: submittedText }));

      // Dispatch dynamic reward popups/confetti if correct
      if (response.data.evaluation?.verdict === 'correct') {
        window.dispatchEvent(new CustomEvent('trigger-reward', {
          detail: {
            xpGained: response.data.xpGained || 0,
            coinsGained: response.data.coinsGained || 0,
            levelUp: response.data.levelUp || false,
            newLevel: response.data.newLevel || 1,
            streakCount: response.data.streakCount || 0,
            streakMessage: response.data.streakMessage || '',
            streakBonusXP: response.data.streakBonusXP || 0
          }
        }));
      }

      await fetchDoubt();
      await refreshProfile(); // Refresh student statistics
    } catch (err: any) {
      console.error('Failed to post answer:', err);
      window.dispatchEvent(new CustomEvent('ai-status', { detail: 'offline' }));
      
      const errMsg = err.response?.data?.message || err.message || '';
      const isTimeout = errMsg.includes('timeout') || errMsg.includes('TIMEOUT') || err.code === 'ECONNABORTED';

      if (isTimeout) {
        setSubmitError('timeout');
      } else {
        setSubmitError('busy');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    try {
      const response = await axios.post(`${API_URL}/answers/${answerId}/accept`);
      alert(response.data.message || 'Answer accepted!');
      await fetchDoubt();
      await refreshProfile();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept answer');
    }
  };

  const handleVerifyAnswer = async (answerId: string) => {
    try {
      const response = await axios.post(`${API_URL}/answers/${answerId}/verify`);
      alert(response.data.message || 'Answer verified!');
      await fetchDoubt();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to verify answer');
    }
  };

  const handleTeacherDecision = async (answerId: string, action: 'approve' | 'reject') => {
    try {
      const response = await axios.post(`${API_URL}/answers/${answerId}/decision`, { action });
      alert(response.data.message || `Answer successfully processed.`);
      await fetchDoubt();
    } catch (err: any) {
      console.error('Failed to submit teacher decision:', err);
      alert(err.response?.data?.message || 'Failed to submit teacher decision');
    }
  };

  const handleEscalateDoubt = async () => {
    try {
      const response = await axios.post(`${API_URL}/doubts/${id}/escalate`, { reason: 'low-confidence' });
      alert(response.data.message || 'Doubt escalated!');
      await fetchDoubt();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to escalate doubt');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400 font-sans">Entering Quest Room...</p>
        </div>
      </div>
    );
  }

  const { doubt, isEscalated, escalationReason } = doubtData;
  const isAsker = user?.role === 'student' && doubt.askerId._id === user.id;
  const isTeacher = user?.role === 'teacher';
  const isDoubtOpen = !['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status);

  const myAnswer = answers.find(ans => {
    const solverIdStr = ans.solverId?._id?.toString() || ans.solverId?.toString();
    return solverIdStr === user?.id;
  });

  const versionsCount = myAnswer?.versions?.length || 0;
  const currentVersionIdx = activeVersionIndex < versionsCount ? activeVersionIndex : Math.max(0, versionsCount - 1);
  const selectedVersion = myAnswer?.versions?.[currentVersionIdx] || myAnswer || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Doubt Details Header Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-xs font-bold dark:bg-brand-950/20 dark:text-brand-400">
              {doubt.subjectId?.code || 'GEN'}
            </span>
            <span className="bg-slate-100 text-slate-655 px-3 py-1 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-slate-400">
              {doubt.topic}
            </span>
            <span className={`px-3 py-1 rounded-xl text-xs font-bold capitalize ${
              doubt.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
              doubt.difficulty === 'hard' ? 'bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400' :
              'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
            }`}>
              {doubt.difficulty}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {isEscalated && (
              <span className="flex items-center space-x-1 rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600 dark:bg-red-950/20 dark:text-red-400">
                <AlertTriangle className="h-4.5 w-4.5 animate-pulse" />
                <span>ESCALATED TO FACULTY</span>
              </span>
            )}
            <span className={`rounded-full px-3.5 py-1 text-xs font-extrabold capitalize ${
              !isDoubtOpen ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-455' : 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400'
            }`}>
              {doubt.status}
            </span>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">{doubt.title}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">{doubt.description}</p>

        {/* Revealed Hints Section */}
        {hints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-amber-500 animate-float" />
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Revealed Hints</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {hints.map((h: any, idx: number) => (
                <div key={idx} className="bg-amber-50/50 dark:bg-amber-955/10 border border-amber-250 dark:border-amber-900/35 rounded-2xl p-4 text-xs space-y-2 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                  <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-450 font-extrabold">
                    <Lightbulb className="h-4 w-4 text-amber-550" />
                    <span>Hint #{idx + 1} ({idx === 0 ? 'Small clue' : idx === 1 ? 'Medium clue' : 'Strong clue'})</span>
                  </div>
                  <p className="text-slate-655 dark:text-slate-350 leading-relaxed font-semibold">
                    {h.hintContent}
                  </p>
                  {h.encouragement && (
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 italic font-semibold pt-1 border-t border-amber-200/40 dark:border-amber-900/10">
                      "{h.encouragement}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Asker and Get Hint Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800 text-xs text-slate-450">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center dark:bg-slate-800">
              <User className="h-4.5 w-4.5 text-slate-450" />
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-350">
              Asked by {doubt.askerName || doubt.askerId?.name} ({new Date(doubt.createdAt).toLocaleDateString()})
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {isAsker && isDoubtOpen && (
              <div className="flex gap-2">
                {hints.length < 3 ? (
                  <button
                    onClick={handleRequestHint}
                    disabled={hintLoading}
                    className="inline-flex items-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all"
                  >
                    {hintLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span>Get Hint #{hints.length + 1}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                    Maximum hints used. Try answering now!
                  </span>
                )}
              </div>
            )}
            {isDoubtOpen && !isEscalated && (isAsker || isTeacher) && (
              <button
                onClick={handleEscalateDoubt}
                className="text-xs font-bold text-red-600 hover:underline flex items-center space-x-1"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Escalate to Faculty</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Celebrate Unlock Banner */}
      {celebrateUnlock && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-premium flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-yellow-300 fill-yellow-300" />
            <span className="text-sm font-black uppercase tracking-wider">🎉 Community Solutions Unlocked! You gained access to peer-verified answers! 🎉</span>
          </div>
          <button onClick={() => setCelebrateUnlock(false)} className="text-white hover:text-slate-200 font-extrabold text-lg">&times;</button>
        </div>
      )}

      {/* Main Grid: Left answers, Right sidebars (AI analysis + hints) */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Answers List & Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Answers Container */}
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2 pb-3 border-b border-slate-50 dark:text-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-brand-655" />
              <span>Peer Solver Rooms ({answers.length})</span>
            </h3>

            {!isUnlocked ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-55 dark:bg-[#0F172A]/40 rounded-3xl border border-dashed border-slate-205 dark:border-slate-850 text-center space-y-3">
                <Lock className="h-10 w-10 text-brand-500 animate-pulse" />
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Attempt this question first to unlock community solutions.</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Write and submit your solution, or request teacher permission, to view peer-verified answers and detailed AI grades.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Community Verified Solutions Section */}
                {(() => {
                  const topAnswers = answers.filter((ans: any) => {
                    const correctness = ans.aiEvaluation?.correctness || 0;
                    return correctness === 100 || ans.isTeacherVerified || ans.aiScore === 100;
                  });

                  if (topAnswers.length === 0) return null;

                  return (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center space-x-2 text-brand-655 border-b border-slate-105 dark:border-slate-850 pb-2">
                        <Sparkles className="h-4.5 w-4.5 text-brand-500 fill-brand-500 animate-float" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-855 dark:text-slate-200">
                          Community Verified Solutions ({topAnswers.length})
                        </h4>
                      </div>
                      <div className="grid gap-4">
                        {topAnswers.map((ans: any) => (
                          <div key={`top-${ans._id}`} className="bg-gradient-to-tr from-brand-50/50 to-indigo-50/20 dark:from-brand-950/10 dark:to-slate-900/40 rounded-2xl p-5 border border-brand-200/40 dark:border-brand-950/30 space-y-4 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div className="absolute right-0 top-0 bg-brand-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                              Verified Solution
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-655 flex items-center justify-center font-bold text-xs">
                                  {(ans.solverName || 'S').charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-200">
                                    {ans.solverName}
                                  </h4>
                                  <p className="text-[9px] text-slate-400">
                                    Submitted on {new Date(ans.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <span className="flex items-center space-x-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-455 px-2 py-0.5 text-[10px] font-black">
                                <CheckCircle className="h-3.5 w-3.5 fill-emerald-55 text-white" />
                                <span>Verified Solution ({ans.aiScore || ans.aiEvaluation?.score || 100}%)</span>
                              </span>
                            </div>
                            
                            {ans.inputType === 'image' && ans.originalUploadUrl ? (
                              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 max-h-60 flex items-center justify-center">
                                <img src={ans.originalUploadUrl} alt="Peer uploaded solution" className="max-h-60 object-contain" />
                              </div>
                            ) : ans.inputType === 'pdf' && ans.originalUploadUrl ? (
                              <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 h-60">
                                <iframe src={ans.originalUploadUrl} className="w-full h-full border-0" title="Peer uploaded PDF solution" />
                              </div>
                            ) : (
                              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-wrap">
                                {ans.content}
                              </p>
                            )}
                            {ans.aiEvaluation && (
                              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] leading-relaxed">
                                {ans.aiEvaluation.bestConceptsCovered && ans.aiEvaluation.bestConceptsCovered.length > 0 && (
                                  <div>
                                    <strong className="text-slate-700 dark:text-slate-300">Best Concepts Covered: </strong>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {ans.aiEvaluation.bestConceptsCovered.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {ans.aiEvaluation.missingConcepts && ans.aiEvaluation.missingConcepts.length > 0 && (
                                  <div>
                                    <strong className="text-red-500">Missing Concepts: </strong>
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {ans.aiEvaluation.missingConcepts.join(', ')}
                                    </span>
                                  </div>
                                )}
                                {ans.aiEvaluation.whyStrong && (
                                  <div className="text-brand-700 dark:text-brand-400 italic">
                                    <strong>Why this answer is strong:</strong> "{ans.aiEvaluation.whyStrong}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <hr className="border-slate-105 dark:border-slate-800 my-4" />
                    </div>
                  );
                })()}

                {/* Regular Solutions List */}
                <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                  {answers.map((ans, idx) => (
                    <div key={ans._id} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-4`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2.5">
                          <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xs dark:bg-indigo-950/20">
                            {(ans.solverName || 'S').charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                              {ans.solverName}
                              {ans.isOwnerAnswer && (
                                <span className="ml-2 bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded text-[9px] font-black uppercase dark:bg-indigo-950/40 dark:text-indigo-400">
                                  You have also contributed an answer.
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              Submitted on {new Date(ans.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {ans.isTeacherVerified && (
                            <span className="flex items-center space-x-1 rounded-full bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                              <CheckCircle className="h-3 w-3 fill-emerald-55 text-white" />
                              <span>Faculty Verified</span>
                            </span>
                          )}
                          {ans.isAccepted && (
                            <span className="flex items-center space-x-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-600 dark:bg-teal-950/20 dark:text-teal-400">
                              <span>Asker Accepted</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {ans.inputType === 'image' && ans.originalUploadUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 max-h-80 flex items-center justify-center">
                          <img src={ans.originalUploadUrl} alt="Original peer solution image" className="max-h-80 object-contain" />
                        </div>
                      ) : ans.inputType === 'pdf' && ans.originalUploadUrl ? (
                        <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 h-80">
                          <iframe src={ans.originalUploadUrl} className="w-full h-full border-0" title="Original peer solution PDF" />
                        </div>
                      ) : (
                        <p className="text-sm text-slate-650 leading-relaxed dark:text-slate-350 whitespace-pre-wrap">{ans.content}</p>
                      )}

                      {/* AI evaluation metrics */}
                      {ans.aiEvaluation && (
                        <div className="bg-slate-55/40 p-4 rounded-2xl border border-slate-100 dark:bg-[#0F172A]/60 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-slate-750 dark:text-slate-300 flex items-center space-x-1">
                              <Brain className="h-4 w-4 text-brand-500" />
                              <span>AI Evaluation Score: {ans.aiEvaluation.score}/100</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">XP Earned: +{ans.pointsAwarded}</span>
                          </div>

                          {/* Visual score bars */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Correctness</span>
                                <span>{ans.aiEvaluation.correctness}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-450 rounded-full" style={{ width: `${ans.aiEvaluation.correctness}%`, backgroundColor: '#10b981' }} />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>Clarity</span>
                                <span>{ans.aiEvaluation.clarity}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${ans.aiEvaluation.clarity}%` }} />
                              </div>
                            </div>
                          </div>

                          <p className="text-xs italic text-slate-500 leading-relaxed dark:text-slate-400">
                            <span className="font-bold not-italic text-slate-650 dark:text-slate-300">Feedback:</span> {ans.aiEvaluation.feedback}
                          </p>
                        </div>
                      )}

                      {/* Action buttons (accept, verify, approve, reject) */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {isDoubtOpen && isAsker && !ans.isAccepted && (
                          <button
                            onClick={() => handleAcceptAnswer(ans._id)}
                            className="rounded-xl border border-teal-200 hover:border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-600 transition-all dark:bg-teal-950/20"
                          >
                            Accept Solution
                          </button>
                        )}
                        {isTeacher && (
                          <div className="flex gap-2 w-full">
                            {!ans.teacherApproved ? (
                              <button
                                onClick={() => handleTeacherDecision(ans._id, 'approve')}
                                className="rounded-xl border border-emerald-250 hover:border-emerald-350 bg-emerald-50 text-emerald-600 px-4 py-2 text-xs font-bold transition-all dark:bg-emerald-950/20 dark:text-emerald-400"
                              >
                                Approve Solution
                              </button>
                            ) : (
                              <button
                                onClick={() => handleTeacherDecision(ans._id, 'reject')}
                                className="rounded-xl border border-rose-255 hover:border-rose-350 bg-rose-50 text-rose-600 px-4 py-2 text-xs font-bold transition-all dark:bg-rose-955/20 dark:text-rose-450"
                              >
                                Reject & Unpublish
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Solution Attempt History for Teacher (Feature 8 & 10) */}
                      {isTeacher && ans.versions && ans.versions.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-2 text-xs">
                          <strong className="text-slate-700 dark:text-slate-350 block uppercase text-[10px] tracking-wider font-extrabold">Solution Attempt History ({ans.versions.length} attempts)</strong>
                          <div className="space-y-3 divide-y divide-slate-150 dark:divide-slate-800/40">
                            {ans.versions.map((ver: any, index: number) => (
                              <div key={index} className="pt-3 first:pt-0 space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-extrabold">
                                  <span className="text-brand-600 dark:text-brand-400 font-black">Attempt {index + 1}</span>
                                  <span className="text-slate-400">{new Date(ver.createdAt).toLocaleDateString()}</span>
                                  <span className="bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 px-2 py-0.5 rounded font-black">AI Score: {ver.aiScore || 0}%</span>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black uppercase text-slate-400">Content / File:</span>
                                  {ver.inputType === 'image' && ver.originalUploadUrl ? (
                                    <div className="rounded-xl overflow-hidden border max-h-40 flex items-center justify-center bg-white dark:bg-slate-850">
                                      <img src={ver.originalUploadUrl} className="max-h-40 object-contain" alt="Attempt attachment" />
                                    </div>
                                  ) : ver.inputType === 'pdf' && ver.originalUploadUrl ? (
                                    <div className="rounded-xl overflow-hidden border h-40 bg-white dark:bg-slate-850">
                                      <iframe src={ver.originalUploadUrl} className="w-full h-full border-0" title="Attempt PDF attachment" />
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed font-semibold whitespace-pre-wrap">{ver.content}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Answer Editor Form & AI Review Workspace (Student Only) */}
          {user?.role === 'student' && myAnswer && editMode === 'none' && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-6">
              {/* Header & Publish Status */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-850 dark:text-slate-100">Your AI Assisted Workspace</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review, improve, and track solutions</span>
                </div>

                {/* Color-coded Publish Status badge (Feature 11) */}
                {(() => {
                  const score = selectedVersion?.aiScore || 0;
                  const isPublished = myAnswer.isTeacherVerified || myAnswer.isPublished || myAnswer.teacherApproved || score >= 50;
                  if (score === 100 || myAnswer.isTeacherVerified) {
                    return (
                      <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/60 rounded-full text-xs font-black uppercase">
                        <CheckCircle className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
                        <span>Mastered</span>
                      </span>
                    );
                  } else if (isPublished) {
                    return (
                      <span className="flex items-center space-x-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40 rounded-full text-xs font-black uppercase">
                        <CheckCircle className="h-3.5 w-3.5 animate-pulse" />
                        <span>Published</span>
                      </span>
                    );
                  } else if (score >= 40) {
                    return (
                      <span className="flex items-center space-x-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/40 rounded-full text-xs font-black uppercase">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Almost Ready</span>
                      </span>
                    );
                  } else {
                    return (
                      <span className="flex items-center space-x-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-955/20 dark:text-rose-455 dark:border-rose-900/40 rounded-full text-xs font-black uppercase">
                        <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                        <span>Needs Improvement</span>
                      </span>
                    );
                  }
                })()}
              </div>

              {/* Attempt History Section */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Submission & Improvement History</span>
                <div className="flex flex-wrap gap-2">
                  {myAnswer.versions && myAnswer.versions.map((ver: any, index: number) => {
                    const score = ver.aiScore || ver.aiEvaluation?.score || 0;
                    const isSelected = activeVersionIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveVersionIndex(index)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border ${
                          isSelected 
                            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>Attempt {index + 1}</span>
                        <span className="font-extrabold">({score}%)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Publishing rules message */}
              <div className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                (selectedVersion?.aiScore || 0) === 100
                  ? 'bg-emerald-100/30 text-emerald-800 border-emerald-200 dark:bg-emerald-955/10 dark:text-emerald-400 dark:border-emerald-900/40'
                  : (selectedVersion?.aiScore || 0) >= 50 || myAnswer.teacherApproved
                  ? 'bg-emerald-50/40 text-emerald-800 border-emerald-100/50 dark:bg-emerald-950/10 dark:text-emerald-450'
                  : 'bg-rose-50/40 text-rose-800 border-rose-100/50 dark:bg-rose-955/10 dark:text-rose-400'
              }`}>
                {(selectedVersion?.aiScore || 0) === 100
                  ? 'Excellent! You have mastered this question.'
                  : (selectedVersion?.aiScore || 0) >= 50 || myAnswer.teacherApproved
                  ? 'Your answer has been successfully published.'
                  : 'Your answer needs improvement before it can be shared with other students.'}
              </div>
              {/* Original Uploaded File Display (Feature 6) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Your Submitted Answer format</span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Attempt #{selectedVersion?.attemptNumber || (activeVersionIndex + 1)} submitted {selectedVersion?.createdAt ? new Date(selectedVersion.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                {selectedVersion?.inputType === 'image' && selectedVersion?.originalUploadUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 max-h-60 flex items-center justify-center">
                    <img src={selectedVersion.originalUploadUrl} alt="My uploaded answer" className="max-h-60 object-contain" />
                  </div>
                ) : selectedVersion?.inputType === 'pdf' && selectedVersion?.originalUploadUrl ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-60">
                    <iframe src={selectedVersion.originalUploadUrl} className="w-full h-full border-0" title="My uploaded PDF answer" />
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 max-h-60 overflow-y-auto">
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold whitespace-pre-wrap">{selectedVersion?.content}</p>
                  </div>
                )}
              </div>

              {selectedVersion?.teacherNote && (
                <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl text-xs text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/30">
                  <strong>Teacher Feedback:</strong> {selectedVersion.teacherNote}
                </div>
              )}

              {/* AI Evaluation Card */}
              {selectedVersion?.aiEvaluation && (
                <div className="bg-slate-55/40 p-5 rounded-2xl border border-slate-100 dark:bg-[#0F172A]/60 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                      <Brain className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
                      <span>AI Grading: {selectedVersion.aiScore || 0}% score</span>
                    </span>
                  </div>

                  {/* Dimension bars */}
                  <div className="grid grid-cols-2 gap-4">
                    {['correctness', 'clarity', 'completeness', 'logicalThinking'].map((dim) => {
                      const val = selectedVersion.aiEvaluation[dim] || 50;
                      return (
                        <div key={dim} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 capitalize">
                            <span>{dim.replace('logicalThinking', 'Logical Flow')}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    <strong className="not-italic text-slate-750 dark:text-slate-300">Critique:</strong> "{selectedVersion.aiEvaluation.feedback}"
                  </p>

                  {/* Weaknesses / Mistakes (prefixed with ❌) */}
                  {selectedVersion.aiEvaluation.weaknesses && selectedVersion.aiEvaluation.weaknesses.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">❌ Critical Mistakes</span>
                      <ul className="space-y-1">
                        {selectedVersion.aiEvaluation.weaknesses.map((w: string, idx: number) => (
                          <li key={idx} className="text-xs text-rose-600 dark:text-rose-450 font-bold">
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions to Improve (prefixed with ✓) */}
                  {selectedVersion.aiEvaluation.suggestions && selectedVersion.aiEvaluation.suggestions.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block">✓ Required Action Improvements</span>
                      <ul className="space-y-1">
                        {selectedVersion.aiEvaluation.suggestions.map((s: string, idx: number) => (
                          <li key={idx} className="text-xs text-emerald-650 dark:text-emerald-450 font-bold">
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
                  {/* Action Buttons to Edit or Re-upload */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {(!myAnswer || (selectedVersion?.aiScore || 0) < 100) ? (
                  <>
                    <button
                      disabled={!doubt.allowAnswerEditing}
                      onClick={() => {
                        setEditMode('text');
                        setAnswerContent(selectedVersion?.content || '');
                        setInputType(selectedVersion?.inputType || 'text');
                        setOriginalUploadUrl(selectedVersion?.originalUploadUrl || '');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit Answer
                    </button>
                    <button
                      disabled={!doubt.allowAnswerEditing}
                      onClick={() => {
                        setEditMode('text');
                        setAnswerContent(selectedVersion?.content || '');
                        setInputType(selectedVersion?.inputType || 'text');
                        setOriginalUploadUrl(selectedVersion?.originalUploadUrl || '');
                        handleSubmitAnswer(null as any);
                      }}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-premium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Improved Answer
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditMode('text');
                      setAnswerContent(''); // Clear to start a fresh alternate solution
                      setOriginalUploadUrl('');
                      setInputType('text');
                    }}
                    className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-650 rounded-xl text-xs font-bold transition-all dark:bg-brand-950/20 dark:text-brand-400"
                  >
                    Submit Another Solution
                  </button>
                )}
              </div>
            </div>
          )}

          {user?.role === 'student' && (!myAnswer || editMode !== 'none') && (
            <form onSubmit={handleSubmitAnswer} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">
                  {editMode !== 'none' ? 'Improve Your Solution' : 'Write Your Solution'}
                </h3>
                <div className="flex gap-1 bg-slate-100 dark:bg-[#0F172A] p-1 rounded-xl">
                  {(['text', 'image', 'pdf'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={submitLoading || ocrLoading}
                      onClick={() => {
                        setInputType(type);
                        setAnswerContent('');
                        setOriginalUploadUrl('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all disabled:opacity-50 disabled:pointer-events-none ${
                        inputType === type
                          ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-450 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {inputType !== 'text' && !originalUploadUrl && (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors duration-300">
                  <input
                    type="file"
                    id="file-upload"
                    accept={inputType === 'image' ? 'image/png, image/jpeg, image/jpg, image/webp' : 'application/pdf'}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer space-y-2 block">
                    <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20">
                      {inputType === 'image' ? <Image className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    </div>
                    <div className="text-xs text-slate-500 font-bold">
                      {ocrLoading ? 'AI is extracting text...' : `Click to upload ${inputType.toUpperCase()}`}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {inputType === 'image' ? 'Supports PNG, JPG, JPEG, WEBP (Max 10MB)' : 'Supports PDF documents (Max 20MB)'}
                    </p>
                  </label>
                </div>
              )}

              {ocrLoading && (
                <div className="flex flex-col items-center justify-center p-6 space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                  <p className="text-xs text-slate-400 font-bold">AI performing OCR & text extraction...</p>
                </div>
              )}

              {/* Feature 5 & 6 editor form displays */}
              {inputType === 'text' ? (
                <div className="space-y-2">
                  <textarea
                    required
                    disabled={submitLoading || ocrLoading}
                    rows={5}
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    placeholder="Submit a clear explanation. Code snippets and equations are highly valued by AI evaluation."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all disabled:opacity-60"
                  />
                </div>
              ) : (
                originalUploadUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-955/20 text-emerald-700 dark:text-emerald-450 p-2.5 rounded-xl text-xs font-bold border border-emerald-100/40">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" />
                        <span>File uploaded and processed internally</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOriginalUploadUrl('');
                          setAnswerContent('');
                        }}
                        className="text-slate-400 hover:text-slate-655 font-bold"
                      >
                        Remove
                      </button>
                    </div>

                    {inputType === 'image' ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 max-h-60 flex items-center justify-center">
                        <img src={originalUploadUrl} alt="Uploaded preview" className="max-h-60 object-contain" />
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 h-60">
                        <iframe src={originalUploadUrl} className="w-full h-full border-0" title="Uploaded PDF preview" />
                      </div>
                    )}
                  </div>
                )
              )}

              {submitError && (
                <div className="bg-rose-50/50 dark:bg-rose-955/10 border border-rose-100 dark:border-rose-900/30 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-450 text-xs font-bold animate-pulse">
                    <AlertTriangle className="h-4.5 w-4.5" />
                    <span>AI Service Busy</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-355 leading-relaxed">
                    {submitError === 'timeout'
                      ? 'The AI service is taking longer than expected. Please try again.'
                      : 'The AI service is temporarily busy due to high demand. Please wait a few seconds and try again.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSubmitAnswer(null as any)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-all"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-slow" />
                    <span>Retry Solution Scoring</span>
                  </button>
                </div>
              )}

              {fallbackData && (
                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/30 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-650 dark:text-indigo-400 text-xs font-bold">
                    <Lightbulb className="h-4.5 w-4.5" />
                    <span>AI Offline Fallback Loaded</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">
                    The AI evaluation service is currently unavailable. We have automatically retrieved a verified community solution matching similar concepts.
                  </p>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>Concept Question: {fallbackData.question}</span>
                      <span className="text-brand-650">Score: {fallbackData.score}%</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 italic">
                      "{fallbackData.answer}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFallbackData(null);
                      setAnswerContent('');
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                  >
                    Clear & Dismiss
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitLoading || ocrLoading}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-xs font-bold shadow-premium transition-all flex items-center space-x-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isEscalated ? 'Submitting answer...' : 'AI is evaluating your answer...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>
                        {isEscalated 
                          ? 'Submit Answer for Faculty Review' 
                          : editMode !== 'none' && myAnswer 
                          ? 'Submit Improved Answer' 
                          : 'Post & Score Solution'}
                      </span>
                    </>
                  )}
                </button>

                {answerContent && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerContent('');
                      setOriginalUploadUrl('');
                      setInputType('text');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 dark:bg-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Clear Draft
                  </button>
                )}

                {editMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode('none');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Right Columns (AI Learning Assistant & Teacher Settings Panels) */}
        <div className="space-y-6">
          {/* Teacher Settings Panel (Visible only to Teachers) */}
          {isTeacher && (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Settings className="h-5 w-5 text-brand-655" />
                <h3 className="text-base font-bold text-slate-855 dark:text-slate-100">Question Settings</h3>
              </div>
              
              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <label htmlFor="allowCommunitySolutions" className="cursor-pointer">Allow community solutions</label>
                  <input 
                    id="allowCommunitySolutions"
                    type="checkbox" 
                    checked={allowCommunitySolutions} 
                    onChange={(e) => setAllowCommunitySolutions(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label htmlFor="hideCommunitySolutions" className="cursor-pointer">Hide solutions until first attempt</label>
                  <input 
                    id="hideCommunitySolutions"
                    type="checkbox" 
                    checked={hideCommunitySolutionsUntilFirstAttempt} 
                    onChange={(e) => setHideCommunitySolutionsUntilFirstAttempt(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label htmlFor="allowUnlimitedAttempts" className="cursor-pointer">Allow unlimited attempts</label>
                  <input 
                    id="allowUnlimitedAttempts"
                    type="checkbox" 
                    checked={allowUnlimitedAttempts} 
                    onChange={(e) => setAllowUnlimitedAttempts(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
                
                {!allowUnlimitedAttempts && (
                  <div className="flex items-center justify-between pl-4">
                    <label htmlFor="maxAttempts">Set maximum attempts</label>
                    <input 
                      id="maxAttempts"
                      type="number" 
                      min={1}
                      value={maxAttempts} 
                      onChange={(e) => setMaxAttempts(e.target.value)} 
                      className="w-16 p-1 border border-slate-200 rounded text-center bg-white dark:bg-slate-900 dark:border-slate-800 font-extrabold focus:outline-none"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <label htmlFor="allowAnswerEditing" className="cursor-pointer">Allow answer editing</label>
                  <input 
                    id="allowAnswerEditing"
                    type="checkbox" 
                    checked={allowAnswerEditing} 
                    onChange={(e) => setAllowAnswerEditing(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 py-2.5 text-xs font-bold text-white transition-all shadow-premium disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving Settings...' : 'Save Settings'}
                </button>
              </form>
            </div>
          )}

          <AILearningAssistant
            doubt={doubt}
            aiAnalysis={aiAnalysis}
            answers={answers}
            hints={hints}
            hintLoading={hintLoading}
            isAsker={isAsker}
            handleRequestHint={handleRequestHint}
            isEscalated={isEscalated}
            escalationReason={escalationReason}
            userRole={user?.role as 'student' | 'teacher'}
          />
        </div>
      </div>

      {/* AI Score Feedback Modal Overlay */}
      {evalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 border border-slate-100 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 space-y-6 max-h-[85vh] overflow-y-auto m-6">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="h-14 w-14 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
                <Sparkles className="h-8 w-8 animate-float text-brand-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">AI Grading Evaluation</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Your solver contribution has been processed
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">AI Grading Verdict:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  evalModal.evaluation?.verdict === 'correct'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                    : evalModal.evaluation?.verdict === 'incorrect'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/20'
                    : 'bg-amber-50 text-amber-600 dark:bg-amber-955/20'
                }`}>
                  {evalModal.evaluation?.verdict?.replace('_', ' ') || 'evaluated'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700 dark:text-slate-350">Overall Answer Score:</span>
                <span className={`text-2xl font-black ${evalModal.evaluation?.score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {evalModal.evaluation?.score || 0}/100
                </span>
              </div>

              {/* Progress bars breakdown */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-455 mb-1">
                    <span>Correctness</span>
                    <span>{evalModal.evaluation?.correctness || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${evalModal.evaluation?.correctness || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-bold text-slate-455 mb-1">
                    <span>Clarity</span>
                    <span>{evalModal.evaluation?.clarity || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${evalModal.evaluation?.clarity || 0}%` }} />
                  </div>
                </div>
                {evalModal.evaluation?.completeness !== undefined && (
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-455 mb-1">
                      <span>Completeness</span>
                      <span>{evalModal.evaluation?.completeness}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${evalModal.evaluation?.completeness}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs italic text-slate-550 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3 dark:text-slate-400">
                <strong className="not-italic text-slate-700 dark:text-slate-350">AI Critique:</strong> {evalModal.evaluation?.feedback}
              </div>

              {evalModal.evaluation?.missingConcepts && evalModal.evaluation.missingConcepts.length > 0 && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Missing Concepts Identified:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {evalModal.evaluation.missingConcepts.map((concept: string, idx: number) => (
                      <span key={idx} className="bg-rose-50 text-rose-600 border border-rose-150 px-2 py-0.5 rounded text-[10px] font-bold">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
                  {(() => {
              const score = evalModal.evaluation?.score || 0;
              if (score === 100) {
                return (
                  <div className="text-center rounded-2xl bg-emerald-50 p-4 border border-emerald-150 text-xs font-bold text-emerald-700 dark:bg-emerald-955/20 dark:text-emerald-400 space-y-2">
                    <div className="flex items-center justify-center space-x-2">
                      <Award className="h-6 w-6 text-yellow-500 fill-yellow-500 animate-bounce" />
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">✅ Excellent!</span>
                    </div>
                    <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-300">You have mastered this question.</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-455 font-extrabold uppercase tracking-wider">
                      +{evalModal.xpGained || 0} XP & +{evalModal.coinsGained || 0} Coins Awarded!
                    </p>
                    {evalModal.levelUp && (
                      <div className="mt-1 font-black text-brand-600 animate-pulse dark:text-brand-400 text-sm">
                        ⭐ LEVEL UP! You reached Level {evalModal.newLevel}! ⭐
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div className="space-y-4">
                    <div className="text-center rounded-2xl bg-amber-50 p-4 border border-amber-150 text-xs font-semibold text-amber-800 dark:bg-amber-955/20 dark:text-amber-450 space-y-1">
                      <p className="font-extrabold text-xs">
                        {score >= 80 
                          ? "You are very close! Review the feedback and improve your answer."
                          : "Try correcting the highlighted concepts and submit again."}
                      </p>
                    </div>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          setEvalModal(null);
                          setEditMode('text');
                        }}
                        className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-700 py-3 text-xs font-bold text-slate-705 dark:text-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                      >
                        Edit Answer
                      </button>
                      <button
                        onClick={() => {
                          setEvalModal(null);
                          setEditMode('text');
                          handleSubmitAnswer(null as any);
                        }}
                        className="flex-1 rounded-2xl bg-brand-600 hover:bg-brand-700 py-3 text-xs font-bold text-white transition-all shadow-premium"
                      >
                        Submit Improved Answer
                      </button>
                    </div>
                  </div>
                );
              }
            })()}

            <div className="flex flex-col gap-3 w-full border-t border-slate-150 dark:border-slate-800 pt-4">
              {evalModal.evaluation?.score === 100 && (
                <button
                  onClick={() => {
                    setEvalModal(null);
                    setEditMode('text');
                    setAnswerContent('');
                    setOriginalUploadUrl('');
                    setInputType('text');
                  }}
                  className="w-full rounded-2xl bg-brand-50 hover:bg-brand-100 text-brand-650 py-3 text-xs font-black transition-all dark:bg-brand-950/20 dark:text-brand-400"
                >
                  Submit Another Solution
                </button>
              )}
              <button
                onClick={() => setEvalModal(null)}
                className="w-full rounded-2xl bg-brand-650 hover:bg-brand-700 py-3 text-sm font-semibold text-white transition-all shadow-premium flex items-center justify-center space-x-1"
              >
                <span>← Back to Question</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
