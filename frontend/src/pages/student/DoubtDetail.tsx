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
  Loader2
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

  // Hint State
  const [hints, setHints] = useState<any[]>([]);
  const [hintLoading, setHintLoading] = useState(false);

  // Form State
  const [answerContent, setAnswerContent] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [evalModal, setEvalModal] = useState<any>(null); // For AI feedback overlay

  const fetchAIAnalysis = async (doubtId: string, title: string, description: string, subjectName: string) => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await axios.post(`${API_URL}/ai/analyze-doubt`, {
        doubtId,
        doubtText: `${title}\n${description}`,
        subject: subjectName
      });
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
    } catch (err) {
      console.error('Failed to run AI analysis:', err);
      setAiError('AI analysis unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchDoubt = async () => {
    try {
      const response = await axios.get(`${API_URL}/doubts/${id}`);
      setDoubtData(response.data);

      const answersResponse = await axios.get(`${API_URL}/answers/doubt/${id}`);
      setAnswers(answersResponse.data);

      if (user?.role === 'student' && response.data.doubt.askerId._id === user.id) {
        const hintsResponse = await axios.get(`${API_URL}/hints/revealed/${id}`);
        setHints(hintsResponse.data);
      }

      if (response.data.doubt) {
        fetchAIAnalysis(
          response.data.doubt._id,
          response.data.doubt.title,
          response.data.doubt.description,
          response.data.doubt.subjectId?.name || 'General'
        );
      }
    } catch (err) {
      console.error('Failed to load doubt details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDoubt();
  }, [id, user]);

  const handleRequestHint = async () => {
    if (hints.length >= 3) {
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

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerContent.trim()) return;

    setSubmitLoading(true);
    try {
      const response = await axios.post(`${API_URL}/answers`, {
        doubtId: id,
        content: answerContent,
        hintsUsedCount: hints.length
      });

      setEvalModal(response.data);
      setAnswerContent('');
      await fetchDoubt();
      await refreshProfile(); // Refresh student statistics
    } catch (err) {
      console.error('Failed to post answer:', err);
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
              Asked by {doubt.askerId?.name} ({new Date(doubt.createdAt).toLocaleDateString()})
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

        {/* AI Deep Analysis Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-brand-655 animate-float" />
            <h3 className="text-sm font-extrabold text-slate-850 dark:text-slate-200">AI Deep Analysis</h3>
          </div>

          {aiLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
            </div>
          ) : aiError ? (
            <p className="text-xs text-red-500 font-semibold">AI analysis unavailable</p>
          ) : aiAnalysis ? (
            <div className="grid md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-400">
              <div className="space-y-2">
                <p>
                  <strong className="text-slate-850 dark:text-slate-300">Topic:</strong> {aiAnalysis.topic || 'General'}
                </p>
                <p className="leading-relaxed">
                  <strong className="text-slate-850 dark:text-slate-300">Concept Explanation:</strong> {aiAnalysis.conceptExplanation}
                </p>
                {aiAnalysis.keyTerms && aiAnalysis.keyTerms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="font-bold text-slate-850 dark:text-slate-300 mr-1 self-center">Key Terms:</span>
                    {aiAnalysis.keyTerms.map((term: string, idx: number) => (
                      <span key={idx} className="bg-slate-150 text-slate-700 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-slate-200/40 dark:border-slate-800">
                        {term}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2 bg-brand-50/10 dark:bg-[#0F172A]/30 p-4 rounded-2xl border border-brand-500/10 dark:border-brand-500/5">
                <p className="leading-relaxed">
                  <strong className="text-slate-850 dark:text-slate-300">Suggested Approach:</strong> {aiAnalysis.suggestedApproach}
                </p>
                {aiAnalysis.confidenceScore !== undefined && (
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 pt-1 font-bold">
                    AI Analysis Confidence: {aiAnalysis.confidenceScore}%
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No AI analysis data available.</p>
          )}
        </div>
      </div>

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

            {answers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <HelpCircle className="h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400">No solutions submitted yet.</p>
                {user?.role === 'student' && !isAsker && (
                  <p className="text-xs text-slate-500">Be the first to help your classmate and claim double XP!</p>
                )}
              </div>
            ) : (
              <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800">
                {answers.map((ans, idx) => (
                  <div key={ans._id} className={`pt-6 ${idx === 0 ? 'pt-0' : ''} space-y-4`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold text-xs dark:bg-indigo-950/20">
                          {ans.solverId?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200">
                            {ans.solverId?.name}
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

                    <p className="text-sm text-slate-650 leading-relaxed dark:text-slate-350">{ans.content}</p>

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

                    {/* Action buttons (accept, verify) */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {isDoubtOpen && isAsker && !ans.isAccepted && (
                        <button
                          onClick={() => handleAcceptAnswer(ans._id)}
                          className="rounded-xl border border-teal-200 hover:border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-600 transition-all dark:bg-teal-950/20"
                        >
                          Accept Solution
                        </button>
                      )}
                      {isTeacher && !ans.isTeacherVerified && (
                        <button
                          onClick={() => handleVerifyAnswer(ans._id)}
                          className="rounded-xl border border-brand-200 hover:border-brand-300 bg-brand-50 px-4 py-2 text-xs font-bold text-brand-600 transition-all dark:bg-brand-950/20 dark:text-brand-400"
                        >
                          Verify Solution
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Answer Editor Form (Student Only) */}
          {user?.role === 'student' && !isAsker && isDoubtOpen && (
            <form onSubmit={handleSubmitAnswer} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
              <h3 className="text-base font-bold text-slate-850 dark:text-slate-100">Write Your Solution</h3>
              <textarea
                required
                rows={5}
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                placeholder="Submit a clear explanation. Code snippets and equations are highly valued by AI evaluation."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:focus:border-brand-500 transition-all"
              />
              <button
                type="submit"
                disabled={submitLoading}
                className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-xs font-bold shadow-premium transition-all flex items-center space-x-1.5"
              >
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>AI is evaluating your answer...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Post & Score Solution</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Right Columns (AI Learning Assistant Panel) */}
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
        />
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

            {evalModal.xpGained > 0 ? (
              <div className="text-center rounded-2xl bg-emerald-50 p-4 border border-emerald-150 text-xs font-bold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 space-y-2">
                <div className="flex items-center justify-center space-x-2 animate-bounce">
                  <Award className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">+{evalModal.xpGained} XP Awarded!</span>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">Quest resolved successfully.</p>
                {evalModal.levelUp && (
                  <div className="mt-1 font-black text-brand-600 animate-pulse dark:text-brand-400 text-sm">
                    ⭐ LEVEL UP! You reached Level {evalModal.newLevel}! ⭐
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center rounded-2xl bg-amber-50 p-4 border border-amber-150 text-xs font-bold text-amber-700 dark:bg-amber-950/20 dark:text-amber-450">
                Answer accepted but graded under 50. Post more details next time to claim XP rewards!
              </div>
            )}

            <button
              onClick={() => setEvalModal(null)}
              className="w-full rounded-2xl bg-brand-650 hover:bg-brand-700 py-3 text-sm font-semibold text-white transition-all shadow-premium"
            >
              Back to Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
