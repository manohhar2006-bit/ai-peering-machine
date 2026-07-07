import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Users,
  LineChart,
  Calendar,
  Award,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  FileText,
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Brain,
  Scale,
  AlertTriangle,
  Send,
  Loader2,
  Clock,
  TrendingDown,
  ThumbsUp,
  UserCheck,
  ChevronDown,
  Target,
  Trophy,
  Plus,
  UserMinus,
  Search
} from 'lucide-react';
import { SelectStudentsModal } from '../components/SelectStudentsModal';
import { AddManuallyModal } from '../components/AddManuallyModal';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

export const FocusRoomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  // Room core data state
  const [room, setRoom] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [userMembership, setUserMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected resource for right-pane discussion
  const [activeResource, setActiveResource] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDoubt, setIsDoubt] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);

  // AI Assistant states (specific to selected doubt message)
  const [activeDoubtMsg, setActiveDoubtMsg] = useState<any>(null);
  const [aiAssistantTab, setAiAssistantTab] = useState<'coach' | 'referee' | 'evaluator' | 'escalation'>('coach');
  const [hints, setHints] = useState<any[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  
  // Referee & Evaluator API states
  const [refereeData, setRefereeData] = useState<any>(null);
  const [refereeLoading, setRefereeLoading] = useState(false);
  
  const [evaluatingMsgId, setEvaluatingMsgId] = useState<string | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [selectedEvaluationReplyId, setSelectedEvaluationReplyId] = useState('');
  
  // Escalation status
  const [escalating, setEscalating] = useState(false);
  const [escalationData, setEscalationData] = useState<any>(null);

  // Resource Upload Modal State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadType, setUploadType] = useState('PDF');
  const [uploading, setUploading] = useState(false);

  // Tabs for Left Pane
  const [activeLeftTab, setActiveLeftTab] = useState<'resources' | 'members' | 'leaderboard' | 'analytics'>('resources');
  const [selectStudentsOpen, setSelectStudentsOpen] = useState(false);
  const [addManuallyOpen, setAddManuallyOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [studentToRemove, setStudentToRemove] = useState<any | null>(null);

  // Remove a student directly from the classroom roster
  const handleRemoveMember = async () => {
    if (!studentToRemove) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/focus-rooms/${id}/members/${studentToRemove._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentToRemove(null);
      alert('Student successfully removed from the Focus Room.');
      fetchRoomData();
    } catch (err: any) {
      console.error('Failed to remove student:', err);
      alert(err.response?.data?.message || 'Failed to remove student');
    }
  };

  const getAvatarBg = (name: string) => {
    const char = name.trim().charAt(0).toUpperCase();
    const colors = [
      'bg-indigo-500 text-indigo-100',
      'bg-emerald-500 text-emerald-100',
      'bg-amber-500 text-amber-100',
      'bg-rose-500 text-rose-100',
      'bg-cyan-500 text-cyan-100',
      'bg-violet-500 text-violet-100'
    ];
    return colors[char.charCodeAt(0) % colors.length];
  };

  // Recharts theme colors
  const COLORS = ['#10b981', '#8b5cf6', '#f97316', '#3b82f6'];

  // Analytics states
  const [roomAnalytics, setRoomAnalytics] = useState<any>(null);
  const [workloadAnalytics, setWorkloadAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchRoomData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoom(response.data.room);
      setResources(response.data.resources);
      setMembers(response.data.members);
      if (response.data.userMembership) {
        setUserMembership(response.data.userMembership);
      }
    } catch (err) {
      console.error('Failed to load focus room details:', err);
      setError('Could not retrieve focus room details. Make sure you are authorized.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/${id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoomAnalytics(response.data.roomAnalytics);
      setWorkloadAnalytics(response.data.facultyWorkloadAnalytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRoomData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeLeftTab === 'analytics') {
      fetchAnalytics();
    }
  }, [id, activeLeftTab]);

  // Load discussion thread for selected resource
  const handleSelectResource = async (res: any) => {
    setActiveResource(res);
    setReplyToId(null);
    setNewMessage('');
    setIsDoubt(false);
    setActiveDoubtMsg(null);
    setEvaluationResult(null);
    setRefereeData(null);
    setEscalationData(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/${id}/resources/${res._id}/discussion`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to load discussion thread:', err);
    }
  };

  // Submit discussion comment
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeResource) return;

    setMsgLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion`,
        {
          content: newMessage,
          isDoubt: isDoubt,
          parentId: replyToId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages([...messages, response.data]);
      setNewMessage('');
      setIsDoubt(false);
      setReplyToId(null);
      // Refresh list to update points or counts
      fetchRoomData();
    } catch (err) {
      console.error('Failed to post discussion message:', err);
    } finally {
      setMsgLoading(false);
    }
  };

  // Upvote message
  const handleUpvote = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${messageId}/upvote`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Update message in feed
      setMessages(messages.map(m => m._id === messageId ? response.data : m));
    } catch (err) {
      console.error('Failed to upvote message:', err);
    }
  };

  // Mark resource completed
  const handleMarkResourceComplete = async (res: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${res._id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Update local completed list
      setResources(resources.map(r => {
        if (r._id === res._id) {
          const completed = [...r.completedStudents];
          if (!completed.includes(user?.id)) {
            completed.push(user?.id);
          }
          return { ...r, completedStudents: completed };
        }
        return r;
      }));
      if (response.data.progress !== undefined) {
        setUserMembership((prev: any) => prev ? { ...prev, progress: response.data.progress } : null);
      }
      alert('Resource marked as completed! (+15 XP awarded)');
      fetchRoomData();
    } catch (err) {
      console.error('Failed to complete resource:', err);
    }
  };

  // Upload Resource Form Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources`,
        {
          title: uploadTitle,
          description: uploadDesc,
          fileType: uploadType,
          fileUrl: `https://mockfile-download-demo.edu/files/${uploadTitle.toLowerCase().replace(/ /g, '-')}`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setResources([response.data, ...resources]);
      setUploadOpen(false);
      setUploadTitle('');
      setUploadDesc('');
      alert('Learning resource uploaded successfully!');
      fetchRoomData();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  // Award Teacher Bonus points
  const handleAwardBonus = async (messageId: string) => {
    const pts = prompt('Enter bonus points to award to this student (e.g. 50, 100):', '50');
    if (!pts) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${messageId}/award-bonus`,
        { points: pts },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Successfully awarded +${pts} XP to student solver!`);
      fetchRoomData();
    } catch (err) {
      console.error('Failed to award bonus points:', err);
    }
  };

  // AI COACH: Request Hint
  const handleRequestAIHint = async () => {
    if (!activeDoubtMsg) return;
    setHintLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${activeDoubtMsg._id}/hint`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setHints([...hints, { hintContent: response.data.hintContent, ladderIndex: response.data.ladderIndex }]);
      // Update parent doubt message hintsUsed count locally
      setMessages(messages.map(m => m._id === activeDoubtMsg._id ? { ...m, hintsUsed: response.data.totalHintsUsed } : m));
      setActiveDoubtMsg((prev: any) => ({ ...prev, hintsUsed: response.data.totalHintsUsed }));
    } catch (err) {
      console.error('Hint request failed:', err);
    } finally {
      setHintLoading(false);
    }
  };

  // AI REFEREE: Compare answers
  const handleTriggerAIReferee = async () => {
    if (!activeDoubtMsg) return;
    setRefereeLoading(true);
    setRefereeData(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${activeDoubtMsg._id}/referee`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setRefereeData(response.data);
    } catch (err) {
      console.error('AI Referee failed:', err);
    } finally {
      setRefereeLoading(false);
    }
  };

  // AI EVALUATOR: Grade Reply
  const handleTriggerAIEvaluate = async () => {
    if (!activeDoubtMsg || !selectedEvaluationReplyId) return;
    setEvaluatingMsgId(selectedEvaluationReplyId);
    setEvaluationResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${activeDoubtMsg._id}/evaluate`,
        { replyId: selectedEvaluationReplyId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setEvaluationResult(response.data);
      // Refresh discussion to show updated doubt status (peer_solved etc)
      const resMsg = await axios.get(`${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(resMsg.data);
    } catch (err) {
      console.error('AI Evaluator failed:', err);
    } finally {
      setEvaluatingMsgId(null);
    }
  };

  // AI ESCALATION: Check should escalate
  const handleTriggerAIEscalate = async (manual: boolean) => {
    if (!activeDoubtMsg) return;
    setEscalating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/focus-rooms/${id}/resources/${activeResource._id}/discussion/${activeDoubtMsg._id}/escalate`,
        { manual },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setEscalationData(response.data);
      if (response.data.escalated) {
        setMessages(messages.map(m => m._id === activeDoubtMsg._id ? { ...m, status: 'escalated' } : m));
        setActiveDoubtMsg((prev: any) => ({ ...prev, status: 'escalated' }));
        alert('Doubt escalated to faculty queue! Notification dispatched.');
      }
    } catch (err) {
      console.error('Escalation analysis failed:', err);
    } finally {
      setEscalating(false);
    }
  };

  const openAIAssistant = (msg: any) => {
    setActiveDoubtMsg(msg);
    setAiAssistantTab('coach');
    setHints([]);
    setRefereeData(null);
    setEvaluationResult(null);
    setEscalationData(null);
    
    // Find replies to select for evaluation dropdown
    const replies = messages.filter(m => m.parentId === msg._id);
    if (replies.length > 0) {
      setSelectedEvaluationReplyId(replies[0]._id);
    } else {
      setSelectedEvaluationReplyId('');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading classroom dashboard...</p>
        </div>
      </div>
    );
  }

  const teacherUploads = resources.filter(r => r.uploaderRole === 'teacher');
  const studentUploads = resources.filter(r => r.uploaderRole === 'student');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/focus-rooms')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{room.name}</h2>
            <div className="flex items-center space-x-2 text-xs text-slate-455 mt-1 font-semibold">
              <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                {room.subjectId?.code}
              </span>
              <span>•</span>
              <span className="text-brand-650 dark:text-brand-405 flex items-center space-x-1">
                <Target className="h-3 w-3 inline" />
                <span>Topic: {room.topic}</span>
              </span>
              <span>•</span>
              <span>Created by {room.creatorId?.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800 shadow-sm">
          <Calendar className="h-4.5 w-4.5 text-slate-400" />
          <div className="text-xs">
            <span className="text-slate-400 block font-bold text-[9px] uppercase">Room Deadline</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-200">
              {new Date(room.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Objectives panel */}
      {room.learningObjectives?.length > 0 && (
        <div className="bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Objectives:</span>
          {room.learningObjectives.map((obj: string, i: number) => (
            <span key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-xl text-xs font-bold text-slate-650 dark:text-slate-350">
              🎯 {obj}
            </span>
          ))}
        </div>
      )}

      {/* Main split dashboard panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane - Tabs Section - Width 7/12 */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Segmented controls */}
          <div className="flex p-1 bg-slate-55 dark:bg-[#0F172A] rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-x-auto">
            <button
              onClick={() => setActiveLeftTab('resources')}
              className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition-all min-w-[120px] ${
                activeLeftTab === 'resources'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <BookOpen className="h-4.5 w-4.5" />
              <span>Learning Resources</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('members')}
              className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition-all min-w-[100px] ${
                activeLeftTab === 'members'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              <span>Members</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('leaderboard')}
              className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition-all min-w-[120px] ${
                activeLeftTab === 'leaderboard'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Trophy className="h-4.5 w-4.5" />
              <span>Class Leaderboard</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('analytics')}
              className={`flex-1 py-3 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition-all min-w-[120px] ${
                activeLeftTab === 'analytics'
                  ? 'bg-white text-brand-600 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <LineChart className="h-4.5 w-4.5" />
              <span>Room Analytics</span>
            </button>
          </div>

          {/* Tab 1: Resources list */}
          {activeLeftTab === 'resources' && (
            <div className="space-y-6">
              
              {/* Upload section header */}
              <div className="flex justify-between items-center">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-105 uppercase tracking-wider">
                  Classroom Resources
                </h3>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 text-xs transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload Resource</span>
                </button>
              </div>

              {/* Upload form modal */}
              {uploadOpen && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150 dark:bg-slate-900/60 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-500">Upload Learning Material</h4>
                  <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="Bankers Algorithm Practice Sheet"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Resource Type *</label>
                        <select
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        >
                          <option value="PDF">PDF Document</option>
                          <option value="PPT">PPT Presentation</option>
                          <option value="Notes">Faculty Notes</option>
                          <option value="Assignment">Assignment Sheet</option>
                          <option value="Practice Questions">Practice Questions</option>
                          <option value="Image">Concept Image/Screenshot</option>
                          <option value="Video">Video Link</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                      <textarea
                        rows={2}
                        placeholder="Provide details about what this contains."
                        value={uploadDesc}
                        onChange={(e) => setUploadDesc(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-808 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 text-xs font-bold pt-2">
                      <button
                        type="button"
                        onClick={() => setUploadOpen(false)}
                        className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-white dark:bg-slate-850 dark:border-slate-800 dark:text-slate-350"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploading}
                        className="px-5 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-all flex items-center justify-center"
                      >
                        {uploading ? 'Uploading...' : 'Save Resource'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Resource Categories */}
              <div className="space-y-5">
                {/* Faculty Uploads */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <span>Teacher Learning Materials</span>
                  </h4>

                  {teacherUploads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800">
                      No materials uploaded by the instructor yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teacherUploads.map(res => {
                        const isCompleted = res.completedStudents.includes(user?.id);
                        const isActive = activeResource?._id === res._id;

                        return (
                          <div
                            key={res._id}
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center cursor-pointer ${
                              isActive
                                ? 'border-brand-300 bg-brand-50/10 dark:bg-brand-950/10 dark:border-slate-750'
                                : 'border-slate-100 bg-white dark:bg-[#1E293B] dark:border-slate-800 hover:border-slate-200'
                            }`}
                            onClick={() => handleSelectResource(res)}
                          >
                            <div className="flex items-start space-x-3.5 max-w-[70%]">
                              <div className="h-10 w-10 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <span className="font-extrabold text-slate-750 text-sm dark:text-slate-100 line-clamp-1 block hover:underline">
                                  {res.title}
                                </span>
                                <span className="text-[10px] text-slate-400 block line-clamp-1">{res.description}</span>
                                <div className="flex space-x-2 items-center text-[10px] font-bold text-slate-400 pt-0.5">
                                  <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-405 px-1.5 py-0.5 rounded text-[8px]">
                                    TEACHER
                                  </span>
                                  <span>•</span>
                                  <span>{res.fileType}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {user?.role === 'student' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isCompleted) handleMarkResourceComplete(res);
                                  }}
                                  disabled={isCompleted}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                      : 'bg-slate-100 hover:bg-brand-600 hover:text-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {isCompleted ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                                  <span>{isCompleted ? 'Completed' : 'Mark Completed'}</span>
                                </button>
                              )}
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Student Uploads */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                    <span>Student Uploads & Shared Doubts</span>
                  </h4>

                  {studentUploads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800">
                      No peer resources uploaded yet. Share useful links or doubts!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentUploads.map(res => {
                        const isCompleted = res.completedStudents.includes(user?.id);
                        const isActive = activeResource?._id === res._id;

                        return (
                          <div
                            key={res._id}
                            className={`p-4 rounded-2xl border transition-all flex justify-between items-center cursor-pointer ${
                              isActive
                                ? 'border-brand-300 bg-brand-50/10 dark:bg-brand-950/10 dark:border-slate-750'
                                : 'border-slate-100 bg-white dark:bg-[#1E293B] dark:border-slate-800 hover:border-slate-200'
                            }`}
                            onClick={() => handleSelectResource(res)}
                          >
                            <div className="flex items-start space-x-3.5 max-w-[70%]">
                              <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-605 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="space-y-1">
                                <span className="font-extrabold text-slate-750 text-sm dark:text-slate-100 line-clamp-1 block hover:underline">
                                  {res.title}
                                </span>
                                <span className="text-[10px] text-slate-400 block line-clamp-1">{res.description}</span>
                                <div className="flex space-x-2 items-center text-[10px] font-bold text-slate-400 pt-0.5">
                                  <span className="bg-teal-50 text-teal-605 dark:bg-teal-950/20 dark:text-teal-400 px-1.5 py-0.5 rounded text-[8px]">
                                    {res.uploaderId?.name || 'STUDENT'}
                                  </span>
                                  <span>•</span>
                                  <span>{res.fileType}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {user?.role === 'student' && res.uploaderId?._id !== user?.id && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isCompleted) handleMarkResourceComplete(res);
                                  }}
                                  disabled={isCompleted}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                      : 'bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {isCompleted ? <CheckCircle className="h-3.5 w-3.5" /> : null}
                                  <span>{isCompleted ? 'Read' : 'Mark Read'}</span>
                                </button>
                              )}
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Tab: Members */}
          {activeLeftTab === 'members' && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-5">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-850 dark:text-slate-105 uppercase tracking-wider">
                    Classroom Members
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                    {members.filter(m => m.userId && m.userId.role === 'student').length} Students enrolled
                  </p>
                </div>
              </div>

              {/* Teacher controls: Two separate buttons with icons (Select Students, Add Manually) */}
              {isTeacher && (
                <div className="flex flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectStudentsOpen(true)}
                    className="inline-flex items-center space-x-2 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 font-bold py-2.5 px-4 text-xs transition-all shadow-xs border border-brand-200/30"
                  >
                    <Users className="h-4 w-4" />
                    <span>Select Students</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddManuallyOpen(true)}
                    className="inline-flex items-center space-x-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold py-2.5 px-4 text-xs transition-all shadow-xs border border-slate-200/30"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Manually</span>
                  </button>
                </div>
              )}

              {/* Roster list */}
              <div className="space-y-4">
                {/* 1. Show Teacher/Creator */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Instructor</h4>
                  <div className="p-3.5 bg-slate-50/50 dark:bg-[#0F172A]/40 rounded-2xl border border-slate-105/50 dark:border-slate-850 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                        {room.creatorId?.name?.charAt(0).toUpperCase() || 'T'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{room.creatorId?.name}</span>
                          <span className="bg-brand-100 text-brand-700 dark:bg-brand-950/20 dark:text-brand-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                            Teacher
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-455 dark:text-slate-450">{room.creatorId?.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Show Current Student Members list */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">Current Members</h4>
                    <span className="text-[10px] font-bold text-slate-400">
                      {members.filter(m => m.userId && m.userId.role === 'student').length} Students
                    </span>
                  </div>

                  {/* Local member search input */}
                  <div className="relative mb-3.5">
                    <input
                      type="text"
                      placeholder="Search members by Name, Roll No, Branch, Section..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-150"
                    />
                    <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-850 space-y-2">
                    {members.filter(m => {
                      const u = m.userId || {};
                      if (u.role !== 'student') return false;
                      
                      const q = memberSearchQuery.toLowerCase();
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.rollNumber || '').toLowerCase().includes(q) ||
                        (u.branch || '').toLowerCase().includes(q) ||
                        (u.section || '').toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No student members found matching the filter.
                      </div>
                    ) : (
                      members
                        .filter(m => {
                          const u = m.userId || {};
                          if (u.role !== 'student') return false;
                          
                          const q = memberSearchQuery.toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(q) ||
                            (u.rollNumber || '').toLowerCase().includes(q) ||
                            (u.branch || '').toLowerCase().includes(q) ||
                            (u.section || '').toLowerCase().includes(q)
                          );
                        })
                        .map(member => {
                          const u = member.userId || {};
                          const initials = (u.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                          const joinedDateStr = new Date(member.joinedAt || Date.now()).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });

                          return (
                            <div key={member._id} className="flex justify-between items-center p-3 hover:bg-slate-50/40 dark:hover:bg-slate-800/20 rounded-xl transition-all">
                              <div className="flex items-center space-x-3">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(u.name || '')}`}>
                                  {initials || 'ST'}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">{u.name}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-405 block font-semibold">
                                    {u.rollNumber || 'No Roll No'} • {u.branch || 'Gen'} (Sec {u.section || 'A'})
                                  </span>
                                  <span className="text-[9px] text-slate-400 block pt-0.5">Joined: {joinedDateStr}</span>
                                </div>
                              </div>

                              {isTeacher && (
                                <button
                                  type="button"
                                  onClick={() => setStudentToRemove(u)}
                                  className="text-red-500 hover:text-red-750 border border-red-55 dark:border-red-950/20 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/15 transition-all"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Leaderboard */}
          {activeLeftTab === 'leaderboard' && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
              <h3 className="text-base font-black text-slate-800 dark:text-slate-105 uppercase tracking-wider">
                Focus Room Leaderboard
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Rank</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4 text-center">Progress</th>
                      <th className="py-3 px-4 text-right">Points Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs dark:divide-slate-850 text-slate-655 dark:text-slate-350">
                    {members.map((member, index) => (
                      <tr key={member._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <td className="py-3.5 px-2 font-bold text-slate-500">
                          {index === 0 ? '🏆 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-slate-200">
                          {member.userId?.name || 'Anonymous Explorer'}
                        </td>
                        <td className="py-3.5 px-4">{member.userId?.rollNumber || 'CS2026-N/A'}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="w-8 text-right text-[10px] font-bold text-slate-400">
                              {member.progress}%
                            </span>
                            <div className="h-1.5 w-16 bg-slate-100 rounded-full dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${member.progress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800 dark:text-slate-100">
                          +{member.xpEarned || 0} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Analytics */}
          {activeLeftTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
                  <span>Computing room metrics...</span>
                </div>
              ) : roomAnalytics && workloadAnalytics ? (
                <div className="space-y-6">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Completion</span>
                      <span className="text-xl font-black text-slate-800 dark:text-slate-100">{roomAnalytics.averageRoomProgress}%</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Avg AI Score</span>
                      <span className="text-xl font-black text-slate-850 dark:text-slate-100">{roomAnalytics.averageScore}%</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Hints Used</span>
                      <span className="text-xl font-black text-slate-850 dark:text-slate-100">{roomAnalytics.hintsUsed} hints</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-xs">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">Interventions</span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-500">{roomAnalytics.teacherInterventions}</span>
                    </div>
                  </div>

                  {/* Workload reduction highlight */}
                  <div className="bg-emerald-50/10 border-2 border-emerald-500/20 p-5 rounded-2xl dark:bg-slate-900/50 dark:border-slate-850 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="space-y-1">
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 px-2 py-0.5 rounded text-[8px] font-black uppercase">
                        Faculty Workload Saved
                      </span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {workloadAnalytics.facultyWorkloadReduction} reduction
                      </h4>
                      <p className="text-xs text-slate-450 dark:text-slate-400 max-w-sm">
                        Estimated faculty time saved: <strong className="text-slate-700 dark:text-slate-200">{workloadAnalytics.estimatedFacultyTimeSaved}</strong> of repetitive support loop questions.
                      </p>
                    </div>

                    <div className="text-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs flex-shrink-0">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">Doubts Solved</span>
                      <span className="text-xl font-black text-emerald-500 mt-1 block">
                        {workloadAnalytics.solvedByStudents}/{workloadAnalytics.totalDoubts}
                      </span>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Doubt breakdown pie chart */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex flex-col space-y-3">
                      <span className="text-xs font-bold text-slate-500">Doubt Resolution Channels</span>
                      <div className="h-48 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Solved by Peers', value: workloadAnalytics.solvedByStudents },
                                { name: 'Solved by AI Coach', value: workloadAnalytics.solvedUsingAICoach },
                                { name: 'Escalated to Teacher', value: workloadAnalytics.escalatedToTeacher }
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {[0, 1, 2].map((_, i) => (
                                <Cell key={`cell-${i}`} fill={COLORS[i]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} doubts`} />
                            <Legend verticalAlign="bottom" iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Resources uploads breakdown */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex flex-col space-y-3">
                      <span className="text-xs font-bold text-slate-500">Resource Upload Contributions</span>
                      <div className="h-48 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Teacher', uploads: roomAnalytics.teacherUploads },
                            { name: 'Students', uploads: roomAnalytics.studentUploads }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="uploads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Underperforming students alert queue */}
                  {isTeacher && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-500 flex items-center space-x-1.5">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                        <span>Students needing intervention (Progress &lt; 40%)</span>
                      </span>

                      {roomAnalytics.studentsNeedingIntervention?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No students needing immediate intervention.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                          {roomAnalytics.studentsNeedingIntervention.map((student: any) => (
                            <div key={student.id} className="py-2.5 flex justify-between items-center">
                              <div>
                                <span className="font-extrabold text-slate-750 dark:text-slate-200 block">{student.name}</span>
                                <span className="text-[10px] text-slate-400">Roll No: {student.rollNumber}</span>
                              </div>
                              <span className="text-xs font-black text-rose-500 bg-rose-50 dark:bg-rose-955/20 px-2 py-0.5 rounded">
                                Progress: {student.progress}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ) : null}
            </div>
          )}

        </div>

        {/* Right Pane - Selected Resource Details & Discussions - Width 5/12 */}
        <div className="lg:col-span-5 space-y-6">
          
          {!activeResource ? (
            <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 min-h-[450px] flex flex-col justify-center items-center">
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-350">No Resource Selected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                Click on any learning resource card on the left to activate discussion threads and AI assistance.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-6">
              
              {/* Selected resource header */}
              <div className="pb-4 border-b border-slate-50 dark:border-slate-850">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                  activeResource.uploaderRole === 'teacher'
                    ? 'bg-brand-50 text-brand-655 dark:bg-brand-950/20'
                    : 'bg-teal-50 text-teal-605 dark:bg-teal-950/20'
                }`}>
                  {activeResource.uploaderRole} Upload
                </span>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-105 mt-2">
                  {activeResource.title}
                </h3>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 leading-relaxed">
                  {activeResource.description}
                </p>
                {activeResource.fileUrl && (
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); alert('Downloading mock file resource.'); }}
                    className="inline-flex items-center space-x-1 mt-3 text-[11px] font-bold text-brand-600 hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Download Resource Attachment</span>
                  </a>
                )}
              </div>

              {/* Discussion thread feed */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-455 uppercase tracking-wider">
                  Discussion Thread
                </h4>

                <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-1 divide-y divide-slate-50 dark:divide-slate-850">
                  {messages.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center">No comments or doubt threads posted. Start the conversation below!</p>
                  ) : (
                    messages.map((msg) => {
                      const isDoubtPost = msg.isDoubt;
                      const isReply = !!msg.parentId;
                      if (isReply) return null; // We'll render replies nested inside their parents

                      // Find replies for this comment
                      const msgReplies = messages.filter(r => r.parentId === msg._id);

                      return (
                        <div key={msg._id} className="pt-3.5 space-y-3">
                          
                          {/* Parent post */}
                          <div className={`p-3 rounded-xl border text-xs leading-relaxed space-y-2 relative ${
                            isDoubtPost
                              ? msg.status === 'peer_solved'
                                ? 'bg-emerald-50/25 border-emerald-150'
                                : msg.status === 'escalated'
                                ? 'bg-red-50/20 border-red-150'
                                : 'bg-amber-50/20 border-amber-150'
                              : 'bg-slate-50/30 border-slate-100 dark:border-slate-800'
                          }`}>
                            
                            {/* Author header */}
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-slate-750 dark:text-slate-200">
                                  {msg.userId?.name}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {msg.userRole === 'teacher' ? 'Faculty Member' : 'Student'}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1.5">
                                {isDoubtPost && (
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    msg.status === 'peer_solved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : msg.status === 'escalated'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    Doubt: {msg.status?.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Content */}
                            <p className="text-slate-655 dark:text-slate-350 whitespace-pre-line leading-relaxed">
                              {msg.content}
                            </p>

                            {/* Footer actions */}
                            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-2 text-[10px] font-bold text-slate-450">
                              <div className="flex items-center space-x-3.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpvote(msg._id)}
                                  className="hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  <span>{msg.upvotes?.length || 0} Upvotes</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyToId(msg._id);
                                    setIsDoubt(false);
                                    setNewMessage(`@${msg.userId?.name} `);
                                  }}
                                  className="hover:text-slate-705 dark:hover:text-slate-305"
                                >
                                  Reply
                                </button>
                              </div>

                              {isDoubtPost && (
                                <button
                                  type="button"
                                  onClick={() => openAIAssistant(msg)}
                                  className="text-brand-605 hover:underline flex items-center space-x-1"
                                >
                                  <Brain className="h-3.5 w-3.5" />
                                  <span>AI Learning Assistant</span>
                                </button>
                              )}
                            </div>

                          </div>

                          {/* Nested Replies */}
                          {msgReplies.length > 0 && (
                            <div className="pl-6 space-y-2 border-l border-slate-100 dark:border-slate-800">
                              {msgReplies.map(reply => (
                                <div key={reply._id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 text-xs">
                                  <div className="flex justify-between">
                                    <span className="font-extrabold text-slate-700 dark:text-slate-305">{reply.userId?.name}</span>
                                    {isTeacher && reply.userRole === 'student' && (
                                      <button
                                        type="button"
                                        onClick={() => handleAwardBonus(reply._id)}
                                        className="text-[9px] font-black text-brand-600 hover:underline flex items-center space-x-0.5"
                                      >
                                        <Award className="h-3 w-3" />
                                        <span>Award Bonus</span>
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-slate-505 dark:text-slate-400 mt-1 leading-relaxed">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* AI learning assistant Panel inline (opens when clicking doubt) */}
              {activeDoubtMsg && (
                <div className="border border-brand-100 bg-brand-50/15 p-5 rounded-2xl dark:bg-slate-900 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-100/30 pb-2">
                    <span className="text-xs font-black text-brand-850 dark:text-brand-400 flex items-center space-x-1.5">
                      <Brain className="h-4.5 w-4.5 animate-float" />
                      <span>AI Assistant: "{activeDoubtMsg.userId?.name}'s Doubt"</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveDoubtMsg(null)}
                      className="text-[10px] font-black text-slate-450 hover:text-slate-700"
                    >
                      Close Panel
                    </button>
                  </div>

                  {/* AI Tabs */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-white/60 rounded-xl dark:bg-slate-950">
                    {(['coach', 'referee', 'evaluator', 'escalation'] as const).map(tab => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setAiAssistantTab(tab)}
                        className={`py-1.5 text-[9px] font-black rounded-lg text-center capitalize transition-all ${
                          aiAssistantTab === tab
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* AI COACH */}
                  {aiAssistantTab === 'coach' && (
                    <div className="space-y-3.5 text-xs text-slate-655 dark:text-slate-350">
                      <p className="text-[11px] leading-relaxed italic text-slate-500">
                        AI Coach guides students with progressive hints, concepts, and examples without directly giving the complete answer.
                      </p>

                      {hints.length > 0 && (
                        <div className="space-y-2">
                          {hints.map((h, i) => (
                            <div key={i} className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 text-xs">
                              <strong className="text-amber-700 block">Hint #{i + 1}:</strong>
                              {h.hintContent}
                            </div>
                          ))}
                        </div>
                      )}

                      {hints.length < 3 ? (
                        <button
                          type="button"
                          onClick={handleRequestAIHint}
                          disabled={hintLoading}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-[10px] flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          {hintLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          <span>Request Clue Hint #{hints.length + 1}</span>
                        </button>
                      ) : (
                        <p className="text-amber-655 text-[10px] font-bold text-center">Max hints reached. Try analyzing the concept notes.</p>
                      )}
                    </div>
                  )}

                  {/* AI REFEREE */}
                  {aiAssistantTab === 'referee' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-[11px] leading-relaxed italic text-slate-500">
                        AI Referee reviews all responses inside the doubt thread and highlights the best solution.
                      </p>

                      {refereeLoading ? (
                        <div className="py-4 text-center text-slate-400 flex justify-center space-x-1.5">
                          <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                          <span>Comparing student solutions...</span>
                        </div>
                      ) : refereeData ? (
                        <div className="space-y-2 bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          {refereeData.bestAnswer ? (
                            <>
                              <strong className="text-brand-700 block dark:text-brand-400">Best Selection: {refereeData.bestAnswer.solverName}</strong>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-semibold italic">"{refereeData.bestAnswer.content}"</p>
                              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <strong>Rationale:</strong> {refereeData.winner || refereeData.comparison}
                              </div>
                            </>
                          ) : (
                            <p className="text-slate-400 italic">No answers matched comparison standards.</p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleTriggerAIReferee}
                          className="w-full bg-indigo-500 hover:bg-indigo-650 text-white font-bold py-2 rounded-lg text-[10px] flex items-center justify-center space-x-1.5 shadow-xs"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          <span>Execute AI Referee Comparison</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* AI EVALUATOR */}
                  {aiAssistantTab === 'evaluator' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-[11px] leading-relaxed italic text-slate-500">
                        Evaluates the correctness, clarity, and completeness of student replies.
                      </p>

                      {messages.filter(m => m.parentId === activeDoubtMsg._id).length === 0 ? (
                        <p className="text-slate-455 text-center py-4 italic">No solutions posted to grade yet.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <select
                              value={selectedEvaluationReplyId}
                              onChange={(e) => setSelectedEvaluationReplyId(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold focus:outline-none dark:bg-slate-850 dark:border-slate-800"
                            >
                              {messages.filter(m => m.parentId === activeDoubtMsg._id).map(r => (
                                <option key={r._id} value={r._id}>
                                  By {r.userId?.name} ({r.content.slice(0, 30)}...)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleTriggerAIEvaluate}
                              disabled={evaluatingMsgId === selectedEvaluationReplyId}
                              className="bg-brand-605 text-white font-bold px-4 py-2 rounded-lg text-[10px]"
                            >
                              {evaluatingMsgId === selectedEvaluationReplyId ? 'Evaluating...' : 'Evaluate'}
                            </button>
                          </div>

                          {evaluationResult && (
                            <div className="bg-white/70 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                              <div className="flex justify-between items-center">
                                <strong className="text-slate-700 dark:text-slate-350">Verdict: {evaluationResult.verdict}</strong>
                                <span className="font-extrabold text-brand-600">{evaluationResult.score}/100</span>
                              </div>
                              <div className="space-y-1.5">
                                <div>
                                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                    <span>Correctness</span>
                                    <span>{evaluationResult.correctness}%</span>
                                  </div>
                                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${evaluationResult.correctness}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex justify-between text-[8px] font-bold text-slate-400">
                                    <span>Clarity</span>
                                    <span>{evaluationResult.clarity}%</span>
                                  </div>
                                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-brand-500" style={{ width: `${evaluationResult.clarity}%` }} />
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] italic text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <strong>Feedback:</strong> {evaluationResult.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI ESCALATION */}
                  {aiAssistantTab === 'escalation' && (
                    <div className="space-y-3 text-xs">
                      <p className="text-[11px] leading-relaxed italic text-slate-500">
                        Escalates threads to the teacher queue if AI confidence becomes low or answers are contradictory.
                      </p>

                      {escalationData ? (
                        <div className="bg-white/70 p-3 rounded-xl border border-slate-100 text-slate-600">
                          <strong>Urgency Urgency Level: {escalationData.urgencyLevel?.toUpperCase()}</strong>
                          <p className="mt-1">{escalationData.reason || escalationData.suggestion}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleTriggerAIEscalate(false)}
                            disabled={escalating}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg text-[10px] flex items-center justify-center space-x-1.5"
                          >
                            <span>Analyze Escalation Criteria</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerAIEscalate(true)}
                            disabled={escalating}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg text-[10px] flex items-center justify-center space-x-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Escalate to Teacher Queue Now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handlePostMessage} className="border-t border-slate-50 dark:border-slate-850 pt-4 space-y-3">
                <div className="flex space-x-2 items-center justify-between text-xs">
                  {replyToId ? (
                    <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                      <span>Replying to comment</span>
                      <button type="button" onClick={() => setReplyToId(null)} className="text-red-500 font-extrabold">x</button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="checkbox"
                        id="isDoubt"
                        checked={isDoubt}
                        onChange={(e) => setIsDoubt(e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <label htmlFor="isDoubt" className="font-bold text-slate-500 select-none cursor-pointer">
                        Ask as Doubt (AI Enabled)
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder={isDoubt ? "Type your doubt query..." : replyToId ? "Type your solver explanation..." : "Type a classroom comment..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-xs font-semibold text-slate-805 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={msgLoading}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold p-3.5 rounded-xl flex items-center justify-center transition-all shadow-sm"
                  >
                    {msgLoading ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </form>

            </div>
          )}

        </div>

      </div>

      {/* Select Students Modal */}
      <SelectStudentsModal
        isOpen={selectStudentsOpen}
        onClose={() => setSelectStudentsOpen(false)}
        roomId={room?._id}
        roomName={room?.name}
        enrolledUserIds={members.filter(m => m.userId).map(m => m.userId._id)}
        onSuccess={() => fetchRoomData()}
      />

      {/* Add Manually Modal */}
      <AddManuallyModal
        isOpen={addManuallyOpen}
        onClose={() => setAddManuallyOpen(false)}
        roomId={room?._id}
        roomName={room?.name}
        onSuccess={() => fetchRoomData()}
      />

      {/* Confirmation Dialog Overlay */}
      {studentToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-105 dark:border-slate-850 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-black text-slate-850 dark:text-slate-100">Confirm Member Removal</h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              Remove <span className="text-slate-800 dark:text-slate-200 underline font-black">{studentToRemove.name}</span> from Focus Room?
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2 text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                className="px-5 py-2 text-[11px] font-black bg-red-650 text-white rounded-xl hover:bg-red-700 transition-all"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
