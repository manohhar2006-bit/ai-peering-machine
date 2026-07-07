import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Brain,
  Scale,
  Award,
  AlertTriangle,
  Lightbulb,
  Eye,
  Loader2,
  CheckCircle,
  HelpCircle,
  Send,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  MessageCircle,
  Sparkles,
  GraduationCap,
  Trophy,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Star,
  X,
  Check,
  Pencil,
  History
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface AILearningAssistantProps {
  doubt: any;
  aiAnalysis: any;
  answers: any[];
  hints: any[];
  hintLoading: boolean;
  isAsker: boolean;
  handleRequestHint: () => Promise<void>;
  isEscalated: boolean;
  escalationReason: string | null;
  userRole?: 'student' | 'teacher';
}

// ─── Metric Bar ───────────────────────────────────────────────────────────────
const MetricBar: React.FC<{
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <div>
    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className={`font-black text-xs ${value >= 75 ? 'text-emerald-500' : value >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
        {value}
      </span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

// ─── Confidence Badge ─────────────────────────────────────────────────────────
const ConfidenceBadge: React.FC<{ score: number }> = ({ score }) => {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40'
    : score >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40'
    : 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40';
  const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${color}`}>
      <Shield className="h-2.5 w-2.5" />
      {label} Confidence — {score}%
    </span>
  );
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing: React.FC<{ score: number; size?: number }> = ({ score, size = 44 }) => {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="flex-shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="20" cy="20" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 20 20)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
};

// ─── Animated Dimension Ring (larger, with label) ─────────────────────────────
const DimRing: React.FC<{ label: string; value: number; color: string; delay?: number }> = ({ label, value, color, delay = 0 }) => {
  const [animated, setAnimated] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = animated ? (value / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="58" height="58" viewBox="0 0 58 58" className="flex-shrink-0">
        <circle cx="29" cy="29" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" className="dark:stroke-slate-800" />
        <circle
          cx="29" cy="29" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 29 29)"
          style={{ transition: `stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1) ${delay}ms` }}
        />
        <text x="29" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill={color}>{value}</text>
      </svg>
      <span className="text-[9px] font-extrabold text-center text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
    </div>
  );
};

