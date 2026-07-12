import React, { useEffect, useState, useRef } from 'react';
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
  ArrowLeft,
  Search,
  ThumbsUp,
  Trophy,
  UploadCloud,
  Save,
  Activity
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

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

  // Faculty Resolution Workspace States
  const [facultyAnswerType, setFacultyAnswerType] = useState<'text' | 'image' | 'pdf' | 'multiple'>('text');
  const [facultyText, setFacultyText] = useState('');
  const [facultyImage, setFacultyImage] = useState('');
  const [facultyPdf, setFacultyPdf] = useState('');
  const [facultyFiles, setFacultyFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [publishAsCommunity, setPublishAsCommunity] = useState(true);
  const [draftSaving, setDraftSaving] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>('');

  // Community Solution Explorer States
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareAId, setCompareAId] = useState<string>('');
  const [compareBId, setCompareBId] = useState<string>('');
  const [isFading, setIsFading] = useState<boolean>(false);

  // Trigger smooth fade transition of 200ms when changing solution or comparison
  useEffect(() => {
    setIsFading(true);
    const timer = setTimeout(() => setIsFading(false), 200);
    return () => clearTimeout(timer);
  }, [selectedSolutionId, isComparing]);

  const handleToggleHelpful = async (answerId: string) => {
    try {
      const response = await axios.post(`${API_URL}/answers/${answerId}/upvote`);
      setAnswers(prev => prev.map(ans => {
        if (ans._id === answerId) {
          return { ...ans, upvotes: response.data.upvotes };
        }
        return ans;
      }));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update helpful status');
    }
  };

  const getSortedAnswers = (ansList: any[]) => {
    return [...ansList].sort((a: any, b: any) => {
      // 1. Teacher Approved Solution
      const aTeacher = a.teacherApproved || a.isTeacherVerified ? 1 : 0;
      const bTeacher = b.teacherApproved || b.isTeacherVerified ? 1 : 0;
      if (aTeacher !== bTeacher) return bTeacher - aTeacher;

      // 2. Verified 100% Solutions
      const a100 = (a.aiEvaluation?.correctness === 100 || a.aiScore === 100) ? 1 : 0;
      const b100 = (b.aiEvaluation?.correctness === 100 || b.aiScore === 100) ? 1 : 0;
      if (a100 !== b100) return b100 - a100;

      // 3. Highest AI Score
      const aScore = a.aiScore ?? a.aiEvaluation?.score ?? 0;
      const bScore = b.aiScore ?? b.aiEvaluation?.score ?? 0;
      if (aScore !== bScore) return bScore - aScore;

      // 4. Most Helpful Votes (upvotes length)
      const aVotes = a.upvotes?.length ?? 0;
      const bVotes = b.upvotes?.length ?? 0;
      if (aVotes !== bVotes) return bVotes - aVotes;

      // 5. Latest Submission
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  };


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
      let loadedAnswers = [];
      if (data && typeof data === 'object' && 'unlocked' in data) {
        setIsUnlocked(data.unlocked);
        loadedAnswers = data.answers || [];
      } else {
        setIsUnlocked(true);
        loadedAnswers = Array.isArray(data) ? data : [];
      }
      setAnswers(loadedAnswers);

      // Load teacher draft if teacher and escalated
      if (user?.role === 'teacher' && response.data.isEscalated) {
        const teacherDraft = loadedAnswers.find((ans: any) => ans.isOfficialFacultySolution && ans.isDraft);
        if (teacherDraft) {
          setFacultyText(teacherDraft.content || '');
          setFacultyAnswerType(teacherDraft.inputType || 'text');
          if (teacherDraft.inputType === 'image') {
            setFacultyImage(teacherDraft.originalUploadUrl || '');
          } else if (teacherDraft.inputType === 'pdf') {
            setFacultyPdf(teacherDraft.originalUploadUrl || '');
          } else if (teacherDraft.inputType === 'multiple') {
            setFacultyFiles(teacherDraft.uploadedFiles || []);
          }
          setPublishAsCommunity(teacherDraft.isPublished !== false);
        }
      }

      if (loadedAnswers.length > 0) {
        const sorted = getSortedAnswers(loadedAnswers);
        setSelectedSolutionId(prev => prev || sorted[0]._id);
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

  // Rich Text Editor component
  const RichTextEditor: React.FC<{
    value: string;
    onChange: (val: string) => void;
  }> = ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }, [value]);

    const handleInput = () => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    };

    const runCommand = (cmd: string, val: string = '') => {
      document.execCommand(cmd, false, val);
      handleInput();
    };

    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#0F172A] focus-within:border-brand-500 transition-all">
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => runCommand('bold')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => runCommand('italic')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs italic text-slate-700 dark:text-slate-300"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => runCommand('underline')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs underline text-slate-700 dark:text-slate-300"
            title="Underline"
          >
            U
          </button>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => runCommand('insertUnorderedList')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-805 text-xs text-slate-700 dark:text-slate-300 font-semibold"
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => runCommand('insertOrderedList')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-805 text-xs text-slate-700 dark:text-slate-300 font-semibold"
            title="Numbered List"
          >
            1. List
          </button>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) runCommand('createLink', url);
            }}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold"
            title="Insert Link"
          >
            🔗 Link
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'pre')}
            className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-705 dark:text-slate-300 font-mono"
            title="Code Block"
          >
            {"</> Code"}
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          className="w-full min-h-[150px] p-4 text-xs focus:outline-none dark:text-slate-200 bg-white dark:bg-slate-950 overflow-y-auto"
        />
      </div>
    );
  };

  const renderHintAndChatHistory = () => {
    if (hints.length === 0) {
      return (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs text-slate-400 font-semibold text-center">
          No AI Coach chat or hint history available. The student did not request hints.
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {hints.map((h: any, idx: number) => {
          const isQuery = !!h.queryText;
          return (
            <div key={idx} className="space-y-2">
              {isQuery ? (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-brand-600 text-white rounded-2xl rounded-tr-none px-4 py-2 text-xs max-w-[85%] font-medium">
                      <p className="text-[10px] text-brand-100 font-bold uppercase tracking-wider mb-1">Student</p>
                      <p className="whitespace-pre-wrap">{h.queryText}</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-105 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none px-4 py-2 text-xs max-w-[85%] font-medium border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] text-amber-600 dark:text-amber-550 font-bold uppercase tracking-wider mb-1">AI Coach</p>
                      <p className="whitespace-pre-wrap">{h.hintContent}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-amber-50/50 dark:bg-amber-955/15 border border-amber-200/30 dark:border-amber-900/25 p-3 rounded-2xl text-xs">
                  <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 animate-float" />
                  <div>
                    <span className="font-extrabold text-amber-800 dark:text-amber-450 mr-2">Hint #{h.ladderIndex + 1} Revealed:</span>
                    <span className="font-semibold text-slate-655 dark:text-slate-350">{h.hintContent}</span>
                    {h.encouragement && <p className="text-[10px] text-slate-400 italic mt-0.5">"{h.encouragement}"</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderOfficialSolutionCard = () => {
    const officialSol = answers.find(ans => ans.isOfficialFacultySolution && !ans.isDraft);
    if (!officialSol) return null;

    return (
      <div className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/15 p-6 shadow-premium dark:bg-emerald-955/5 dark:border-emerald-900/30 transition-colors duration-305 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-100/40 dark:border-emerald-900/20">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center dark:bg-emerald-950/20 dark:text-emerald-400">
              <Trophy className="h-5 w-5 animate-float" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-300">🏆 Official Faculty Solution</h3>
              <p className="text-[10px] text-slate-400">Published by {officialSol.solverId?.name || 'Faculty'} on {new Date(officialSol.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-semibold">
          {officialSol.inputType === 'text' && (
            <div 
              className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 font-semibold"
              dangerouslySetInnerHTML={{ __html: officialSol.content }}
            />
          )}

          {officialSol.inputType === 'image' && (
            <div className="space-y-2">
              {officialSol.originalUploadUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 max-h-[500px] flex items-center justify-center">
                  <img 
                    src={officialSol.originalUploadUrl} 
                    alt="Official Image Solution" 
                    className="max-w-full max-h-[480px] object-contain"
                  />
                </div>
              )}
              {officialSol.content && <p className="whitespace-pre-wrap pt-2">{officialSol.content}</p>}
            </div>
          )}

          {officialSol.inputType === 'pdf' && (
            <div className="space-y-3">
              {officialSol.originalUploadUrl && (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-[600px]">
                    <iframe 
                      src={officialSol.originalUploadUrl} 
                      className="w-full h-full border-none"
                      title="Official PDF Solution"
                    />
                  </div>
                  <a
                    href={officialSol.originalUploadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <span>Download PDF</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {officialSol.inputType === 'multiple' && (
            <div className="space-y-4">
              {officialSol.content && (
                <div 
                  className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 font-semibold mb-4"
                  dangerouslySetInnerHTML={{ __html: officialSol.content }}
                />
              )}
              
              {officialSol.uploadedFiles && officialSol.uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solution Attachments</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {officialSol.uploadedFiles.map((file: any, index: number) => {
                      const isImg = /\.(png|jpe?g|webp)$/i.test(file.url);
                      const isPdf = /\.pdf$/i.test(file.url);
                      return (
                        <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 flex flex-col space-y-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate" title={file.name}>
                            {file.name}
                          </span>
                          
                          {isImg ? (
                            <div className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 h-32 flex items-center justify-center">
                              <img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain" />
                            </div>
                          ) : isPdf ? (
                            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-955 h-32 flex items-center justify-center">
                              <FileText className="h-8 w-8 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="rounded-lg border border-slate-100 dark:border-slate-805 bg-slate-50 dark:bg-slate-955 h-32 flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-slate-400" />
                            </div>
                          )}

                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-center py-1.5 px-3 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-205 text-[10px] font-bold rounded-lg transition-all"
                          >
                            Open / Download File
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFacultyResolutionWorkspace = () => {
    const studentAttempts = answers.filter(ans => {
      const solverIdStr = ans.solverId?._id?.toString() || ans.solverId?.toString();
      return solverIdStr === doubt.askerId._id;
    });

    const activeAttempt = studentAttempts.find(a => a._id === selectedAttemptId) || studentAttempts[0];

    const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setOcrLoading(true);
      try {
        const uploadedList = [...facultyFiles];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await axios.post(`${API_URL}/ai/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploadedList.push({ name: file.name, url: response.data.originalUploadUrl });
        }
        setFacultyFiles(uploadedList);
      } catch (err: any) {
        console.error('Multiple file upload failed:', err);
        alert('Failed to upload one or more files.');
      } finally {
        setOcrLoading(false);
      }
    };

    const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf') => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setOcrLoading(true);
      const formData = new FormData();
      formData.append('file', files[0]);

      try {
        const response = await axios.post(`${API_URL}/ai/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (type === 'image') {
          setFacultyImage(response.data.originalUploadUrl);
        } else {
          setFacultyPdf(response.data.originalUploadUrl);
        }
      } catch (err: any) {
        console.error('File upload failed:', err);
        alert('Failed to upload file.');
      } finally {
        setOcrLoading(false);
      }
    };

    const handleSaveFacultyResolution = async (isDraftMode: boolean) => {
      if (isDraftMode) {
        setDraftSaving(true);
      } else {
        setPublishLoading(true);
      }

      try {
        let contentStr = '';
        let uploadUrl = '';

        if (facultyAnswerType === 'text') {
          contentStr = facultyText;
        } else if (facultyAnswerType === 'image') {
          contentStr = 'Image Solution';
          uploadUrl = facultyImage;
        } else if (facultyAnswerType === 'pdf') {
          contentStr = 'PDF Solution';
          uploadUrl = facultyPdf;
        } else if (facultyAnswerType === 'multiple') {
          contentStr = facultyText || 'Multiple Files Solution';
        }

        const response = await axios.post(`${API_URL}/doubts/${id}/faculty-resolution`, {
          content: contentStr,
          inputType: facultyAnswerType,
          originalUploadUrl: uploadUrl,
          uploadedFiles: facultyAnswerType === 'multiple' ? facultyFiles : [],
          isDraft: isDraftMode,
          publishAsCommunitySolution: publishAsCommunity
        });

        alert(response.data.message);
        setPreviewMode(false);
        await fetchDoubt();
      } catch (err: any) {
        console.error('Failed to save resolution:', err);
        alert(err.response?.data?.message || 'Resolution submission failed.');
      } finally {
        setDraftSaving(false);
        setPublishLoading(false);
      }
    };

    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/teacher/escalations')}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 transition-all border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-805 dark:text-slate-100">Faculty Doubt Resolution Workspace</h2>
            <p className="text-xs text-slate-400">Review student details, hints history, and provide an official resolved answer.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-xl text-xs font-bold dark:bg-brand-950/20 dark:text-brand-400">
                {doubt.subjectId?.code || 'GEN'}
              </span>
              <span className="bg-slate-100 text-slate-655 px-3 py-1 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-slate-400">
                {doubt.topic}
              </span>
              <span className="bg-red-50 text-red-650 px-3 py-1 rounded-xl text-xs font-bold dark:bg-red-950/20 dark:text-red-405 uppercase">
                {doubt.difficulty}
              </span>
            </div>
            <span className="flex items-center space-x-1 rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-655 dark:bg-red-955/20 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 animate-pulse animate-float" />
              <span>ESCALATED</span>
            </span>
          </div>

          <h1 className="text-xl font-black text-slate-800 dark:text-slate-105">{doubt.title}</h1>
          <p className="text-xs text-slate-400 font-bold uppercase">Asker: {doubt.askerName || doubt.askerId?.name}</p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-3">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-205 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center space-x-1.5">
            <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
            <span>Student Original Question Submission</span>
          </h3>
          {doubt.inputType === 'text' ? (
            <div className="text-xs text-slate-707 dark:text-slate-350 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-100/50 dark:border-slate-800">
              {doubt.description}
            </div>
          ) : (
            doubt.originalUploadUrl && (
              <div className="mt-3">
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
                        <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 flex items-center justify-center shadow-sm">
                          <img src={url} alt={`Student upload ${idx + 1}`} className="max-h-[300px] object-contain" />
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-[450px]">
                    <iframe src={doubt.originalUploadUrl} className="w-full h-full border-none" title="Student pdf upload" />
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-205 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center space-x-1.5">
            <Activity className="h-4.5 w-4.5 text-slate-400" />
            <span>Student Attempt History</span>
          </h3>

          {studentAttempts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No solution attempts submitted by the student.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {studentAttempts.map((att, index) => (
                  <button
                    key={att._id}
                    type="button"
                    onClick={() => setSelectedAttemptId(att._id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      (selectedAttemptId === att._id || (!selectedAttemptId && index === 0))
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-105 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Attempt {index + 1} ({att.aiScore ?? att.aiEvaluation?.score ?? 0}%)
                  </button>
                ))}
              </div>

              {activeAttempt && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Submitted on: {new Date(activeAttempt.createdAt).toLocaleString()}</span>
                    <span>AI Grade Score: {activeAttempt.aiScore ?? activeAttempt.aiEvaluation?.score ?? 0}%</span>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Attempt Content ({activeAttempt.inputType || 'text'})</span>
                    {renderAnswerContent(activeAttempt)}
                  </div>

                  {activeAttempt.aiEvaluation && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="font-black text-brand-600 uppercase tracking-wider text-[9px] block">AI Grade Dimensions & Feedback</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { key: 'correctness', label: 'Correctness' },
                          { key: 'clarity', label: 'Clarity' },
                          { key: 'completeness', label: 'Completeness' },
                          { key: 'logicalThinking', label: 'Logical Flow' }
                        ].map((dim) => {
                          const val = activeAttempt.aiEvaluation[dim.key] ?? 50;
                          return (
                            <div key={dim.key} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                <span>{dim.label}</span>
                                <span>{val}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${val}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-655 dark:text-slate-400 italic pt-1 leading-relaxed">
                        <strong className="not-italic text-slate-750 dark:text-slate-300 font-bold block mb-1">Feedback Summary:</strong>
                        "{activeAttempt.aiEvaluation.feedback}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-205 border-b border-slate-50 dark:border-slate-800 pb-1.5 flex items-center space-x-1.5">
            <Brain className="h-4.5 w-4.5 text-brand-605" />
            <span>AI Chat / Hint History</span>
          </h3>
          {renderHintAndChatHistory()}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-805 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-855 dark:text-slate-105 flex items-center space-x-1.5">
                <Sparkles className="h-5 w-5 text-brand-600 animate-float" />
                <span>Faculty Resolution Workspace</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Prepare the official answer submission</p>
            </div>
            
            <div className="flex bg-slate-100 dark:bg-[#0F172A] p-1 rounded-xl">
              {[
                { id: 'text', label: 'Rich Text' },
                { id: 'image', label: 'Upload Image' },
                { id: 'pdf', label: 'Upload PDF' },
                { id: 'multiple', label: 'Multiple Files' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFacultyAnswerType(tab.id as any);
                    setPreviewMode(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    facultyAnswerType === tab.id
                      ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-455 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {ocrLoading && (
            <div className="flex flex-col items-center justify-center p-6 space-y-2 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-dashed border-slate-205 dark:border-slate-800">
              <Loader2 className="h-8 w-8 animate-spin text-brand-505" />
              <p className="text-xs text-slate-400 font-bold">Uploading files to resolution workspace...</p>
            </div>
          )}

          {!ocrLoading && (
            <div className="space-y-4">
              
              {facultyAnswerType === 'text' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Solution Editor</span>
                  <RichTextEditor value={facultyText} onChange={setFacultyText} />
                </div>
              )}

              {facultyAnswerType === 'image' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors duration-300">
                    <input
                      type="file"
                      id="faculty-image-file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={(e) => handleSingleFileUpload(e, 'image')}
                      className="hidden"
                    />
                    <label htmlFor="faculty-image-file" className="cursor-pointer space-y-2 block">
                      <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20">
                        <Image className="h-6 w-6" />
                      </div>
                      <div className="text-xs text-slate-505 font-bold">Click to upload Image solution</div>
                      <p className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG (Max 10MB)</p>
                    </label>
                  </div>

                  {facultyImage && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 px-3 py-2 rounded-xl border border-emerald-100/35">
                        <span>Image uploaded successfully!</span>
                        <button type="button" onClick={() => setFacultyImage('')} className="text-rose-600 font-bold hover:underline">Remove</button>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-800 max-h-60 flex items-center justify-center">
                        <img src={facultyImage} alt="Uploaded Faculty solution" className="max-h-60 object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {facultyAnswerType === 'pdf' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-505 transition-colors duration-300">
                    <input
                      type="file"
                      id="faculty-pdf-file"
                      accept="application/pdf"
                      onChange={(e) => handleSingleFileUpload(e, 'pdf')}
                      className="hidden"
                    />
                    <label htmlFor="faculty-pdf-file" className="cursor-pointer space-y-2 block">
                      <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-xs text-slate-505 font-bold">Click to upload PDF solution</div>
                      <p className="text-[10px] text-slate-400">Supports PDF document (Max 20MB)</p>
                    </label>
                  </div>

                  {facultyPdf && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20 px-3 py-2 rounded-xl border border-emerald-100/35">
                        <span>PDF uploaded successfully!</span>
                        <button type="button" onClick={() => setFacultyPdf('')} className="text-rose-605 font-bold hover:underline">Remove</button>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 dark:bg-slate-900 dark:border-slate-805 h-60">
                        <iframe src={facultyPdf} className="w-full h-full border-0" title="Uploaded Faculty PDF solution" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {facultyAnswerType === 'multiple' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="faculty-multiple-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-350">Solution Text / Context Notes (Optional)</label>
                    <RichTextEditor value={facultyText} onChange={setFacultyText} />
                  </div>

                  <div className="border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors duration-300">
                    <input
                      type="file"
                      id="faculty-multiple-files"
                      multiple
                      onChange={handleMultipleFilesChange}
                      className="hidden"
                    />
                    <label htmlFor="faculty-multiple-files" className="cursor-pointer space-y-2 block">
                      <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center dark:bg-brand-950/20">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="text-xs text-slate-505 font-bold">Click to select and upload Multiple Files</div>
                      <p className="text-[10px] text-slate-400">Supports PNG, JPG, JPEG, PDF (Add sequentially)</p>
                    </label>
                  </div>

                  {facultyFiles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Uploaded Attachments ({facultyFiles.length})</span>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {facultyFiles.map((file, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 border border-slate-200 bg-slate-50 dark:bg-slate-900 dark:border-slate-808 rounded-xl text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[70%]" title={file.name}>
                              {file.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setFacultyFiles(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-rose-600 hover:underline font-bold text-[10px]"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          <div className="flex items-center space-x-2 pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input 
              id="publishAsCommunity"
              type="checkbox" 
              checked={publishAsCommunity} 
              onChange={(e) => setPublishAsCommunity(e.target.checked)} 
              className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-650 focus:ring-emerald-500"
            />
            <label htmlFor="publishAsCommunity" className="cursor-pointer">
              Publish as Official Community Solution (visible inside Community Solution Explorer)
            </label>
          </div>

          {previewMode && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-[10px] font-black uppercase text-brand-600 tracking-wider block">✓ Live Answer Preview</span>
              <div className="border border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-slate-50 dark:bg-slate-950/20">
                <div className="text-xs text-slate-707 dark:text-slate-200 leading-relaxed font-semibold">
                  {facultyAnswerType === 'text' && (
                    <div className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: facultyText }} />
                  )}
                  {facultyAnswerType === 'image' && (
                    <div className="space-y-2">
                      {facultyImage ? (
                        <img src={facultyImage} alt="Preview" className="max-h-60 object-contain rounded-xl" />
                      ) : (
                        <p className="text-slate-400 italic">No image uploaded yet.</p>
                      )}
                    </div>
                  )}
                  {facultyAnswerType === 'pdf' && (
                    <div className="space-y-2">
                      {facultyPdf ? (
                        <iframe src={facultyPdf} className="w-full h-60 border-0 rounded-xl" title="PDF preview" />
                      ) : (
                        <p className="text-slate-400 italic">No PDF uploaded yet.</p>
                      )}
                    </div>
                  )}
                  {facultyAnswerType === 'multiple' && (
                    <div className="space-y-3">
                      {facultyText && <div className="mb-2" dangerouslySetInnerHTML={{ __html: facultyText }} />}
                      {facultyFiles.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {facultyFiles.map((file, idx) => (
                            <div key={idx} className="p-2 border border-slate-200 rounded-lg bg-white dark:bg-slate-900 truncate">
                              📎 {file.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No files attached yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-100 dark:border-slate-805">
            <button
              type="button"
              disabled={publishLoading || draftSaving || ocrLoading}
              onClick={() => handleSaveFacultyResolution(false)}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-black shadow-premium transition-all disabled:opacity-50 flex items-center space-x-1.5"
            >
              {publishLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>Publish Official Solution</span>
            </button>

            <button
              type="button"
              disabled={publishLoading || draftSaving || ocrLoading}
              onClick={() => handleSaveFacultyResolution(true)}
              className="px-5 py-3 bg-slate-105 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5"
            >
              {draftSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode(prev => !prev)}
              className="px-5 py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-400 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-800 transition-all"
            >
              {previewMode ? 'Hide Preview' : 'Preview'}
            </button>

            <button
              type="button"
              onClick={() => {
                setFacultyText('');
                setFacultyImage('');
                setFacultyPdf('');
                setFacultyFiles([]);
                setPreviewMode(false);
              }}
              className="px-5 py-3 text-slate-500 hover:text-slate-800 hover:underline text-xs font-bold transition-all ml-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAnswerContent = (ans: any) => {
    if (!ans) return null;
    const format = ans.inputType || 'text';

    if (format === 'image' || format === 'img') {
      return (
        <div className="space-y-2">
          {ans.originalUploadUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 max-h-[400px] flex items-center justify-center">
              <img 
                src={ans.originalUploadUrl} 
                alt="Student Submission" 
                className="max-w-full max-h-[380px] object-contain"
              />
            </div>
          )}
          {ans.content && (
            <div className="bg-slate-50 dark:bg-[#0F172A] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-705 dark:text-slate-300 font-semibold leading-relaxed">
              <span className="text-[10px] font-bold text-slate-455 block mb-1 uppercase tracking-wider">Extracted Text Transcription</span>
              <p className="whitespace-pre-wrap">{ans.content}</p>
            </div>
          )}
        </div>
      );
    }

    if (format === 'pdf') {
      return (
        <div className="space-y-2">
          {ans.originalUploadUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-[500px]">
              <iframe 
                src={ans.originalUploadUrl} 
                className="w-full h-full border-none"
                title="Student Submission PDF"
              />
            </div>
          )}
          {ans.content && (
            <div className="bg-slate-50 dark:bg-[#0F172A] p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-705 dark:text-slate-300 font-semibold leading-relaxed">
              <span className="text-[10px] font-bold text-slate-455 block mb-1 uppercase tracking-wider">Extracted Text Transcription</span>
              <p className="whitespace-pre-wrap">{ans.content}</p>
            </div>
          )}
        </div>
      );
    }

    // Default to text format
    return (
      <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-slate-105 dark:border-slate-800 text-xs text-slate-705 dark:text-slate-300 font-semibold leading-relaxed whitespace-pre-wrap">
        {ans.content}
      </div>
    );
  };

  if (isTeacher && isEscalated && doubt.status !== 'teacher_solved') {
    return renderFacultyResolutionWorkspace();
  }

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
        {doubt.inputType === 'text' ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line mt-2">{doubt.description}</p>
        ) : (
          doubt.originalUploadUrl && (
            <div className="mt-4">
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
                      <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 flex items-center justify-center shadow-sm">
                        <img src={url} alt={`Student upload ${idx + 1}`} className="max-h-[400px] object-contain" />
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 h-[500px] w-full">
                  <iframe src={doubt.originalUploadUrl} className="w-full h-full border-none" title="Student pdf upload" />
                </div>
              )}
            </div>
          )
        )}

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

      {/* Render Official Faculty Solution Card if solved by teacher */}
      {renderOfficialSolutionCard()}

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

      {/* Main Grid: Community Solution Explorer (70%) and AI Learning Assistant (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* Left Columns (Community Solution Explorer - 70%) */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-6">
            <h3 className="text-xl font-bold text-slate-850 mb-4 pb-3 border-b border-slate-100 dark:text-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <BookOpen className="h-5.5 w-5.5 text-brand-600" />
              <span>📚 Community Solution Explorer</span>
            </h3>

            {!isUnlocked ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-50 dark:bg-[#0F172A]/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-850 text-center space-y-3">
                <Lock className="h-10 w-10 text-brand-500 animate-pulse" />
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Attempt this question first to unlock community solutions.</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                  Write and submit your solution, or request teacher permission, to view peer-verified answers and detailed AI grades.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Search and Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search Student..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 transition-all font-semibold"
                    />
                  </div>
                  
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {[
                      { id: 'all', label: 'All Solutions' },
                      { id: 'verified', label: 'Verified Only' },
                      { id: 'teacher_approved', label: 'Teacher Approved' },
                      { id: '100_percent', label: '100% Score' },
                      { id: '90_plus', label: '90%+' },
                      { id: 'most_helpful', label: 'Most Helpful' },
                      { id: 'latest', label: 'Latest' },
                      { id: 'text', label: 'Text' },
                      { id: 'image', label: 'Image' },
                      { id: 'pdf', label: 'PDF' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setActiveFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                          activeFilter === f.id
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-slate-105 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-305 dark:hover:bg-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Explorer Inner Layout */}
                {(() => {
                  const sorted = getSortedAnswers(answers);
                  const filtered = sorted.filter(ans => {
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const name = (ans.solverName || '').toLowerCase();
                      const anon = (ans.anonymousId || '').toLowerCase();
                      if (!name.includes(q) && !anon.includes(q)) return false;
                    }
                    if (activeFilter === 'verified') {
                      return ans.isTeacherVerified || ans.aiScore === 100 || ans.aiEvaluation?.correctness === 100;
                    }
                    if (activeFilter === 'teacher_approved') {
                      return ans.teacherApproved || ans.isTeacherVerified;
                    }
                    if (activeFilter === '100_percent') {
                      return ans.aiEvaluation?.correctness === 100 || ans.aiScore === 100;
                    }
                    if (activeFilter === '90_plus') {
                      const score = ans.aiScore ?? ans.aiEvaluation?.score ?? 0;
                      return score >= 90;
                    }
                    if (activeFilter === 'most_helpful') {
                      return ans.upvotes && ans.upvotes.length > 0;
                    }
                    if (activeFilter === 'latest') {
                      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
                      return new Date(ans.createdAt).getTime() >= oneDayAgo;
                    }
                    if (activeFilter === 'text') {
                      return ans.inputType === 'text' || !ans.inputType;
                    }
                    if (activeFilter === 'image') {
                      return ans.inputType === 'image';
                    }
                    if (activeFilter === 'pdf') {
                      return ans.inputType === 'pdf';
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-slate-50/50 dark:bg-[#0F172A]/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        <BookOpen className="h-10 w-10 text-slate-350" />
                        <div>
                          <p className="font-extrabold text-sm text-slate-700 dark:text-slate-200">No community solutions available yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Be the first student to submit a verified solution.</p>
                        </div>
                      </div>
                    );
                  }

                  const activeSelected = answers.find(a => a._id === selectedSolutionId) || filtered[0];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      
                      {/* Sidebar List */}
                      <div className="md:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {filtered.map((ans, idx) => {
                          const isSelected = selectedSolutionId === ans._id;
                          const isTeacherSolution = ans.teacherApproved || ans.isTeacherVerified;
                          const isAbsoluteBest = idx === 0 && !searchQuery && activeFilter === 'all';
                          
                          let medal = '';
                          if (isTeacherSolution) {
                            medal = '🏆';
                          } else {
                            const studentIdx = sorted.filter(a => !(a.teacherApproved || a.isTeacherVerified)).findIndex(a => a._id === ans._id);
                            if (studentIdx === 0) medal = '🥇';
                            else if (studentIdx === 1) medal = '🥈';
                            else if (studentIdx === 2) medal = '🥉';
                          }

                          const score = ans.aiScore ?? ans.aiEvaluation?.score ?? 0;
                          const xp = ans.pointsAwarded ?? 0;
                          const upvotesCount = ans.upvotes?.length ?? 0;

                          return (
                            <div
                              key={ans._id}
                              onClick={() => {
                                setIsComparing(false);
                                setSelectedSolutionId(ans._id);
                              }}
                              className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                                isAbsoluteBest
                                  ? isSelected
                                    ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                                    : 'border-amber-400/80 bg-white hover:bg-amber-50/10 dark:bg-[#1E293B] dark:border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                  : isSelected
                                  ? 'border-brand-600 bg-brand-50/40 dark:bg-brand-950/15 dark:border-brand-550'
                                  : 'border-slate-100 bg-white hover:bg-slate-50 dark:bg-[#1E293B] dark:border-slate-800 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span className="text-base flex-shrink-0">{medal}</span>
                                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                                    {isTeacherSolution ? 'Teacher Solution' : ans.solverName}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  score >= 85 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                  score >= 50 ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400' :
                                  'bg-rose-100 text-rose-700 dark:bg-rose-955/20'
                                }`}>
                                  {score}%
                                </span>
                              </div>

                              <div className="flex items-center flex-wrap gap-2.5 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>{new Date(ans.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="capitalize">{ans.inputType || 'Text'}</span>
                                <span>•</span>
                                <span className="text-brand-600 dark:text-brand-400 font-black">+{xp} XP</span>
                                {upvotesCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center space-x-0.5 text-amber-600 dark:text-amber-500 font-black normal-case">
                                      <ThumbsUp className="h-3 w-3 fill-amber-500 text-white" />
                                      <span>{upvotesCount}</span>
                                    </span>
                                  </>
                                )}
                              </div>

                              {isAbsoluteBest && (
                                <div className="mt-2 text-[9px] font-black uppercase tracking-wider text-amber-650 dark:text-amber-500 bg-amber-100/40 dark:bg-amber-955/20 px-2 py-0.5 rounded-lg inline-block">
                                  {isTeacherSolution ? '🏆 Teacher Recommended' : '✨ Best Community Solution'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Right Selected Solution View / Compare Workspace */}
                      <div className="md:col-span-7 border-l border-slate-100 dark:border-slate-800 pl-6 space-y-6">
                        
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isComparing) {
                                setCompareAId(selectedSolutionId || filtered[0]?._id || '');
                                setCompareBId(filtered[1]?._id || filtered[0]?._id || '');
                              }
                              setIsComparing(prev => !prev);
                            }}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-205 text-slate-705 rounded-xl text-xs font-black transition-all dark:bg-slate-800 dark:text-slate-200 flex items-center space-x-1.5 active:scale-95 border border-slate-200 dark:border-slate-700"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>{isComparing ? '← Back to Explorer' : 'Compare Solutions'}</span>
                          </button>
                          
                          {!isComparing && (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Single View
                            </span>
                          )}
                        </div>

                        {isComparing ? (
                          /* COMPARISON WORKSPACE */
                          <div className={`space-y-6 transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                            
                            {/* Comparison selectors */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solution A</label>
                                <select
                                  value={compareAId}
                                  onChange={(e) => setCompareAId(e.target.value)}
                                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-slate-700 font-bold focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-350"
                                >
                                  {answers.map(ans => (
                                    <option key={`compA-${ans._id}`} value={ans._id}>{ans.solverName} ({ans.aiScore ?? ans.aiEvaluation?.score ?? 0}%)</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Solution B</label>
                                <select
                                  value={compareBId}
                                  onChange={(e) => setCompareBId(e.target.value)}
                                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-slate-700 font-bold focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-350"
                                >
                                  {answers.map(ans => (
                                    <option key={`compB-${ans._id}`} value={ans._id}>{ans.solverName} ({ans.aiScore ?? ans.aiEvaluation?.score ?? 0}%)</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Side by side comparison table */}
                            {(() => {
                              const ansA = answers.find(a => a._id === compareAId) || activeSelected;
                              const ansB = answers.find(a => a._id === compareBId) || answers.find(a => a._id !== compareAId) || activeSelected;

                              if (!ansA || !ansB) return null;

                              return (
                                <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800 text-xs leading-relaxed">
                                  
                                  {/* Correctness */}
                                  <div className="grid grid-cols-2 gap-6 pt-3">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Correctness (A)</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{ansA.aiScore ?? ansA.aiEvaluation?.score ?? 0}%</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                          ansA.isTeacherVerified ? 'bg-emerald-105 text-emerald-700' : 'bg-brand-50 text-brand-655'
                                        }`}>
                                          {ansA.isTeacherVerified ? 'Verified' : 'Peer'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Correctness (B)</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-slate-800 dark:text-white">{ansB.aiScore ?? ansB.aiEvaluation?.score ?? 0}%</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                          ansB.isTeacherVerified ? 'bg-emerald-105 text-emerald-700' : 'bg-brand-50 text-brand-655'
                                        }`}>
                                          {ansB.isTeacherVerified ? 'Verified' : 'Peer'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Approach */}
                                  <div className="grid grid-cols-2 gap-6 pt-3">
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Approach (A)</span>
                                      {renderAnswerContent(ansA)}
                                    </div>
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Approach (B)</span>
                                      {renderAnswerContent(ansB)}
                                    </div>
                                  </div>

                                  {/* Teacher Feedback */}
                                  <div className="grid grid-cols-2 gap-6 pt-3">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Teacher Feedback (A)</span>
                                      <p className="font-semibold text-slate-600 dark:text-slate-400 italic">
                                        {ansA.teacherNote || ansA.teacherApproved ? (ansA.teacherNote || '✓ Approved by Faculty') : 'No teacher feedback.'}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Teacher Feedback (B)</span>
                                      <p className="font-semibold text-slate-600 dark:text-slate-400 italic">
                                        {ansB.teacherNote || ansB.teacherApproved ? (ansB.teacherNote || '✓ Approved by Faculty') : 'No teacher feedback.'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* AI Feedback */}
                                  <div className="grid grid-cols-2 gap-6 pt-3">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">AI Feedback (A)</span>
                                      <p className="font-semibold text-slate-600 dark:text-slate-400">
                                        {ansA.aiEvaluation?.feedback || 'No AI feedback available.'}
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">AI Feedback (B)</span>
                                      <p className="font-semibold text-slate-600 dark:text-slate-400">
                                        {ansB.aiEvaluation?.feedback || 'No AI feedback available.'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Submission Date */}
                                  <div className="grid grid-cols-2 gap-6 pt-3 pb-3">
                                    <div>
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Submission Date (A)</span>
                                      <p className="font-semibold text-slate-605 mt-1">{new Date(ansA.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-black uppercase text-slate-400 block">Submission Date (B)</span>
                                      <p className="font-semibold text-slate-605 mt-1">{new Date(ansB.createdAt).toLocaleString()}</p>
                                    </div>
                                  </div>

                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          /* SINGLE SOLUTION WORKSPACE */
                          activeSelected && (
                            <div className={`space-y-6 transition-opacity duration-200 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                              
                              {/* Metadata card */}
                              <div className="flex justify-between items-start flex-wrap gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center space-x-3">
                                  <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-655 flex items-center justify-center font-bold text-sm">
                                    {(activeSelected.solverName || 'S').charAt(0)}
                                  </div>
                                  <div>
                                    <h4 className="font-black text-sm text-slate-850 dark:text-slate-100">
                                      {activeSelected.solverName}
                                    </h4>
                                    <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">
                                      Submitted on {new Date(activeSelected.createdAt).toLocaleDateString()} {new Date(activeSelected.createdAt).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                  {activeSelected.isTeacherVerified && (
                                    <span className="flex items-center space-x-1 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[10px] font-black uppercase dark:bg-emerald-950/20 dark:text-emerald-400">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      <span>Verified Solution</span>
                                    </span>
                                  )}
                                  {activeSelected.isAccepted && (
                                    <span className="flex items-center space-x-1 rounded-full bg-teal-100 text-teal-800 px-3 py-1 text-[10px] font-black uppercase dark:bg-teal-950/20 dark:text-teal-400">
                                      <span>Asker Accepted</span>
                                    </span>
                                  )}
                                  <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase dark:bg-brand-950/20 dark:text-brand-400">
                                    +{activeSelected.pointsAwarded ?? 0} XP
                                  </span>
                                </div>
                              </div>

                              {/* Upvoting and score card */}
                              <div className="flex justify-between items-center bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/40 flex-wrap gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full border-4 border-brand-500 border-t-transparent flex items-center justify-center font-black text-brand-600 dark:text-brand-400 text-sm">
                                    {activeSelected.aiScore ?? activeSelected.aiEvaluation?.score ?? 0}%
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">AI Correctness Score</span>
                                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350">
                                      Verdict: {activeSelected.aiEvaluation?.verdict?.replace('_', ' ') || 'Correct'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleHelpful(activeSelected._id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border ${
                                      activeSelected.upvotes?.includes(user?.id)
                                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                        : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                    } active:scale-95`}
                                  >
                                    <ThumbsUp className={`h-4 w-4 ${activeSelected.upvotes?.includes(user?.id) ? 'fill-white text-amber-500' : 'text-slate-400'}`} />
                                    <span>
                                      {activeSelected.upvotes?.includes(user?.id) ? 'Marked Helpful' : 'Helpful?'} ({activeSelected.upvotes?.length ?? 0})
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Uploaded answer content - exactly as submitted */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Answer Content</span>
                                {renderAnswerContent(activeSelected)}
                              </div>

                              {/* AI Critique feedback */}
                              {activeSelected.aiEvaluation && (
                                <div className="bg-slate-55/30 p-5 rounded-2xl border border-slate-100 dark:bg-[#0F172A]/50 dark:border-slate-800 space-y-4 text-xs">
                                  <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-205 font-extrabold border-b border-slate-100 dark:border-slate-800/40 pb-2">
                                    <Brain className="h-4.5 w-4.5 text-brand-500 animate-float" />
                                    <span>AI Grading Breakdown</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    {['correctness', 'clarity', 'completeness', 'logicalThinking'].map((dim) => {
                                      const val = activeSelected.aiEvaluation[dim] ?? 50;
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

                                  <p className="text-xs text-slate-655 dark:text-slate-400 leading-relaxed italic pt-2">
                                    <strong className="not-italic text-slate-750 dark:text-slate-300 font-bold block mb-1">Feedback Summary:</strong>
                                    "{activeSelected.aiEvaluation.feedback}"
                                  </p>

                                  {activeSelected.aiEvaluation.bestConceptsCovered && activeSelected.aiEvaluation.bestConceptsCovered.length > 0 && (
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/30">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1.5">✓ Concept Mastery</span>
                                      <div className="flex flex-wrap gap-1">
                                        {activeSelected.aiEvaluation.bestConceptsCovered.map((c: string, i: number) => (
                                          <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/30">
                                            {c}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Student Workspace for own solution attempts */}
                              {activeSelected.solverId?._id?.toString() === user?.id && (
                                <div className="p-5 bg-brand-50/20 border border-brand-100 rounded-2xl dark:bg-brand-950/10 dark:border-brand-900/20 space-y-4">
                                  <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-brand-100/30">
                                    <div>
                                      <h4 className="text-sm font-black text-slate-855 dark:text-white">Your AI Assisted Workspace</h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Manage and improve your attempts</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditMode('text');
                                        setAnswerContent(activeSelected.content || '');
                                        setInputType(activeSelected.inputType || 'text');
                                        setOriginalUploadUrl(activeSelected.originalUploadUrl || '');
                                      }}
                                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all shadow-premium"
                                    >
                                      Improve Answer
                                    </button>
                                  </div>

                                  {activeSelected.versions && activeSelected.versions.length > 0 && (
                                    <div className="space-y-2">
                                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-wider block">Attempt History</span>
                                      <div className="flex flex-wrap gap-2">
                                        {activeSelected.versions.map((ver: any, index: number) => {
                                          const isSel = activeVersionIndex === index;
                                          return (
                                            <button
                                              key={index}
                                              type="button"
                                              onClick={() => setActiveVersionIndex(index)}
                                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                                isSel
                                                  ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                                              }`}
                                            >
                                              Attempt {index + 1} ({ver.aiScore || 0}%)
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Accept/Approve Actions */}
                              <div className="flex flex-wrap gap-2.5 pt-2">
                                {isDoubtOpen && isAsker && !activeSelected.isAccepted && (
                                  <button
                                    onClick={() => handleAcceptAnswer(activeSelected._id)}
                                    className="rounded-xl border border-teal-200 hover:border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-600 transition-all dark:bg-teal-955/20"
                                  >
                                    Accept Solution
                                  </button>
                                )}
                                {isTeacher && (
                                  <div className="flex gap-2.5 w-full">
                                    {!activeSelected.teacherApproved ? (
                                      <button
                                        onClick={() => handleTeacherDecision(activeSelected._id, 'approve')}
                                        className="rounded-xl border border-emerald-250 hover:border-emerald-350 bg-emerald-50 text-emerald-600 px-4 py-2.5 text-xs font-bold transition-all dark:bg-emerald-950/20 dark:text-emerald-400"
                                      >
                                        Approve Solution
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleTeacherDecision(activeSelected._id, 'reject')}
                                        className="rounded-xl border border-rose-255 hover:border-rose-350 bg-rose-50 text-rose-600 px-4 py-2.5 text-xs font-bold transition-all dark:bg-rose-955/20 dark:text-rose-455"
                                      >
                                        Reject & Unpublish
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>
                          )
                        )}

                      </div>

                    </div>
                  );
                })()}

              </div>
            )}
          </div>

          {/* Form Workspace for Student Solution Contribution */}
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
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-805 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors duration-300">
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
                  <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-455 text-xs font-bold animate-pulse">
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
                    <RefreshCw className="h-3 w-3" />
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
                    <p className="text-xs font-semibold text-slate-655 dark:text-slate-350 italic">
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

        {/* Right Columns (AI Learning Assistant & Teacher Settings - 30% width on Desktop, sticky) */}
        <div className="col-span-1 lg:col-span-3 space-y-6 lg:sticky lg:top-6 self-start">
          


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
