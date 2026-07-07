import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  BookOpen, 
  Award, 
  Brain, 
  Lightbulb, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  X,
  Users,
  FolderOpen,
  MessageSquare,
  BarChart3,
  Send,
  ThumbsUp,
  Plus,
  FileText,
  Video,
  Image,
  Presentation,
  HelpCircle,
  Check
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface Question {
  questionText: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  addedBy: 'teacher' | 'ai';
  createdAt: string;
}

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  teacher: {
    _id: string;
    name: string;
  };
  questions: Question[];
}

export const StudentFocusRoomDetail: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  
  const [room, setRoom] = useState<FocusRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomXpEarned, setRoomXpEarned] = useState(0);
  const [roomProgress, setRoomProgress] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<'questions' | 'members' | 'resources' | 'discussions' | 'analytics' | 'assistant'>('questions');

  // Tabbed components states
  const [members, setMembers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  
  // Discussion forms states
  const [newDiscussionContent, setNewDiscussionContent] = useState('');
  const [isDoubtDiscussion, setIsDoubtDiscussion] = useState(false);
  const [discussionReplyParentId, setDiscussionReplyParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai', text: string }>>([
    { sender: 'ai', text: "Hello! I'm your AI Learning Assistant. Ask me anything about this Focus Room's topic!" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Resources upload form states
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState<'PDF' | 'PPT' | 'Image' | 'Video' | 'Notes'>('PDF');
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');

  // Question Answer states
  const [activeAnswerIndex, setActiveAnswerIndex] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  // AI Evaluation feedback
  const [evaluationResult, setEvaluationResult] = useState<any | null>(null);
  const [showEvalModal, setShowEvalModal] = useState(false);

  // Hints state (keyed by question index)
  const [questionHints, setQuestionHints] = useState<Record<number, any[]>>({});
  const [hintLoadingIndex, setHintLoadingIndex] = useState<number | null>(null);

  // Answer state (keyed by question index, to show already answered correctly)
  const [correctlyAnsweredIndices, setCorrectlyAnsweredIndices] = useState<number[]>([]);

  // Load discussion thread for selected resource
  const fetchDiscussionThread = async (resId: string) => {
    if (!resId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/focus-rooms/${roomId}/resources/${resId}/discussion`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiscussions(response.data || []);
    } catch (err) {
      console.error('Failed to fetch discussion thread:', err);
    }
  };

  // Load analytics
  const fetchRoomAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/focus-rooms/${roomId}/analytics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Failed to load room analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchRoomDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-room/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoom(response.data.room);
      setMembers(response.data.members || []);
      setResources(response.data.resources || []);
      
      // Look for current student's progress in the members array
      const tokenPayload = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const myId = tokenPayload?.userId;
      const myMember = response.data.members.find((m: any) => m.userId && m.userId._id === myId);

      if (myMember) {
        setRoomXpEarned(myMember.xpEarned || 0);
        setRoomProgress(myMember.progress || 0);
      }

      // Automatically select first resource for discussion if available and none selected
      if (response.data.resources && response.data.resources.length > 0 && !selectedResourceId) {
        setSelectedResourceId(response.data.resources[0]._id);
        fetchDiscussionThread(response.data.resources[0]._id);
      }
    } catch (err) {
      console.error('Failed to load focus room details:', err);
      setError('Could not retrieve focus room details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomDetails();
  }, [roomId]);

  // Tab changes hook
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchRoomAnalytics();
    }
  }, [activeTab]);

  // Upvote discussion message
  const handleUpvoteDiscussion = async (msgId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/resources/${selectedResourceId}/discussion/${msgId}/upvote`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDiscussionThread(selectedResourceId);
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  // Post discussion message
  const handlePostDiscussionMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscussionContent.trim() || !selectedResourceId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/resources/${selectedResourceId}/discussion`,
        {
          content: newDiscussionContent,
          isDoubt: isDoubtDiscussion
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewDiscussionContent('');
      setIsDoubtDiscussion(false);
      fetchDiscussionThread(selectedResourceId);
      fetchRoomDetails(); // refresh XP/badges
    } catch (err) {
      console.error('Failed to post discussion message:', err);
      alert('Could not post comment.');
    }
  };

  // Post reply to message
  const handlePostReply = async (parentMsgId: string) => {
    if (!replyText.trim() || !selectedResourceId) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/resources/${selectedResourceId}/discussion`,
        {
          content: replyText,
          parentId: parentMsgId,
          isDoubt: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyText('');
      setDiscussionReplyParentId(null);
      fetchDiscussionThread(selectedResourceId);
    } catch (err) {
      console.error('Failed to post reply:', err);
      alert('Could not post reply.');
    }
  };

  // Upload Resource
  const handleUploadResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/resources`,
        {
          title: uploadTitle,
          description: uploadDesc,
          fileType: uploadType,
          fileUrl: uploadUrl || 'http://localhost:5000/mock/slides.pdf'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUploadTitle('');
      setUploadDesc('');
      setUploadUrl('');
      setShowUploadForm(false);
      alert('Resource uploaded successfully!');
      fetchRoomDetails();
    } catch (err) {
      console.error('Failed to upload resource:', err);
      alert('Could not upload resource.');
    } finally {
      setUploading(false);
    }
  };

  // Mark Resource Complete
  const handleCompleteResource = async (resId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/resources/${resId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Resource marked as complete! XP awarded.');
      fetchRoomDetails();
    } catch (err) {
      console.error('Failed to complete resource:', err);
      alert('Could not update completion status.');
    }
  };

  // Submit AI Assistant Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/chat`,
        {
          query: userMsg,
          topic: room?.topic || 'OS',
          subject: room?.subject || 'Operating Systems'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChatMessages(prev => [...prev, { sender: 'ai', text: response.data.reply }]);
    } catch (err) {
      console.error('AI assistant chat error:', err);
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I am having trouble responding right now. Please check focus room discussions!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRequestHint = async (qText: string, qIdx: number) => {
    const currentHints = questionHints[qIdx] || [];
    if (currentHints.length >= 3) {
      alert('Maximum of 3 hints reached for this question.');
      return;
    }

    setHintLoadingIndex(qIdx);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/ai/generate-hint`,
        {
          doubtText: qText,
          level: currentHints.length + 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newHint = {
        hintContent: response.data.hintContent || response.data.hint,
        encouragement: response.data.encouragement
      };

      setQuestionHints(prev => ({
        ...prev,
        [qIdx]: [...currentHints, newHint]
      }));
    } catch (err) {
      console.error('Failed to get hint:', err);
      alert('Could not retrieve AI Coach hint.');
    } finally {
      setHintLoadingIndex(null);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent, qIdx: number) => {
    e.preventDefault();
    if (!answerText.trim() || !room) return;

    setSubmittingAnswer(true);
    setEvaluationResult(null);
    try {
      const token = localStorage.getItem('token');
      const hintsUsedCount = (questionHints[qIdx] || []).length;
      
      const response = await axios.post(
        `${API_URL}/focus-room/${roomId}/questions/${qIdx}/answer`,
        { answerText, hintsUsedCount },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEvaluationResult(response.data.evaluation);
      setShowEvalModal(true);

      if (response.data.evaluation.verdict === 'correct') {
        setCorrectlyAnsweredIndices(prev => [...prev, qIdx]);
        setAnswerText('');
        setActiveAnswerIndex(null);
        await fetchRoomDetails(); // Refresh room XP and progress indicators
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert('Could not evaluate answer. Please try again.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Entering focus room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold dark:bg-rose-955/20 dark:text-rose-455">
          {error || 'Focus Room not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Back button and header */}
      <div className="flex items-center space-x-3">
        <Link 
          to="/student/focus-rooms" 
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 text-slate-555 hover:text-slate-700 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-405 dark:hover:text-slate-200 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">{room.name}</h2>
          <p className="text-slate-400 text-xs font-semibold">Teacher in Charge: {room.teacher?.name || 'Faculty Mentor'}</p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1.5 w-full md:w-2/3">
          <div className="flex justify-between text-xs font-bold text-slate-450 uppercase">
            <span>Overall Room Progress</span>
            <span className="text-brand-605 dark:text-brand-405">{roomProgress}% Completed</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-400 to-brand-500 rounded-full transition-all duration-500" 
              style={{ width: `${roomProgress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-amber-50/50 dark:bg-amber-950/20 px-5 py-3 rounded-2xl border border-amber-100/30">
          <Award className="h-6 w-6 text-amber-500" />
          <div>
            <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Room XP Earned</p>
            <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{roomXpEarned} XP</h4>
          </div>
        </div>
      </div>

      {/* Tabs Selector Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'questions'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Practice Tasks</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'members'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Members ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('resources')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'resources'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>Resources ({resources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('discussions')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'discussions'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Discussions</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'analytics'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'assistant'
              ? 'bg-purple-650 text-white shadow-sm'
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850'
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>AI Learning Assistant</span>
        </button>
      </div>

      {/* Tab Content Rendering */}
      {activeTab === 'questions' && (
        <div className="space-y-4 animate-fadeIn">
          <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
            <BookOpen className="h-4.5 w-4.5 text-brand-605" />
            <span>Assigned Practice Pool ({room.questions.length} questions)</span>
          </h3>

          {room.questions.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
              <BookOpen className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase">No questions added yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {room.questions.map((q, idx) => {
                const isAnswered = correctlyAnsweredIndices.includes(idx);
                const isActive = activeAnswerIndex === idx;
                const hints = questionHints[idx] || [];

                return (
                  <div 
                    key={idx}
                    className={`bg-white dark:bg-[#1E293B] border rounded-2xl p-6 transition-all shadow-sm ${
                      isAnswered 
                        ? 'border-emerald-250 bg-emerald-50/5 dark:border-emerald-955/5 dark:border-emerald-950/20' 
                        : 'border-slate-100 dark:border-slate-805'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Question #{idx + 1}</span>
                        <h4 className="text-slate-850 dark:text-slate-200 font-extrabold text-sm leading-relaxed">{q.questionText}</h4>
                      </div>
                      
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                        q.difficulty === 'easy' ? 'bg-emerald-55 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' :
                        q.difficulty === 'medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-955/10 dark:text-rose-405'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Hints container if requested */}
                    {hints.length > 0 && (
                      <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-2.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                          <Brain className="h-3.5 w-3.5 text-indigo-500" />
                          <span>AI Clue Hints Revealed</span>
                        </p>
                        
                        <div className="space-y-2 divide-y divide-slate-100/50 dark:divide-slate-800">
                          {hints.map((h, i) => (
                            <div key={i} className="pt-2 first:pt-0">
                              <p className="text-xs text-slate-655 dark:text-slate-350 font-bold leading-relaxed">{h.hintContent}</p>
                              {h.encouragement && (
                                <span className="text-[10px] text-amber-555 font-extrabold block mt-0.5">💡 {h.encouragement}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/40 flex flex-wrap items-center gap-3">
                      {isAnswered ? (
                        <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-600 dark:text-emerald-405">
                          <CheckCircle className="h-4.5 w-4.5" />
                          <span>Question Solved Successfully!</span>
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setActiveAnswerIndex(isActive ? null : idx);
                              setAnswerText('');
                            }}
                            className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-4 py-2.5 transition-all shadow-sm"
                          >
                            {isActive ? 'Cancel' : 'Answer Question'}
                          </button>

                          <button
                            onClick={() => handleRequestHint(q.questionText, idx)}
                            disabled={hintLoadingIndex === idx || hints.length >= 3}
                            className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-50 hover:bg-slate-105 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 px-4 py-2.5 text-xs font-extrabold"
                          >
                            {hintLoadingIndex === idx ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Lightbulb className="h-4 w-4 text-amber-500 fill-amber-350" />
                                <span>Get Hint {hints.length > 0 ? `#${hints.length + 1}` : ''}</span>
                              </>
                            )}
                          </button>

                          {hints.length >= 3 && (
                            <span className="text-[10px] text-slate-400 font-semibold">Max hints used.</span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Answer submission text box */}
                    {isActive && !isAnswered && (
                      <form onSubmit={(e) => handleSubmitAnswer(e, idx)} className="mt-5 space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase">Write your Answer</label>
                          <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                            placeholder="Explain your approach, steps, and provide code or formula proofs..."
                            rows={4}
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingAnswer || !answerText.trim()}
                          className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-5 py-3 shadow-md transition-all"
                        >
                          {submittingAnswer ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>AI Evaluating...</span>
                            </>
                          ) : (
                            <>
                              <Brain className="h-4 w-4" />
                              <span>Submit Answer & Evaluate</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members */}
      {activeTab === 'members' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="h-4.5 w-4.5 text-brand-605" />
              <span>Room Members ({members.length})</span>
            </h3>
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search students..."
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-750 dark:text-slate-205 w-full sm:w-64 shadow-sm"
            />
          </div>

          {members.filter(m => m.userId && (
            m.userId.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
            m.userId.rollNumber?.toLowerCase().includes(memberSearch.toLowerCase())
          )).length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
              <Users className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase">No matching members found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.filter(m => m.userId && (
                m.userId.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                m.userId.rollNumber?.toLowerCase().includes(memberSearch.toLowerCase())
              )).map((m, idx) => (
                <div key={idx} className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{m.userId.name}</h4>
                    <p className="text-[10px] text-slate-450 font-bold">Roll: {m.userId.rollNumber || 'N/A'} | Section: {m.userId.section || 'N/A'}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded font-black">Level {m.userId.level || 1}</span>
                      <span className="text-[10px] bg-slate-50 text-slate-555 dark:bg-slate-900 dark:text-slate-400 px-2 py-0.5 rounded font-black">{m.xpEarned || 0} Room XP</span>
                    </div>
                  </div>
                  <Link
                    to={`/student/profile`}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-605 font-bold text-xs px-3.5 py-2 transition-all"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
              <FolderOpen className="h-4.5 w-4.5 text-brand-605" />
              <span>Study Resources ({resources.length})</span>
            </h3>
            
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-4 py-2.5 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Study Notes</span>
            </button>
          </div>

          {showUploadForm && (
            <form onSubmit={handleUploadResourceSubmit} className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Upload Study Resource</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-405 uppercase">Resource Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                    placeholder="e.g. Deadlock Prevention Slides"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-405 uppercase">Resource Type</label>
                  <select
                    value={uploadType}
                    onChange={(e: any) => setUploadType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-705 dark:text-slate-205"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="PPT">PowerPoint Presentation</option>
                    <option value="Image">Image / Diagram</option>
                    <option value="Video">Video Tutorial</option>
                    <option value="Notes">Lecture Notes / Textbook</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-455 uppercase">File URL (Optional)</label>
                <input
                  type="url"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-455 uppercase">Brief Description</label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Explain what concepts are covered in this note..."
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-850 px-4 py-2 text-xs font-bold text-slate-555 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-5 py-2"
                >
                  {uploading ? 'Uploading...' : 'Publish Resource'}
                </button>
              </div>
            </form>
          )}

          {resources.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
              <FolderOpen className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase">No study resources uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map((res, idx) => {
                const isPdf = res.fileType === 'PDF';
                const isPpt = res.fileType === 'PPT';
                const isImage = res.fileType === 'Image';
                const isVideo = res.fileType === 'Video';
                
                return (
                  <div key={idx} className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-brand-300 dark:hover:border-brand-700 transition-all">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-2xl ${
                        isPdf ? 'bg-rose-50 text-rose-500 dark:bg-rose-955/20' :
                        isPpt ? 'bg-amber-50 text-amber-500 dark:bg-amber-955/20' :
                        isImage ? 'bg-blue-50 text-blue-500 dark:bg-blue-955/20' :
                        isVideo ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-955/20' :
                        'bg-teal-50 text-teal-500 dark:bg-teal-955/20'
                      }`}>
                        {isVideo ? <Video className="h-6 w-6" /> :
                         isImage ? <Image className="h-6 w-6" /> :
                         isPpt ? <Presentation className="h-6 w-6" /> :
                         <FileText className="h-6 w-6" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-sm text-slate-855 dark:text-slate-100">{res.title}</h4>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-450 uppercase font-black">{res.fileType}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">{res.description || 'No description provided.'}</p>
                        <p className="text-[10px] text-slate-400 font-bold">Uploaded by: {res.uploaderId?.name || 'Mentor'} ({res.uploaderRole || 'teacher'})</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                      <button
                        onClick={() => {
                          setSelectedResourceId(res._id);
                          fetchDiscussionThread(res._id);
                          setActiveTab('discussions');
                        }}
                        className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-slate-655 bg-slate-50 hover:bg-slate-100 rounded-xl dark:bg-slate-850 dark:text-slate-355 dark:hover:bg-slate-800"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Discuss</span>
                      </button>

                      {res.fileUrl && (
                        <a
                          href={res.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-slate-655 bg-slate-50 hover:bg-slate-100 rounded-xl dark:bg-slate-850 dark:text-slate-355 dark:hover:bg-slate-800"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Open file</span>
                        </a>
                      )}

                      <button
                        onClick={() => handleCompleteResource(res._id)}
                        className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl dark:bg-emerald-955/20 dark:text-emerald-400 dark:hover:bg-emerald-950/45"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Complete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Discussions */}
      {activeTab === 'discussions' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
                <MessageSquare className="h-4.5 w-4.5 text-brand-605" />
                <span>Threaded Doubt Discussions</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Select a resource to view its active doubt thread.</p>
            </div>

            <select
              value={selectedResourceId}
              onChange={(e) => {
                setSelectedResourceId(e.target.value);
                fetchDiscussionThread(e.target.value);
              }}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205 shadow-sm max-w-xs"
            >
              <option value="">-- Choose Resource --</option>
              {resources.map((res, i) => (
                <option key={i} value={res._id}>{res.title}</option>
              ))}
            </select>
          </div>

          {!selectedResourceId ? (
            <div className="text-center p-12 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
              <MessageSquare className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase">Please select a resource to begin discussion.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Post new message form */}
              <form onSubmit={handlePostDiscussionMessage} className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Ask a Doubt or Leave a Comment</label>
                  <textarea
                    value={newDiscussionContent}
                    onChange={(e) => setNewDiscussionContent(e.target.value)}
                    required
                    placeholder="Ask a technical question about this resource, or provide insights..."
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <label className="inline-flex items-center space-x-2 text-xs font-bold text-slate-555 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDoubtDiscussion}
                      onChange={(e) => setIsDoubtDiscussion(e.target.checked)}
                      className="rounded border-slate-305 text-brand-600 focus:ring-brand-500"
                    />
                    <span>Flag as doubt query (Notifies faculty mentor)</span>
                  </label>

                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-5 py-2.5 transition-all shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>

              {/* Messages feed */}
              {discussions.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
                  <MessageSquare className="h-8 w-8 text-slate-205 dark:text-slate-700 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase">No comments posted in this thread yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {discussions.filter(d => !d.parentId).map((msg, idx) => {
                    const replies = discussions.filter(reply => reply.parentId === msg._id);
                    const tokenPayload = localStorage.getItem('token') ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])) : null;
                    const myId = tokenPayload?.userId;
                    const isUpvoted = msg.upvotes?.includes(myId);

                    return (
                      <div key={idx} className="bg-white dark:bg-[#1E293B] border border-slate-105 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{msg.userId?.name || 'Anonymous User'}</span>
                            <span className={`ml-2 text-[9px] px-2 py-0.5 rounded uppercase font-black ${
                              msg.userRole === 'teacher' ? 'bg-purple-55 text-purple-600 dark:bg-purple-955/20 dark:text-purple-400' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {msg.userRole}
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(msg.createdAt).toLocaleString()}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {msg.isDoubt && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                msg.status === 'open' ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-955/20 dark:text-rose-455' :
                                'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-955/20 dark:text-emerald-455'
                              }`}>
                                Doubt: {msg.status || 'open'}
                              </span>
                            )}

                            <button
                              onClick={() => handleUpvoteDiscussion(msg._id)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                isUpvoted
                                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                                  : 'bg-slate-50 border-slate-200 text-slate-555 hover:bg-slate-100'
                              }`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                              <span>{msg.upvotes?.length || 0} Upvotes</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-655 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                        {/* Reply inputs */}
                        <div className="flex items-center gap-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                          <button
                            onClick={() => {
                              setDiscussionReplyParentId(discussionReplyParentId === msg._id ? null : msg._id);
                              setReplyText('');
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600"
                          >
                            Reply
                          </button>
                        </div>

                        {discussionReplyParentId === msg._id && (
                          <div className="pl-4 border-l-2 border-slate-150 mt-3 space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setDiscussionReplyParentId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-450 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handlePostReply(msg._id)}
                                className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-[10px] font-extrabold"
                              >
                                Post Reply
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Replies render list */}
                        {replies.length > 0 && (
                          <div className="pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-4 mt-4">
                            {replies.map((rep, rIdx) => (
                              <div key={rIdx} className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{rep.userId?.name || 'Anonymous User'}</span>
                                  <span className="text-[9px] bg-slate-105 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-450 font-bold">{rep.userRole}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">{new Date(rep.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-555 dark:text-slate-355 leading-relaxed font-semibold">{rep.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          <h3 className="text-sm font-black text-slate-855 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
            <BarChart3 className="h-4.5 w-4.5 text-brand-605" />
            <span>Room Engagement & Analytics</span>
          </h3>

          {analyticsLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
          ) : !analyticsData ? (
            <div className="text-center p-12 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl">
              <BarChart3 className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-bold uppercase">No analytics computed yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Average Room Progress */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Completion Rate</span>
                <div className="mt-4">
                  <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">
                    {analyticsData.roomAnalytics?.averageRoomProgress || 0}%
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Average student progress</p>
                </div>
              </div>

              {/* Card 2: Student Participation */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Resources Shared</span>
                <div className="mt-4">
                  <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">
                    {analyticsData.roomAnalytics?.resourcesUploaded || 0}
                  </h3>
                  <p className="text-[9px] text-slate-405 font-bold mt-1">
                    Student uploads: {analyticsData.roomAnalytics?.studentUploads || 0}
                  </p>
                </div>
              </div>

              {/* Card 3: AI Learning Score */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Score Rating</span>
                <div className="mt-4">
                  <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400">
                    {analyticsData.roomAnalytics?.averageScore || 0}/100
                  </h3>
                  <p className="text-[9px] text-slate-405 font-bold mt-1">Average correctness metric</p>
                </div>
              </div>

              {/* Card 4: Questions Solved */}
              <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Solved doubts</span>
                <div className="mt-4">
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {analyticsData.roomAnalytics?.questionsSolved || 0}
                  </h3>
                  <p className="text-[9px] text-slate-405 font-bold mt-1">
                    Pending doubts: {analyticsData.roomAnalytics?.questionsPending || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: AI Learning Assistant */}
      {activeTab === 'assistant' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-slate-50 dark:border-slate-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-855 dark:text-slate-105 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="h-4.5 w-4.5 text-purple-650 animate-pulse" />
                <span>AI Learning Assistant</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">Learn more about "{room.topic}" inside the "{room.subject}" subject.</p>
            </div>
            <span className="text-[10px] bg-purple-50 text-purple-605 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded-full font-black">Gemini active</span>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm flex flex-col h-[500px]">
            {/* Messages body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {chatMessages.map((msg, index) => {
                const isAi = msg.sender === 'ai';
                return (
                  <div key={index} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                    <div className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed font-semibold whitespace-pre-wrap ${
                      isAi
                        ? 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-205 border border-slate-105 dark:border-slate-800'
                        : 'bg-brand-600 text-white shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-105 dark:border-slate-800 flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-slate-105 dark:border-slate-800 flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                placeholder={`Ask any doubt regarding ${room.topic}...`}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-xl bg-purple-600 hover:bg-purple-750 text-white font-extrabold text-xs px-5 py-2.5 transition-all shadow-sm flex items-center space-x-1"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Evaluation feedback modal */}
      {showEvalModal && evaluationResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setShowEvalModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-405 hover:text-slate-655 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
                <Sparkles className="h-8 w-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-805 dark:text-slate-100">
                AI Answer Evaluation
              </h3>

              {/* Score indicators */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Correctness</p>
                  <span className="font-black text-slate-800 dark:text-slate-202 text-base">{evaluationResult.correctness}%</span>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Clarity</p>
                  <span className="font-black text-slate-800 dark:text-slate-202 text-base">{evaluationResult.clarity}%</span>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">XP Awarded</p>
                  <span className="font-black text-brand-605 dark:text-brand-405 text-base">+{evaluationResult.xpAwarded || 20}</span>
                </div>
              </div>

              {/* Feedback text */}
              <div className="space-y-1.5 text-left border border-indigo-100/20 bg-slate-50/10 dark:bg-slate-900/10 p-4 rounded-xl">
                <p className="text-[10px] font-black text-indigo-555 dark:text-indigo-405 uppercase tracking-wider flex items-center space-x-1">
                  <Brain className="h-3.5 w-3.5" />
                  <span>AI Tutor Feedback</span>
                </p>
                <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-semibold">
                  {evaluationResult.feedback}
                </p>
              </div>

              {/* Confirm button */}
              <button
                onClick={() => setShowEvalModal(false)}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 py-3 text-xs font-black text-white transition-all"
              >
                Continue practice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
