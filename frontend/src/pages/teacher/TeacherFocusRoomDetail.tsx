import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Users, 
  BookOpen, 
  Plus, 
  Trash, 
  Brain, 
  Check, 
  Loader2, 
  Sparkles, 
  X,
  AlertCircle,
  FolderOpen,
  MessageSquare,
  BarChart3,
  ThumbsUp,
  FileText,
  Video,
  Image,
  Presentation,
  Send,
  HelpCircle
} from 'lucide-react';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  performanceLevel: string;
  section?: string;
  xp?: number;
  level?: number;
}

interface Question {
  questionText: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  addedBy: 'teacher' | 'ai';
  topic?: string;
  hint?: string;
  expectedAnswer?: string;
  createdAt: string;
}

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  students: Student[];
  roomType: 'slow_learner' | 'advanced' | 'general';
  isActive: boolean;
  questions: Question[];
  createdAt: string;
}

interface MemberProgress {
  _id: string;
  joinedAt: string;
  progress: number;
  xpEarned: number;
  status: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    rollNumber: string;
    performanceLevel: string;
    xp: number;
    level: number;
    resolvedDoubtsCount: number;
  };
}

export const TeacherFocusRoomDetail: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  
  const [room, setRoom] = useState<FocusRoom | null>(null);
  const [members, setMembers] = useState<MemberProgress[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'questions' | 'members' | 'resources' | 'discussions' | 'analytics' | 'assistant'>('questions');

  // Tabbed components states
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

  // Manual Question Addition
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionDiff, setNewQuestionDiff] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [addingQuestion, setAddingQuestion] = useState(false);

  // AI Question Generation
  const [generatingAI, setGeneratingAI] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<Question[]>([]);
  const [savingDrafts, setSavingDrafts] = useState(false);

  // Add Students Modal
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  const handleSaveDraftQuestions = async () => {
    if (draftQuestions.length === 0) return;
    setSavingDrafts(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-room/${roomId}/add-questions`,
        { questions: draftQuestions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoom(response.data);
      setDraftQuestions([]);
      alert('Approved questions saved successfully!');
    } catch (err) {
      console.error('Failed to save draft questions:', err);
      alert('Could not save questions.');
    } finally {
      setSavingDrafts(false);
    }
  };

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
      const headers = { Authorization: `Bearer ${token}` };

      const [roomRes, studentsRes] = await Promise.all([
        axios.get(`${API_URL}/focus-room/${roomId}`, { headers }),
        axios.get(`${API_URL}/allocation/my-students`, { headers })
      ]);

      setRoom(roomRes.data.room);
      setMembers(roomRes.data.members || []);
      setResources(roomRes.data.resources || []);
      setAllStudents(studentsRes.data.students || []);

      // Automatically select first resource for discussion if available and none selected
      if (roomRes.data.resources && roomRes.data.resources.length > 0 && !selectedResourceId) {
        setSelectedResourceId(roomRes.data.resources[0]._id);
        fetchDiscussionThread(roomRes.data.resources[0]._id);
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
          fileUrl: uploadUrl || `${API_BASE_URL}/mock/slides.pdf`
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

  const handleRemoveStudent = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to remove this student from the Focus Room?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/focus-rooms/${roomId}/members/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update state locally
      setMembers(prev => prev.filter(m => m.userId._id !== studentId));
      if (room) {
        setRoom({
          ...room,
          students: room.students.filter(s => s._id !== studentId)
        });
      }
    } catch (err) {
      console.error('Failed to remove student from room:', err);
      alert('Failed to remove student.');
    }
  };

  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !room) return;
    setAddingQuestion(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-room/${roomId}/add-question`,
        {
          questionText: newQuestionText,
          subject: room.subject,
          difficulty: newQuestionDiff
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRoom(response.data);
      setNewQuestionText('');
      setShowAddQuestion(false);
    } catch (err) {
      console.error('Failed to add question:', err);
      alert('Could not add question.');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleGenerateAIQuestions = async () => {
    if (!room) return;
    setGeneratingAI(true);
    setDraftQuestions([]);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-room/${roomId}/generate-questions`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDraftQuestions(response.data || []);
    } catch (err) {
      console.error('Failed to generate AI questions:', err);
      alert('Could not generate questions. Verify GEMINI_API_KEY config.');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleToggleStudentSelect = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleEnrollStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    setAddingStudents(true);
    setEnrollSuccess(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-room/${roomId}/add-students`,
        { studentIds: selectedStudentIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrollSuccess(`Successfully added ${selectedStudentIds.length} students!`);
      setTimeout(() => {
        setShowAddStudentsModal(false);
        setEnrollSuccess(null);
        fetchRoomDetails(); // Reload page details to get populated member objects
      }, 1500);
    } catch (err) {
      console.error('Failed to add students:', err);
      alert('Failed to enroll students.');
    } finally {
      setAddingStudents(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading focus room details...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold dark:bg-rose-955/20 dark:text-rose-450">
          {error || 'Focus Room not found.'}
        </div>
      </div>
    );
  }

  // Filter eligible students to add
  const currentMemberIds = members.map(m => m.userId?._id).filter(Boolean);
  const eligibleStudents = allStudents.filter(s => !currentMemberIds.includes(s._id));

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center space-x-3">
        <Link 
          to="/teacher/focus-rooms" 
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 text-slate-555 hover:text-slate-700 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-405 dark:hover:text-slate-200 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">{room.name}</h2>
          <p className="text-slate-400 text-xs font-semibold">{room.description || 'Target remediation classroom'}</p>
        </div>
      </div>

      {/* Stats and Room Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-5 rounded-2xl shadow-sm text-center text-xs">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Subject Area</p>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5 inline-block">{room.subject}</span>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Focus Topic</p>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5 inline-block">{room.topic || 'General'}</span>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Room Type</p>
          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5 inline-block capitalize">{room.roomType.replace('_', ' ')}</span>
        </div>
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Students</p>
          <span className="font-extrabold text-slate-805 dark:text-slate-200 text-sm mt-0.5 inline-block">{members.length} enrolled</span>
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
          <span>Practice Tasks ({room.questions.length})</span>
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

      {/* Tab Contents */}

      {/* Tab 1: Questions */}
      {activeTab === 'questions' && (
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-805 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <BookOpen className="h-4.5 w-4.5 text-brand-605" />
              <span>Questions Pool ({room.questions.length} questions)</span>
            </h3>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateAIQuestions}
                disabled={generatingAI || members.length === 0}
                className="inline-flex items-center space-x-1.5 text-indigo-655 hover:text-indigo-700 disabled:text-slate-400 font-black text-xs"
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-3.5 w-3.5 fill-indigo-100 dark:fill-transparent" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowAddQuestion(!showAddQuestion)}
                className="inline-flex items-center space-x-1 text-brand-605 font-black text-xs hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Add question inline form */}
          {showAddQuestion && (
            <form onSubmit={handleAddQuestionSubmit} className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-xl space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Question Text</label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
                  placeholder="Enter the question contents..."
                  rows={2}
                  required
                />
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-slate-405 uppercase">Difficulty:</span>
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setNewQuestionDiff(diff)}
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold capitalize border ${
                        newQuestionDiff === diff
                          ? 'bg-slate-800 border-slate-800 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900'
                          : 'border-slate-200 text-slate-500 dark:border-slate-800'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestion(false)}
                    className="px-3 py-1.5 border border-slate-205 dark:border-slate-800 text-[10px] font-bold rounded-lg text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingQuestion}
                    className="px-3 py-1.5 bg-brand-600 text-white text-[10px] font-black rounded-lg hover:bg-brand-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* AI Generated Drafts Panel */}
          {draftQuestions.length > 0 && (
            <div className="bg-indigo-50/15 dark:bg-indigo-955/5 border border-indigo-150/20 p-4 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-650 uppercase tracking-wider flex items-center space-x-1">
                  <Brain className="h-4 w-4" />
                  <span>AI Generated Drafts ({draftQuestions.length})</span>
                </span>
                <button
                  onClick={() => setDraftQuestions([])}
                  className="text-xs text-slate-400 hover:text-slate-655 font-bold"
                >
                  Clear Drafts
                </button>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {draftQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805 p-3 rounded-lg flex justify-between items-start gap-3">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-205 leading-relaxed">{q.questionText}</p>
                      <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-400 uppercase">
                        <span>Diff: <strong className="text-slate-655">{q.difficulty}</strong></span>
                        <span>•</span>
                        <span>Topic: {q.topic || 'OS'}</span>
                      </div>
                      {q.hint && (
                        <p className="text-[10px] text-amber-605 font-medium bg-amber-50/50 dark:bg-amber-955/10 px-2 py-0.5 rounded">
                          💡 Hint: {q.hint}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setDraftQuestions(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-all dark:hover:bg-rose-955/20 text-xs font-black"
                      title="Remove draft"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveDraftQuestions}
                disabled={savingDrafts || draftQuestions.length === 0}
                className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white py-2.5 text-xs font-black shadow-sm transition-all"
              >
                {savingDrafts ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Approve & Save Questions ({draftQuestions.length})</span>
              </button>
            </div>
          )}

          {room.questions.length === 0 ? (
            <p className="text-slate-405 text-xs font-semibold py-8 text-center border border-dashed border-slate-105 dark:border-slate-800 rounded-xl">
              No questions added yet. Use "Add Question" or leverage AI to generate safety questions.
            </p>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800 border border-slate-50 dark:border-slate-800 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              {room.questions.map((q, idx) => (
                <div key={idx} className="p-3.5 flex justify-between items-start text-xs font-semibold hover:bg-slate-50/50 dark:hover:bg-slate-855/45">
                  <div className="space-y-0.5 max-w-[80%]">
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{q.questionText}</p>
                    <div className="flex items-center space-x-2 pt-1 text-[9px] font-black text-slate-400 uppercase">
                      <span>Source: <strong className="text-slate-655 dark:text-slate-350">{q.addedBy}</strong></span>
                      <span>•</span>
                      <span>Topic: {q.subject}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    q.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450' :
                    q.difficulty === 'medium' ? 'bg-amber-50 text-amber-605 dark:bg-amber-950/20 dark:text-amber-450' :
                    'bg-rose-50 text-rose-600 dark:bg-rose-955/10 dark:text-rose-405'
                  }`}>
                    {q.difficulty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Members */}
      {activeTab === 'members' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Members search & list card */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <Users className="h-4.5 w-4.5 text-brand-605" />
                <span>Students in Room</span>
              </h3>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search students..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205 w-full sm:w-60 shadow-sm"
                />
                <button
                  onClick={() => setShowAddStudentsModal(true)}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-4 py-2 transition-all shadow-sm shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enroll Student</span>
                </button>
              </div>
            </div>

            {members.filter(m => m.userId && (
              m.userId.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
              m.userId.rollNumber?.toLowerCase().includes(memberSearch.toLowerCase())
            )).length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold py-8 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                No matching students found in this room.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.filter(m => m.userId && (
                  m.userId.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
                  m.userId.rollNumber?.toLowerCase().includes(memberSearch.toLowerCase())
                )).map(member => (
                  <div key={member._id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/10 dark:bg-slate-900/10 flex justify-between items-center text-xs font-semibold">
                    <div>
                      <h4 className="font-bold text-slate-805 dark:text-slate-200">{member.userId.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{member.userId.rollNumber || 'No Roll'} • XP: {member.xpEarned || 0} • Level {member.userId.level || 1}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`bg-slate-100 text-slate-550 dark:bg-slate-850 dark:text-slate-405 px-2 py-0.5 rounded text-[10px] uppercase font-black`}>
                        {member.userId.performanceLevel}
                      </span>
                      <button
                        onClick={() => handleRemoveStudent(member.userId._id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all dark:hover:bg-rose-955/20"
                        title="Remove student"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Student Progress Comparison Table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Student Progress Comparison Table
            </h3>

            <div className="overflow-x-auto border border-slate-50 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Student</th>
                    <th className="p-4">Activity Progress</th>
                    <th className="p-4">XP Earned (In Room)</th>
                    <th className="p-4">Total Resolved</th>
                    <th className="p-4">Overall Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-405 font-semibold">No progress logged. Enroll students to track activity progress.</td>
                    </tr>
                  ) : (
                    members.map((member) => {
                      if (!member.userId) return null;
                      return (
                        <tr key={member._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 font-semibold">
                          <td className="p-4">
                            <div className="font-bold text-slate-850 dark:text-slate-205">{member.userId.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{member.userId.rollNumber || 'No Roll'}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-teal-400 to-brand-555" style={{ width: `${member.progress || 0}%` }} />
                              </div>
                              <span className="font-black text-slate-655 dark:text-slate-350 text-[11px]">{member.progress || 0}%</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                            {member.xpEarned || 0} XP
                          </td>
                          <td className="p-4 font-bold text-slate-750 dark:text-slate-300">
                            {member.userId.resolvedDoubtsCount || 0} doubts
                          </td>
                          <td className="p-4">
                            <span className="bg-slate-50 text-slate-550 border border-slate-100 dark:bg-slate-900 dark:text-slate-405 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              Lvl {member.userId.level || 1} • {member.userId.performanceLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6">
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
                <span>Upload New Resource</span>
              </button>
            </div>

            {showUploadForm && (
              <form onSubmit={handleUploadResourceSubmit} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md space-y-4">
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Upload Classroom Resource</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-405 uppercase">Resource Title</label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      required
                      placeholder="e.g. CPU Scheduling Lecture Slides"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-405 uppercase">Resource Type</label>
                    <select
                      value={uploadType}
                      onChange={(e: any) => setUploadType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-705 dark:text-slate-205"
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
                  <label className="text-[10px] font-black text-slate-455 uppercase">File URL (Google Drive / S3 / Mock)</label>
                  <input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase">Resource Description</label>
                  <textarea
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Brief description of the uploaded resource..."
                    rows={2}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
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
              <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
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
                    <div key={idx} className="border border-slate-100 dark:border-slate-805 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-300 dark:hover:border-brand-700 transition-all bg-slate-50/10 dark:bg-slate-900/10">
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
                          <p className="text-xs text-slate-400 font-medium">{res.description || 'No description provided.'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Uploaded by: {res.uploaderId?.name || 'Mentor'} ({res.uploaderRole || 'teacher'})</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => {
                            setSelectedResourceId(res._id);
                            fetchDiscussionThread(res._id);
                            setActiveTab('discussions');
                          }}
                          className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-slate-655 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Discuss Thread</span>
                        </button>

                        {res.fileUrl && (
                          <a
                            href={res.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-bold text-slate-655 bg-slate-100 hover:bg-slate-200 rounded-xl dark:bg-slate-800 dark:text-slate-300"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Open URL</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Discussions */}
      {activeTab === 'discussions' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-855 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
                  <MessageSquare className="h-4.5 w-4.5 text-brand-605" />
                  <span>Doubt Resolution Discussions</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Select a resource to review comments or help resolve doubts.</p>
              </div>

              <select
                value={selectedResourceId}
                onChange={(e) => {
                  setSelectedResourceId(e.target.value);
                  fetchDiscussionThread(e.target.value);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-705 dark:text-slate-205 shadow-sm max-w-xs"
              >
                <option value="">-- Choose Resource --</option>
                {resources.map((res, i) => (
                  <option key={i} value={res._id}>{res.title}</option>
                ))}
              </select>
            </div>

            {!selectedResourceId ? (
              <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <MessageSquare className="h-12 w-12 text-slate-205 dark:text-slate-705 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold uppercase">Please select a resource to view its active discussions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Form to leave comments/resolutions */}
                <form onSubmit={handlePostDiscussionMessage} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Write Mentor Resolution / Reply</label>
                    <textarea
                      value={newDiscussionContent}
                      onChange={(e) => setNewDiscussionContent(e.target.value)}
                      required
                      placeholder="Answer a student doubt or post lecture updates here..."
                      rows={3}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-5 py-2.5 transition-all shadow-sm"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </form>

                {/* Messages feed list */}
                {discussions.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-150 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">No comments posted yet in this thread.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {discussions.filter(d => !d.parentId).map((msg, idx) => {
                      const replies = discussions.filter(reply => reply.parentId === msg._id);
                      const tokenPayload = localStorage.getItem('token') ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])) : null;
                      const myId = tokenPayload?.userId;
                      const isUpvoted = msg.upvotes?.includes(myId);

                      return (
                        <div key={idx} className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm bg-slate-50/10 dark:bg-slate-900/10 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-xs text-slate-850 dark:text-slate-200">{msg.userId?.name || 'Student'}</span>
                              <span className={`ml-2 text-[9px] px-2 py-0.5 rounded uppercase font-black ${
                                msg.userRole === 'teacher' ? 'bg-purple-50 text-purple-650 dark:bg-purple-950/20' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {msg.userRole}
                              </span>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{new Date(msg.createdAt).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {msg.isDoubt && (
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                  ['peer_solved', 'teacher_solved'].includes(msg.status) ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-955/20 dark:text-emerald-455' :
                                  'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-955/20 dark:text-rose-455'
                                }`}>
                                  Doubt: {msg.status || 'open'}
                                </span>
                              )}

                              <button
                                onClick={() => handleUpvoteDiscussion(msg._id)}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                  isUpvoted
                                    ? 'bg-amber-50 border-amber-205 text-amber-600'
                                    : 'bg-slate-105 border-slate-200 text-slate-555 hover:bg-slate-200'
                                }`}
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>{msg.upvotes?.length || 0} Upvotes</span>
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-semibold text-slate-655 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                          {/* Reply inputs */}
                          <div className="flex items-center gap-3 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                            <button
                              onClick={() => {
                                setDiscussionReplyParentId(discussionReplyParentId === msg._id ? null : msg._id);
                                setReplyText('');
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600"
                            >
                              Reply
                            </button>

                            {msg.isDoubt && msg.userRole === 'student' && (
                              <button
                                onClick={async () => {
                                  try {
                                    const token = localStorage.getItem('token');
                                    await axios.post(
                                      `${API_URL}/focus-rooms/${roomId}/resources/${selectedResourceId}/discussion/${msg._id}/award-bonus`,
                                      {},
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    alert('Bonus XP awarded to resolver student successfully!');
                                    fetchDiscussionThread(selectedResourceId);
                                  } catch (err) {
                                    alert('Failed to award bonus XP.');
                                  }
                                }}
                                className="text-xs font-black text-amber-505 hover:underline"
                              >
                                Award Resolution Bonus
                              </button>
                            )}
                          </div>

                          {discussionReplyParentId === msg._id && (
                            <div className="pl-4 border-l-2 border-slate-150 mt-3 space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write resolution reply..."
                                rows={2}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-700 dark:text-slate-205"
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

                          {/* Replies list */}
                          {replies.length > 0 && (
                            <div className="pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-3 mt-3">
                              {replies.map((rep, rIdx) => (
                                <div key={rIdx} className="space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-xs text-slate-850 dark:text-slate-200">{rep.userId?.name || 'User'}</span>
                                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-450 font-bold">{rep.userRole}</span>
                                    <span className="text-[10px] text-slate-450 font-bold">{new Date(rep.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-xs text-slate-555 dark:text-slate-350 font-semibold">{rep.content}</p>
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
        </div>
      )}

      {/* Tab 5: Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-sm font-black text-slate-855 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-brand-605" />
              <span>Room Engagement & Analytics</span>
            </h3>

            {analyticsLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
              </div>
            ) : !analyticsData ? (
              <div className="text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <BarChart3 className="h-12 w-12 text-slate-205 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-bold uppercase">No analytics computed yet.</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1 */}
                  <div className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between bg-slate-50/10 dark:bg-slate-900/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Completion Rate</span>
                    <div className="mt-4">
                      <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">
                        {analyticsData.roomAnalytics?.averageRoomProgress || 0}%
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">Average student progress</p>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between bg-slate-50/10 dark:bg-slate-900/10">
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

                  {/* Card 3 */}
                  <div className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between bg-slate-50/10 dark:bg-slate-900/10">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">AI Score Rating</span>
                    <div className="mt-4">
                      <h3 className="text-3xl font-black text-purple-600 dark:text-purple-400">
                        {analyticsData.roomAnalytics?.averageScore || 0}/100
                      </h3>
                      <p className="text-[9px] text-slate-405 font-bold mt-1">Average correctness metric</p>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between bg-slate-50/10 dark:bg-slate-900/10">
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

                {/* Students needing intervention */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-rose-500 uppercase tracking-wider flex items-center space-x-1">
                    <AlertCircle className="h-4 w-4" />
                    <span>Students Needing Urgent Intervention (Progress &lt; 40%)</span>
                  </h4>
                  {(!analyticsData.roomAnalytics?.studentsNeedingIntervention || analyticsData.roomAnalytics.studentsNeedingIntervention.length === 0) ? (
                    <p className="text-xs text-slate-400 font-semibold italic bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">No students currently lagging behind target targets.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analyticsData.roomAnalytics.studentsNeedingIntervention.map((student: any, i: number) => (
                        <div key={i} className="p-4 rounded-xl border border-rose-100 bg-rose-500/5 flex justify-between items-center text-xs font-semibold">
                          <div>
                            <h5 className="font-bold text-slate-850 dark:text-slate-100">{student.name}</h5>
                            <p className="text-[10px] text-slate-400 mt-0.5">Roll Number: {student.rollNumber || 'N/A'}</p>
                          </div>
                          <span className="text-rose-600 font-black text-sm bg-rose-100/50 dark:bg-rose-955/25 px-2.5 py-1 rounded-lg">
                            {student.progress}% Completed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: AI Learning Assistant */}
      {activeTab === 'assistant' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6">
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

            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col h-[500px] bg-slate-50/5 dark:bg-slate-900/5">
              {/* Messages body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {chatMessages.map((msg, index) => {
                  const isAi = msg.sender === 'ai';
                  return (
                    <div key={index} className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
                      <div className={`p-4 rounded-2xl max-w-lg text-xs leading-relaxed font-semibold whitespace-pre-wrap ${
                        isAi
                          ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-205 border border-slate-100 dark:border-slate-800 shadow-sm'
                          : 'bg-brand-600 text-white shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input form */}
              <form onSubmit={handleSendChat} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-950 rounded-b-3xl">
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
                  className="rounded-xl bg-purple-605 hover:bg-purple-700 text-white font-extrabold text-xs px-5 py-2.5 transition-all shadow-sm flex items-center space-x-1"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showAddStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setShowAddStudentsModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-405 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 mb-1">
              Enroll Students
            </h3>
            <p className="text-slate-400 text-xs mb-5 font-semibold">
              Select student(s) to add to <strong className="text-slate-655 dark:text-slate-350">{room.name}</strong>
            </p>

            {enrollSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-center text-xs font-bold dark:bg-emerald-955/20 dark:text-emerald-450 dark:border-emerald-900/35">
                {enrollSuccess}
              </div>
            ) : eligibleStudents.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-205 dark:border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase">All assigned students are already enrolled!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {eligibleStudents.map(student => {
                    const isSelected = selectedStudentIds.includes(student._id);
                    return (
                      <div
                        key={student._id}
                        onClick={() => handleToggleStudentSelect(student._id)}
                        className={`flex items-center justify-between p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-850/40 text-xs font-bold ${
                          isSelected ? 'bg-brand-50/5 dark:bg-brand-950/5 border-brand-200' : ''
                        }`}
                      >
                        <div>
                          <h4 className="text-slate-750 dark:text-slate-205">{student.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold">{student.rollNumber || 'No Roll Num'} • Section {student.section || 'N/A'}</p>
                        </div>
                        <div className={`p-1.5 rounded-lg border ${
                          isSelected ? 'bg-brand-600 border-brand-605 text-white' : 'border-slate-200 dark:border-slate-800 text-transparent'
                        }`}>
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleEnrollStudents}
                  disabled={selectedStudentIds.length === 0 || addingStudents}
                  className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-405 disabled:dark:bg-slate-900 py-3 text-xs font-black text-white shadow-md transition-all"
                >
                  {addingStudents ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Enroll Selected Students ({selectedStudentIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