// ─── Verdict Badge ────────────────────────────────────────────────────────────
const VerdictBadge: React.FC<{ verdict: string }> = ({ verdict }) => {
  const map: Record<string, { label: string; cls: string }> = {
    correct: { label: '✓ Correct', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40' },
    partially_correct: { label: '~ Partially Correct', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40' },
    incorrect: { label: '✗ Incorrect', cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40' }
  };
  const { label, cls } = map[verdict] ?? map['partially_correct'];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${cls}`}>
      {label}
    </span>
  );
};

// ─── Evaluator Scorecard ──────────────────────────────────────────────────────
const EvaluatorScorecard: React.FC<{
  evaluation: any;
  solverName?: string;
  onReEvaluate: () => void;
  isEvaluating: boolean;
}> = ({ evaluation, solverName, onReEvaluate, isEvaluating }) => {
  const [showDetails, setShowDetails] = React.useState(true);
  const score = evaluation.overallScore ?? evaluation.score ?? 0;

  const dimensions = [
    { label: 'Correctness', key: 'correctness', color: '#10b981' },
    { label: 'Clarity', key: 'clarity', color: '#6366f1' },
    { label: 'Completeness', key: 'completeness', color: '#0ea5e9' },
    { label: 'Logic', key: 'logicalThinking', color: '#f59e0b' },
    { label: 'Presentation', key: 'presentation', color: '#a855f7' }
  ];

  const scoreColor = score >= 75 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-rose-500';
  const scoreGradient = score >= 75
    ? 'from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100 dark:border-emerald-900/30'
    : score >= 50
    ? 'from-amber-500/10 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-100 dark:border-amber-900/30'
    : 'from-rose-500/10 to-pink-500/5 dark:from-rose-950/20 dark:to-pink-950/10 border-rose-100 dark:border-rose-900/30';

  return (
    <div className="space-y-3 text-xs">
      {/* Hero Score Banner */}
      <div className={`rounded-2xl border bg-gradient-to-br ${scoreGradient} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Evaluation</p>
            {solverName && <p className="font-extrabold text-slate-700 dark:text-slate-200 mt-0.5">{solverName}</p>}
          </div>
          {evaluation.verdict && <VerdictBadge verdict={evaluation.verdict} />}
        </div>

        {/* Large Overall Score */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="7" className="dark:stroke-slate-800/60" />
              <circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke={score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e'}
                strokeWidth="7"
                strokeDasharray={`${(score / 100) * (2 * Math.PI * 32)} ${2 * Math.PI * 32}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black leading-none ${scoreColor}`}>{score}</span>
              <span className="text-[8px] font-bold text-slate-400">/100</span>
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-2xl font-black ${scoreColor}`}>{score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{evaluation.feedback}</p>
          </div>
        </div>
      </div>

      {/* 5-Dimension Grid */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3">Dimension Breakdown</p>
        <div className="grid grid-cols-5 gap-2 justify-items-center">
          {dimensions.map((dim, i) => (
            <DimRing
              key={dim.key}
              label={dim.label}
              value={evaluation[dim.key] ?? 50}
              color={dim.color}
              delay={i * 120}
            />
          ))}
        </div>
      </div>

      {/* Details toggle */}
      <button
        onClick={() => setShowDetails(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
      >
        <span>Detailed Feedback</span>
        {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {showDetails && (
        <div className="space-y-3">
          {/* Strengths */}
          {evaluation.strengths && evaluation.strengths.length > 0 && (
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="h-3 w-3" /> Strengths
              </p>
              <ul className="space-y-1">
                {evaluation.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
            <div className="rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/10 p-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <X className="h-3 w-3" /> Weaknesses
              </p>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 flex-shrink-0 mt-1.5" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {evaluation.suggestions && evaluation.suggestions.length > 0 && (
            <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/10 p-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Lightbulb className="h-3 w-3" /> Suggestions
              </p>
              <ul className="space-y-1">
                {evaluation.suggestions.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[10px] text-slate-600 dark:text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Concepts */}
          {evaluation.missingConcepts && evaluation.missingConcepts.length > 0 && (
            <div className="rounded-xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Missing Concepts
              </p>
              <div className="flex flex-wrap gap-1">
                {evaluation.missingConcepts.map((c: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Re-evaluate */}
      <button
        onClick={onReEvaluate}
        disabled={isEvaluating}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F172A] text-slate-500 dark:text-slate-400 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all disabled:opacity-50"
      >
        {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {isEvaluating ? 'Re-evaluating…' : 'Re-run AI Evaluation'}
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AILearningAssistant: React.FC<AILearningAssistantProps> = ({
  doubt,
  aiAnalysis,
  answers,
  hints,
  hintLoading,
  isAsker,
  handleRequestHint,
  isEscalated,
  escalationReason,
  userRole = 'student'
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'referee' | 'evaluator' | 'escalation'>('coach');
  const [showConcept, setShowConcept] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>('');

  // ── Referee State ────────────────────────────────────────────────────────────
  const [refereeData, setRefereeData] = useState<any>(null);
  const [refereeLoading, setRefereeLoading] = useState(false);
  const [refereeError, setRefereeError] = useState<string | null>(null);
  const [currentEvalId, setCurrentEvalId] = useState<string | null>(null);

  // Teacher override state
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [overrideIndex, setOverrideIndex] = useState<number>(0);
  const [teacherNote, setTeacherNote] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [teacherDecision, setTeacherDecision] = useState<'approved' | 'overridden' | null>(null);

  // History state
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // ── Evaluator & Escalation State ────────────────────────────────────────────
  const [evaluatingAnswerId, setEvaluatingAnswerId] = useState<string | null>(null);
  const [localEscalated, setLocalEscalated] = useState(isEscalated);
  const [localEscalationReason, setLocalEscalationReason] = useState(escalationReason);
  const [escalationPriority, setEscalationPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [resolveLoading, setResolveLoading] = useState(false);

  // ── Coach Chat State ─────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<{ role: 'coach' | 'user'; content: string; level?: number; label?: string }[]>([]);
  const [followUpInput, setFollowUpInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const LEVEL_LABELS = [
    'Level 1 — Gentle Nudge',
    'Level 2 — Stronger Hint',
    'Level 3 — Concept Explained',
    'Level 4 — Worked Example',
    'Level 5 — Step-by-Step Guide',
    'Level 6 — Teacher Recommendation',
  ];

  // Sync hints into chat bubbles
  useEffect(() => {
    if (hints.length === 0) {
      setChatMessages([{ role: 'coach', content: 'Hello! I am your AI Coach. I will guide you through this doubt step by step without giving away the answer directly. Click **Reveal Hint** to get your first nudge!', label: 'Coach Intro' }]);
      return;
    }
    const bubbles = hints.map((h: any, i: number) => ({
      role: 'coach' as const,
      content: h.hintContent || h.content || '',
      level: typeof h.ladderIndex === 'number' ? h.ladderIndex + 1 : i + 1,
      label: LEVEL_LABELS[h.ladderIndex ?? i] || `Level ${i + 1}`,
    }));
    setChatMessages(bubbles);
  }, [hints]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (answers.length > 0 && !selectedAnswerId) {
      setSelectedAnswerId(answers[0]._id);
    }
  }, [answers, selectedAnswerId]);

  // ─── Fetch Referee Data ───────────────────────────────────────────────────
  const fetchReferee = async () => {
    if (answers.length === 0) return;
    setRefereeLoading(true);
    setRefereeError(null);
    setRefereeData(null);
    setTeacherDecision(null);
    setCurrentEvalId(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/referee`,
        { doubtId: doubt._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRefereeData(response.data);
      // History will be refreshed on demand
    } catch (err: any) {
      console.error('AI Referee failed:', err);
      setRefereeError('AI Referee comparison failed. Please try again.');
    } finally {
      setRefereeLoading(false);
    }
  };

  // Auto-fetch referee when tab opens and there are answers
  useEffect(() => {
    if (activeTab === 'referee' && answers.length > 0 && !refereeData && !refereeLoading) {
      fetchReferee();
    }
  }, [activeTab, answers.length]);

  // ─── Fetch Referee History ────────────────────────────────────────────────
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `${API_URL}/ai/referee-history/${doubt._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistoryData(data.history || []);
    } catch (err) {
      console.error('History fetch failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleHistory = () => {
    if (!showHistory && historyData.length === 0) {
      fetchHistory();
    }
    setShowHistory(prev => !prev);
  };

  // ─── Teacher Approve ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!currentEvalId) {
      // Fetch latest evaluation id from history
      await fetchHistory();
      const latest = historyData[0];
      if (!latest) { alert('No evaluation to approve yet.'); return; }
      setCurrentEvalId(latest._id);
    }
    setOverrideLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/ai/referee-override`,
        { evaluationId: currentEvalId || historyData[0]?._id, action: 'approve', teacherNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeacherDecision('approved');
      setShowOverridePanel(false);
    } catch (err) {
      console.error('Approve failed:', err);
      alert('Failed to save approval.');
    } finally {
      setOverrideLoading(false);
    }
  };

  // ─── Teacher Override ─────────────────────────────────────────────────────
  const handleOverride = async () => {
    const evalId = currentEvalId || historyData[0]?._id;
    if (!evalId) { alert('Run the referee first.'); return; }
    setOverrideLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/ai/referee-override`,
        { evaluationId: evalId, action: 'override', overriddenBestIndex: overrideIndex, teacherNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTeacherDecision('overridden');
      setShowOverridePanel(false);
    } catch (err) {
      console.error('Override failed:', err);
      alert('Failed to save override.');
    } finally {
      setOverrideLoading(false);
    }
  };

  // ─── Chat Helpers ─────────────────────────────────────────────────────────
  const handleSendFollowUp = async () => {
    const trimmed = followUpInput.trim();
    if (!trimmed || chatLoading) return;
    setFollowUpInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setChatLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_URL}/ai/chat-coach`,
        { doubtId: doubt._id, query: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChatMessages(prev => [...prev, { role: 'coach', content: data.reply || data.hintContent || 'I could not generate a response. Try rephrasing.', label: 'Coach Reply' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'coach', content: 'Something went wrong. Please try again.', label: 'Error' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleResolveWithAI = async () => {
    setResolveLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API_URL}/doubts/${doubt._id}/status`,
        { status: 'ai_hinted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Doubt successfully resolved using AI hints!');
      window.location.reload();
    } catch {
      alert('Failed to resolve doubt with AI hints');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleEvaluateAnswer = async (ans: any) => {
    setEvaluatingAnswerId(ans._id);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/evaluate-answer`,
        { doubtId: doubt._id, answerContent: ans.content, answerId: ans._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ans.aiEvaluation = response.data;
      setSelectedAnswerId('');
      setTimeout(() => setSelectedAnswerId(ans._id), 10);
    } catch {
      alert('Failed to evaluate answer');
    } finally {
      setEvaluatingAnswerId(null);
    }
  };

  const handleEscalateClick = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/escalate`,
        { doubtId: doubt._id, reason: 'low-confidence' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLocalEscalated(true);
      setLocalEscalationReason('low-confidence');
      setEscalationPriority(response.data.priority);
      alert(`Doubt escalated! Priority: ${response.data.priority.toUpperCase()}`);
    } catch {
      alert('Failed to escalate doubt');
    }
  };

  const getBestAnswer = () => {
    if (answers.length === 0) return null;
    return [...answers].sort((a, b) => (b.aiEvaluation?.score || 0) - (a.aiEvaluation?.score || 0))[0];
  };

  const bestAnswer = getBestAnswer();
  const activeAnswer = answers.find(a => a._id === selectedAnswerId) || bestAnswer;

  const isInterventionRecommended = () => {
    if (doubt?.difficulty === 'hard') return true;
    if (localEscalated) return true;
    if (answers.length > 2) {
      const scores = answers.map(a => a.aiEvaluation?.score || 0);
      if (Math.max(...scores) - Math.min(...scores) > 30) return true;
    }
    return false;
  };

  const aiConfidence = () => {
    if (doubt?.difficulty === 'hard') return 45;
    if (doubt?.difficulty === 'medium') return 75;
    return 95;
  };

  const tabs = [
    { id: 'coach', label: 'Coach', icon: Brain },
    { id: 'referee', label: 'Referee', icon: Scale },
    { id: 'evaluator', label: 'Evaluator', icon: Award },
    { id: 'escalation', label: 'Escalation', icon: AlertTriangle }
  ];

  // ─── Ranked medal colors ───────────────────────────────────────────────────
  const medalColors = ['text-amber-500', 'text-slate-400', 'text-orange-700'];
  const rankLabel = (rank: number) => rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`;

  // Per-answer score card component
  const AnswerScoreCard = ({ score, rank }: { score: any; rank: number }) => {
    const [expanded, setExpanded] = useState(rank === 0); // auto-expand best
    const isBest = refereeData?.bestAnswerIndex === score.index;

    return (
      <div className={`rounded-xl border text-xs transition-all ${
        isBest
          ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 dark:border-emerald-800/60 shadow-sm'
          : 'border-slate-200 bg-white dark:bg-[#0F172A] dark:border-slate-800'
      }`}>
        {/* Card Header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between p-3 text-left"
        >
          <div className="flex items-center gap-2.5">
            <ScoreRing score={score.overallScore} size={40} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                  {score.solverName || `Answer ${score.index + 1}`}
                </span>
                {isBest && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    <Trophy className="h-2.5 w-2.5" /> Best
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">{rankLabel(rank)} Rank</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-black text-sm ${score.overallScore >= 75 ? 'text-emerald-500' : score.overallScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
              {score.overallScore}/100
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
          </div>
        </button>

        {/* Expanded Detail */}
        {expanded && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
            <div className="grid grid-cols-2 gap-2">
              <MetricBar label="Correctness" value={score.correctness} color="#10b981" icon={<CheckCircle className="h-2.5 w-2.5" />} />
              <MetricBar label="Clarity" value={score.clarity} color="#6366f1" icon={<Eye className="h-2.5 w-2.5" />} />
              <MetricBar label="Completeness" value={score.completeness} color="#0ea5e9" icon={<Award className="h-2.5 w-2.5" />} />
              <MetricBar label="Originality" value={score.originality} color="#a855f7" icon={<Sparkles className="h-2.5 w-2.5" />} />
            </div>

            {score.strengths && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-2 space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" /> Strengths
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">{score.strengths}</p>
              </div>
            )}

            {score.weaknesses && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-2 space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <X className="h-2.5 w-2.5" /> Weaknesses
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">{score.weaknesses}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 flex flex-col space-y-6">
      {/* Title */}
      <div className="flex items-center space-x-2 border-b border-slate-50 dark:border-slate-800 pb-3">
        <div className="h-7 w-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <Brain className="h-4.5 w-4.5 animate-float" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">AI Learning Assistant</h3>
      </div>

      {/* Tab Bar */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 rounded-2xl dark:bg-[#0F172A]">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setShowConcept(false);
                setShowExample(false);
              }}
              className={`py-2 text-[10px] font-bold rounded-xl flex flex-col items-center justify-center space-y-1 transition-all ${
                isActive
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-455 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-[300px]">

        {/* ── COACH TAB ───────────────────────────────────────────────────────── */}
        {activeTab === 'coach' && (
          <div className="flex flex-col" style={{ height: '500px' }}>
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center dark:bg-amber-950/20">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Coach Mode</p>
                  <p className="text-[10px] text-slate-400">{hints.length === 0 ? 'No hints revealed yet' : `${hints.length}/6 hints unlocked`}</p>
                </div>
              </div>
              <div className="flex space-x-0.5">
                {[1,2,3,4,5,6].map(lvl => (
                  <div key={lvl} title={LEVEL_LABELS[lvl - 1]}
                    className={`h-2 w-4 rounded-full transition-all ${
                      lvl <= hints.length
                        ? lvl <= 2 ? 'bg-amber-400' : lvl <= 4 ? 'bg-orange-500' : 'bg-rose-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] p-3 space-y-3" style={{ minHeight: 0 }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'coach' && (
                    <div className="flex-shrink-0 mr-2 mt-1">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                      : msg.level && msg.level <= 2
                        ? 'bg-amber-50 border border-amber-100 dark:bg-amber-950/20 dark:border-amber-800/40 text-slate-700 dark:text-slate-300 rounded-2xl rounded-bl-md'
                        : msg.level && msg.level <= 4
                          ? 'bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-800/40 text-slate-700 dark:text-slate-300 rounded-2xl rounded-bl-md'
                          : msg.level && msg.level >= 5
                            ? 'bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-800/40 text-slate-700 dark:text-slate-300 rounded-2xl rounded-bl-md'
                            : 'bg-white border border-slate-200 dark:bg-[#1E293B] dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl rounded-bl-md'
                  } px-3 py-2.5 shadow-sm`}>
                    {msg.label && (
                      <div className="flex items-center space-x-1 mb-1.5">
                        {msg.level ? (
                          <span className={`inline-flex items-center space-x-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            msg.level <= 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                            : msg.level <= 4 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          }`}>
                            {msg.level <= 2 ? <Unlock className="h-2.5 w-2.5" /> : msg.level >= 5 ? <GraduationCap className="h-2.5 w-2.5" /> : <Lightbulb className="h-2.5 w-2.5" />}
                            <span>{msg.label}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{msg.label}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 ml-2 mt-1">
                      <div className="h-6 w-6 rounded-full bg-brand-600 flex items-center justify-center shadow-sm">
                        <MessageCircle className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(hintLoading || chatLoading) && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex space-x-1 items-center">
                      <div className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex-shrink-0 mt-2 space-y-2">
              {isAsker && !['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status) && hints.length < 6 && (
                <button
                  onClick={handleRequestHint}
                  disabled={hintLoading || chatLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl font-bold py-2 text-xs transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: hints.length < 2 ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : hints.length < 4 ? 'linear-gradient(135deg, #f97316, #ea580c)'
                      : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                    color: 'white'
                  }}
                >
                  {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                    <>
                      {hints.length < 6 ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      <span>
                        {hints.length === 0 ? 'Reveal Level 1 — Gentle Nudge'
                          : hints.length === 1 ? 'Reveal Level 2 — Stronger Hint'
                          : hints.length === 2 ? 'Reveal Level 3 — Concept'
                          : hints.length === 3 ? 'Reveal Level 4 — Worked Example'
                          : hints.length === 4 ? 'Reveal Level 5 — Step-by-Step'
                          : 'Reveal Level 6 — Teacher Recommendation'}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}

              {isAsker && !['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status) && hints.length > 0 && (
                <button
                  onClick={handleResolveWithAI}
                  disabled={resolveLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 text-xs transition-all shadow-sm disabled:opacity-60"
                >
                  {resolveLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  <span>I understand — Mark as Resolved</span>
                </button>
              )}

              <div className="flex items-center space-x-2 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
                <input
                  type="text"
                  placeholder={hints.length === 0 ? 'Reveal a hint first, then ask follow-ups…' : 'Ask a follow-up question…'}
                  value={followUpInput}
                  onChange={e => setFollowUpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendFollowUp()}
                  disabled={chatLoading || hints.length === 0}
                  className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder-slate-350 dark:placeholder-slate-600 outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSendFollowUp}
                  disabled={chatLoading || !followUpInput.trim() || hints.length === 0}
                  className="h-6 w-6 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                >
                  {chatLoading ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Send className="h-3 w-3 text-white" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── REFEREE TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'referee' && (
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-brand-500" />
                  AI Answer Comparison
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {answers.length} answer{answers.length !== 1 ? 's' : ''} compared across 4 dimensions
                </p>
              </div>
              {refereeData && (
                <button
                  onClick={fetchReferee}
                  disabled={refereeLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-all disabled:opacity-50"
                >
                  <Loader2 className={`h-3 w-3 ${refereeLoading ? 'animate-spin' : ''}`} />
                  Re-run
                </button>
              )}
            </div>

            {/* Empty state */}
            {answers.length === 0 && (
              <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl dark:bg-[#0F172A] space-y-2">
                <HelpCircle className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-semibold">No solutions submitted yet</p>
                <p className="text-[10px]">The referee will activate once students post answers.</p>
              </div>
            )}

            {/* Loading */}
            {answers.length > 0 && refereeLoading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
                  <Scale className="h-4 w-4 text-brand-600 absolute inset-0 m-auto" />
                </div>
                <p className="text-xs font-semibold text-slate-500">Evaluating {answers.length} answers…</p>
                <p className="text-[10px] text-slate-400">Scoring across Correctness · Clarity · Completeness · Originality</p>
              </div>
            )}

            {/* Error */}
            {refereeError && !refereeLoading && (
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/30 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Referee Error</p>
                  <p>{refereeError}</p>
                  <button onClick={fetchReferee} className="mt-2 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px]">
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {refereeData && !refereeLoading && (
              <div className="space-y-4">

                {/* Confidence + Winner banner */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50/50 border border-brand-100 dark:from-brand-950/20 dark:to-indigo-950/10 dark:border-brand-900/30 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">AI Decision</span>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{refereeData.winner}</p>
                    </div>
                    <ConfidenceBadge score={refereeData.confidenceScore || 0} />
                  </div>

                  {refereeData.comparison && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-brand-100 dark:border-brand-900/30 pt-2">
                      {refereeData.comparison}
                    </p>
                  )}

                  {/* Missing concepts */}
                  {refereeData.missingInAll && refereeData.missingInAll.length > 0 && (
                    <div className="border-t border-brand-100 dark:border-brand-900/30 pt-2 space-y-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" /> Missing in All Answers
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {refereeData.missingInAll.map((concept: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Teacher decision status */}
                  {teacherDecision && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-extrabold rounded-lg px-2 py-1.5 ${
                      teacherDecision === 'approved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    }`}>
                      <ShieldCheck className="h-3 w-3" />
                      Teacher {teacherDecision === 'approved' ? 'Approved AI Decision' : 'Overrode AI Decision'}
                    </div>
                  )}
                </div>

                {/* Per-answer scorecards (ranked order) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Answer Scorecards</span>
                  {(refereeData.ranking || []).map((ansIndex: number, rank: number) => {
                    const score = (refereeData.perAnswerScores || []).find((s: any) => s.index === ansIndex);
                    if (!score) return null;
                    return <AnswerScoreCard key={ansIndex} score={score} rank={rank} />;
                  })}
                </div>

                {/* Teacher Override Panel */}
                {userRole === 'teacher' && (
                  <div className="border border-violet-200 dark:border-violet-800/40 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowOverridePanel(p => !p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-violet-50 dark:bg-violet-950/20 text-xs font-bold text-violet-700 dark:text-violet-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Teacher Review Panel
                      </span>
                      {showOverridePanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showOverridePanel && (
                      <div className="p-3 space-y-3 bg-white dark:bg-[#0F172A]">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Review the AI's decision and either approve it or select a different best answer.
                        </p>

                        <div className="flex gap-2">
                          <button
                            onClick={handleApprove}
                            disabled={overrideLoading}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold transition-all disabled:opacity-60"
                          >
                            {overrideLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            Approve AI Decision
                          </button>
                          <button
                            onClick={() => setShowOverridePanel(p => p)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-extrabold transition-all"
                          >
                            <Pencil className="h-3 w-3" />
                            Override Answer
                          </button>
                        </div>

                        {/* Override picker */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Select Best Answer</label>
                          <select
                            value={overrideIndex}
                            onChange={e => setOverrideIndex(Number(e.target.value))}
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] py-1.5 px-2 text-slate-700 dark:text-slate-300 font-bold focus:outline-none"
                          >
                            {(refereeData.perAnswerScores || []).map((s: any) => (
                              <option key={s.index} value={s.index}>
                                {s.solverName || `Answer ${s.index + 1}`} — {s.overallScore}/100
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Teacher Note (optional)</label>
                          <textarea
                            value={teacherNote}
                            onChange={e => setTeacherNote(e.target.value)}
                            rows={2}
                            placeholder="Add reasoning for your decision…"
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] py-1.5 px-2 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none resize-none"
                          />
                        </div>

                        <button
                          onClick={handleOverride}
                          disabled={overrideLoading}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-extrabold transition-all disabled:opacity-60"
                        >
                          {overrideLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save Override Decision
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Evaluation History */}
                <button
                  onClick={handleToggleHistory}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    Evaluation History
                    {historyData.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {historyData.length}
                      </span>
                    )}
                  </span>
                  {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showHistory && (
                  <div className="space-y-2">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-4 gap-2 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading history…
                      </div>
                    ) : historyData.length === 0 ? (
                      <p className="text-[10px] text-center text-slate-400 py-4">No previous evaluations found.</p>
                    ) : (
                      historyData.map((eval_: any, i) => (
                        <div key={eval_._id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F172A] text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {new Date(eval_.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <ConfidenceBadge score={eval_.confidenceScore || 0} />
                              {eval_.teacherApproved && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  {eval_.teacherOverriddenBestIndex !== undefined ? 'Overridden' : 'Approved'}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{eval_.winner}</p>
                          {eval_.teacherNote && (
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 italic">
                              Teacher note: {eval_.teacherNote}
                            </p>
                          )}
                          {eval_.triggeredBy?.name && (
                            <p className="text-[9px] text-slate-400">Run by {eval_.triggeredBy.name}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Run Referee button (when no data yet and not loading) */}
            {answers.length > 0 && !refereeData && !refereeLoading && !refereeError && (
              <button
                onClick={fetchReferee}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-xs font-extrabold shadow-sm transition-all"
              >
                <Scale className="h-4 w-4" />
                Run AI Referee Comparison
              </button>
            )}
          </div>
        )}

        {/* ── EVALUATOR TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'evaluator' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-brand-500" />
                  Solution Quality Analyzer
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">5-dimension AI evaluation with detailed feedback</p>
              </div>
            </div>

            {answers.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl dark:bg-[#0F172A] space-y-2">
                <Award className="h-10 w-10 mx-auto text-slate-300" />
                <p className="font-semibold">No solutions posted yet</p>
                <p className="text-[10px]">Write an answer on the left to activate AI grading.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Answer Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Answer to Evaluate</label>
                  <select
                    value={selectedAnswerId}
                    onChange={(e) => setSelectedAnswerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-300 focus:outline-none"
                  >
                    {answers.map((ans) => (
                      <option key={ans._id} value={ans._id}>
                        {ans.solverId?.name} — {ans.aiEvaluation ? `${ans.aiEvaluation.score ?? ans.aiEvaluation.overallScore ?? '?'}/100` : 'Not evaluated'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ─── Scorecard ─── */}
                {activeAnswer && (
                  activeAnswer.aiEvaluation ? (
                    <EvaluatorScorecard
                      evaluation={activeAnswer.aiEvaluation}
                      solverName={activeAnswer.solverId?.name}
                      onReEvaluate={() => handleEvaluateAnswer(activeAnswer)}
                      isEvaluating={evaluatingAnswerId === activeAnswer._id}
                    />
                  ) : (
                    <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-brand-50/30 dark:from-[#0F172A] dark:to-brand-950/10 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                      {/* Pending state animation */}
                      <div className="relative w-20 h-20 mx-auto">
                        <svg viewBox="0 0 80 80" className="w-full h-full">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-800" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#6366f1" strokeWidth="6"
                            strokeDasharray="50 150" strokeLinecap="round"
                            transform="rotate(-90 40 40)"
                            className="animate-spin" style={{ animationDuration: '2s' }}
                          />
                        </svg>
                        <Award className="h-7 w-7 text-brand-500 absolute inset-0 m-auto" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Not Evaluated Yet</p>
                        <p className="text-[10px] text-slate-400">AI will score across 5 quality dimensions</p>
                      </div>
                      <button
                        onClick={() => handleEvaluateAnswer(activeAnswer)}
                        disabled={evaluatingAnswerId === activeAnswer._id}
                        className="mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-sm transition-all disabled:opacity-60"
                      >
                        {evaluatingAnswerId === activeAnswer._id ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Evaluating…</>
                        ) : (
                          <><Sparkles className="h-3.5 w-3.5" />Run AI Evaluation</>
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ESCALATION TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'escalation' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Faculty Escalation Monitor</h4>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-3 dark:bg-[#0F172A] dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-450">Difficulty Level:</span>
                <span className="font-bold text-slate-700 capitalize dark:text-slate-200">{doubt.difficulty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">Peer Solvers Active:</span>
                <span className="font-bold text-slate-700 dark:text-slate-205">{answers.length} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-450">AI Confidence:</span>
                <span className="font-bold text-slate-750 dark:text-slate-205">{aiConfidence()}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-450">Teacher Needed:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  isInterventionRecommended()
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/20'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-955/20'
                }`}>
                  {isInterventionRecommended() ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
              localEscalated
                ? 'border-red-200 bg-red-50/40 text-red-700 dark:bg-red-950/15 dark:border-red-900/30'
                : 'border-slate-200 bg-slate-50/50 text-slate-550 dark:bg-[#0F172A] dark:border-slate-800'
            }`}>
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <AlertTriangle className={`h-4.5 w-4.5 ${localEscalated ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                <span>Escalation Status: {localEscalated ? 'Flagged Awaiting Faculty' : 'Peer Resolution Mode'}</span>
              </div>
              {localEscalated ? (
                <div className="space-y-1">
                  <p>This doubt thread has been escalated. Faculty has been notified because: {
                    localEscalationReason === 'timeout' ? 'No solver responded within the peer-routing window.'
                    : localEscalationReason === 'contradictory' ? 'Conflicting solver answers were detected.'
                    : 'Difficulty is marked as Hard or AI evaluation confidence is low.'
                  }</p>
                  <span className="font-bold text-[10px] uppercase text-red-650 block pt-1">
                    Escalation Priority: {escalationPriority.toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p>Students are actively discussing this query. Auto-escalation checks will trigger if ratings disagree or average scores remain low.</p>
                  {isAsker && !['peer_solved', 'ai_hinted', 'teacher_solved'].includes(doubt.status) && (
                    <button
                      onClick={handleEscalateClick}
                      className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2 text-xs transition-all shadow-sm"
                    >
                      Manually Escalate to Teacher
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
