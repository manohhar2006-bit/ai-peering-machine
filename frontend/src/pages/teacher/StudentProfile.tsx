import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Award, 
  BookOpen, 
  HelpCircle, 
  Clock, 
  Flame, 
  AlertTriangle, 
  Brain, 
  Plus, 
  Edit2, 
  Check, 
  Loader2, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const API_URL = 'http://localhost:5000/api';

interface StudentData {
  student: {
    _id: string;
    name: string;
    email: string;
    rollNumber: string;
    section: string;
    batch: string;
    department: string;
    performanceLevel: 'excellent' | 'good' | 'average' | 'slow';
    isSlowLearner: boolean;
    weakTopics: string[];
    createdAt: string;
  };
  stats: {
    totalDoubts: number;
    resolvedDoubts: number;
    totalAnswers: number;
    correctAnswers: number;
    hintsUsed: number;
    xp: number;
    streak: number;
    badges: Array<{ badgeId: string; earnedAt: string }>;
    performanceLevel: string;
  };
  weakTopics: string[];
  strongTopics: string[];
  recentDoubts: Array<{
    _id: string;
    title: string;
    topic: string;
    difficulty: string;
    status: string;
    createdAt: string;
  }>;
  weeklyProgress: Array<{
    weekNumber: number;
    year: number;
    xpEarned: number;
    doubtsPosted: number;
    doubtsResolved: number;
    correctAnswers: number;
  }>;
}

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
}

export const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<StudentData | null>(null);
  const [focusRooms, setFocusRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // AI report generation states
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');
  
  // Editing weak topics states
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [tempTopics, setTempTopics] = useState<string[]>([]);
  const [savingTopics, setSavingTopics] = useState(false);

  // Focus Room Assignment Modal States
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [addingToRoom, setAddingToRoom] = useState(false);
  const [roomSuccess, setRoomSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [profileRes, roomsRes] = await Promise.all([
          axios.get(`${API_URL}/allocation/student-profile/${studentId}`, { headers }),
          axios.get(`${API_URL}/focus-room/my-rooms`, { headers })
        ]);

        setData(profileRes.data);
        setFocusRooms(roomsRes.data || []);
        if (profileRes.data.student?.weakTopics) {
          setTempTopics(profileRes.data.student.weakTopics);
        }
        
        // Find latest weekly progress record for report
        const progress = profileRes.data.weeklyProgress;
        if (progress && progress.length > 0) {
          const latest = progress[progress.length - 1];
          if (latest.aiGeneratedReport) {
            setAiReport(latest.aiGeneratedReport);
          }
        }
      } catch (err) {
        console.error('Failed to retrieve student details:', err);
        setError('Could not retrieve student details.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [studentId]);

  const handleToggleSlowLearner = async () => {
    if (!data) return;
    const nextState = !data.student.isSlowLearner;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/allocation/mark-slow-learner`,
        { studentId: data.student._id, isSlowLearner: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          student: {
            ...prev.student,
            isSlowLearner: nextState
          }
        };
      });
    } catch (err) {
      console.error('Failed to toggle slow learner state:', err);
      alert('Could not update slow learner state.');
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/progress/generate-report/${studentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiReport(response.data.report || 'No report returned.');
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Could not generate progress report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicInput.trim() && !tempTopics.includes(topicInput.trim())) {
      setTempTopics([...tempTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setTempTopics(tempTopics.filter(t => t !== topic));
  };

  const handleSaveTopics = async () => {
    setSavingTopics(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/allocation/mark-slow-learner`,
        { studentId: studentId, weakTopics: tempTopics },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          student: {
            ...prev.student,
            weakTopics: tempTopics
          },
          weakTopics: tempTopics
        };
      });
      setIsEditingTopics(false);
    } catch (err) {
      console.error('Failed to save weak topics:', err);
      alert('Could not update weak topics.');
    } finally {
      setSavingTopics(false);
    }
  };

  const handleAddToRoom = async (roomId: string) => {
    if (!data) return;
    setAddingToRoom(true);
    setRoomSuccess(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-room/${roomId}/add-students`,
        { studentIds: [data.student._id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoomSuccess('Enrolled student successfully!');
      setTimeout(() => {
        setShowRoomModal(false);
        setRoomSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add student to room:', err);
      alert('Failed to enroll student. They might already be inside the room.');
    } finally {
      setAddingToRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-bold dark:bg-rose-955/20 dark:text-rose-400">
          {error || 'Student profile data not found.'}
        </div>
      </div>
    );
  }

  const { student, stats, recentDoubts, weeklyProgress, strongTopics, weakTopics } = data;

  // Initials for avatar
  const initials = student.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Performance badges formatting
  let performanceBadgeBg = 'bg-slate-100 text-slate-655 dark:bg-slate-900 dark:text-slate-400';
  if (student.performanceLevel === 'excellent') {
    performanceBadgeBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450';
  } else if (student.performanceLevel === 'good') {
    performanceBadgeBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-450';
  } else if (student.performanceLevel === 'average') {
    performanceBadgeBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450';
  } else if (student.performanceLevel === 'slow') {
    performanceBadgeBg = 'bg-rose-50 text-rose-605 dark:bg-rose-955/10 dark:text-rose-400';
  }

  // Map progress array for Recharts
  const chartData = weeklyProgress.length > 0 ? weeklyProgress.map(w => ({
    name: `W${w.weekNumber}`,
    XP: w.xpEarned,
    Doubts: w.doubtsPosted,
    Answers: w.correctAnswers
  })) : [
    { name: 'W1', XP: 0, Doubts: 0, Answers: 0 },
    { name: 'W2', XP: 40, Doubts: 1, Answers: 1 },
    { name: 'W3', XP: 120, Doubts: 3, Answers: 2 },
    { name: 'W4', XP: stats.xp, Doubts: stats.totalDoubts, Answers: stats.correctAnswers }
  ];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Back to Mentored Students */}
      <div className="flex items-center space-x-3">
        <Link 
          to="/teacher/my-students" 
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 text-slate-555 hover:text-slate-700 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-405 dark:hover:text-slate-200 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">Student Profile</h2>
          <p className="text-slate-450 text-xs font-semibold">Granular analytics and customized mentorship dashboard</p>
        </div>
      </div>

      {/* Top Profile Header Card */}
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-805 p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xl md:text-2xl font-black shadow-premium">
            {initials}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100">{student.name}</h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${performanceBadgeBg}`}>
                {student.performanceLevel}
              </span>
              {student.isSlowLearner && (
                <span className="bg-rose-100 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Slow Learner</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Roll No: <span className="text-slate-700 dark:text-slate-350">{student.rollNumber || 'N/A'}</span>
            </p>
            <p className="text-xs text-slate-450 font-semibold">
              Section: <strong className="text-slate-700 dark:text-slate-300">{student.section || 'N/A'}</strong> | Batch: <strong className="text-slate-700 dark:text-slate-300">{student.batch || 'N/A'}</strong> | Dept: <strong className="text-slate-700 dark:text-slate-300">{student.department || 'Computer Science'}</strong>
            </p>
          </div>
        </div>

        {/* Action Toggle buttons */}
        <div className="flex flex-wrap gap-3 self-stretch md:self-auto">
          <button
            onClick={handleToggleSlowLearner}
            className={`flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 rounded-xl px-5 py-3 text-xs font-black transition-all border ${
              student.isSlowLearner
                ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-955/20 dark:border-rose-950/20 dark:text-rose-400'
                : 'bg-slate-50 border-slate-200 text-slate-655 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-850'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{student.isSlowLearner ? 'Slow Learner Marked' : 'Mark Slow Learner'}</span>
          </button>

          <button
            onClick={() => setShowRoomModal(true)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-3 text-xs font-black text-white transition-all shadow-md transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add to Focus Room</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <HelpCircle className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Doubts</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.totalDoubts}</h4>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <BookOpen className="h-5 w-5 text-brand-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Resolved</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.resolvedDoubts}</h4>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <Check className="h-5 w-5 text-emerald-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Accepted Ans</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.correctAnswers}</h4>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <Award className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Total XP</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.xp}</h4>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <Brain className="h-5 w-5 text-violet-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Hints Used</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.hintsUsed}</h4>
        </div>
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 border border-slate-100 dark:border-slate-805 text-center shadow-sm">
          <Flame className="h-5 w-5 text-rose-500 mx-auto mb-1.5" />
          <p className="text-[10px] font-extrabold text-slate-405 dark:text-slate-500 uppercase tracking-wider">Streak</p>
          <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{stats.streak} days</h4>
        </div>
      </div>

      {/* Weak & Strong Topics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
              <Brain className="h-4.5 w-4.5 text-rose-500" />
              <span>Weak Topics (Needs Intervention)</span>
            </h3>
            
            <button
              onClick={() => setIsEditingTopics(!isEditingTopics)}
              className="text-brand-605 font-extrabold text-xs inline-flex items-center space-x-1"
            >
              {isEditingTopics ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </>
              )}
            </button>
          </div>

          {isEditingTopics ? (
            <div className="space-y-4">
              <form onSubmit={handleAddTopic} className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Type topic name (e.g. Recursion)..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
                />
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-3 text-xs font-bold"
                >
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {tempTopics.map((topic, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center space-x-1 bg-rose-50/50 text-rose-600 border border-rose-100 dark:bg-rose-955/10 dark:text-rose-400 dark:border-rose-950/20 px-2.5 py-1 rounded-lg text-xs font-bold"
                  >
                    <span>{topic}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(topic)}
                      className="text-rose-400 hover:text-rose-605 font-bold"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempTopics(student.weakTopics || []);
                    setIsEditingTopics(false);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingTopics}
                  onClick={handleSaveTopics}
                  className="px-4 py-2 bg-brand-605 text-white rounded-xl text-xs font-bold hover:bg-brand-700"
                >
                  {savingTopics ? 'Saving...' : 'Save Topics'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 min-h-[4rem]">
              {weakTopics.length === 0 ? (
                <p className="text-slate-400 text-xs font-semibold leading-relaxed">No weak topics diagnosed yet.</p>
              ) : (
                weakTopics.map((topic, idx) => (
                  <span 
                    key={idx}
                    className="bg-rose-50/50 text-rose-600 border border-rose-100/50 dark:bg-rose-955/10 dark:text-rose-455 dark:border-rose-950/20 px-2.5 py-1 rounded-lg text-xs font-bold"
                  >
                    {topic}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Strong Topics */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-1.5">
            <Check className="h-4.5 w-4.5 text-emerald-500" />
            <span>Strong Topics (Accomplished)</span>
          </h3>

          <div className="flex flex-wrap gap-1.5 min-h-[4rem]">
            {strongTopics.length === 0 ? (
              <p className="text-slate-400 text-xs font-semibold leading-relaxed">No strong topics logged yet. Complete more resolved answers to unlock strong topic tags.</p>
            ) : (
              strongTopics.map((topic, idx) => (
                <span 
                  key={idx}
                  className="bg-emerald-50 text-emerald-650 border border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-950/30 px-2.5 py-1 rounded-lg text-xs font-bold"
                >
                  {topic}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
          Weekly Performance Chart (Last 6 Weeks)
        </h3>
        
        <div className="h-72 w-full text-slate-655 dark:text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} fontWeight="bold" />
              <YAxis stroke="#94A3B8" fontSize={10} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1E293B', 
                  borderRadius: '12px', 
                  border: 'none', 
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }} 
              />
              <Line type="monotone" dataKey="XP" stroke="#6366F1" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
              <Line type="monotone" dataKey="Doubts" stroke="#F43F5E" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Answers" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column details: Doubts list & AI Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Recent Doubts */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
            Recent Doubts Log
          </h3>

          {recentDoubts.length === 0 ? (
            <p className="text-slate-400 text-xs font-semibold py-8 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
              Student has not posted any doubts yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800 border border-slate-50 dark:border-slate-800 rounded-2xl overflow-hidden">
              {recentDoubts.map((doubt) => {
                let statusColor = 'text-amber-500';
                if (doubt.status === 'peer_solved' || doubt.status === 'teacher_solved') {
                  statusColor = 'text-emerald-500';
                } else if (doubt.status === 'escalated') {
                  statusColor = 'text-red-500';
                }
                return (
                  <div key={doubt._id} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 flex justify-between items-center text-xs font-semibold">
                    <div className="space-y-0.5 max-w-[70%]">
                      <Link to={`/doubt/${doubt._id}`} className="font-bold text-slate-800 dark:text-slate-200 hover:text-brand-605 line-clamp-1">
                        {doubt.title}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{doubt.topic} • {doubt.difficulty}</p>
                    </div>
                    <span className={`capitalize font-black text-[10px] tracking-wider ${statusColor}`}>
                      {doubt.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: AI Progress Report */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="h-4.5 w-4.5 text-brand-605 fill-brand-605" />
              <span>AI Weekly Progress Report</span>
            </h3>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="text-brand-605 font-black text-xs inline-flex items-center space-x-1 hover:underline disabled:text-slate-400"
            >
              {generatingReport ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>

          {aiReport ? (
            <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/20 dark:from-slate-900/60 dark:to-slate-950 p-5 rounded-2xl border border-indigo-100/30 dark:border-slate-800 relative">
              <p className="text-xs leading-relaxed text-slate-655 dark:text-slate-350 font-semibold whitespace-pre-wrap">
                {aiReport}
              </p>
              <div className="mt-4 flex items-center space-x-1.5 text-[9px] font-black text-brand-505 dark:text-brand-405 uppercase tracking-wider">
                <Brain className="h-3.5 w-3.5" />
                <span>Gemini Analysis Complete</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed border-indigo-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20 rounded-2xl space-y-3">
              <Brain className="h-10 w-10 text-indigo-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Weekly Report Found</h4>
              <p className="text-[11px] text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
                Analyze student XP counts, doubt responses, and hints utilization with one click.
              </p>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="inline-flex items-center space-x-1 rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all"
              >
                {generatingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                <span>Generate First Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Focus Room Assignment Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setShowRoomModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-405 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
              Add to Focus Room
            </h3>
            <p className="text-slate-400 text-xs mb-5 font-semibold">
              Enroll <strong className="text-slate-655 dark:text-slate-350">{student.name}</strong> into a collaborative Focus Room to initiate concept remediation.
            </p>

            {roomSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-center text-xs font-bold dark:bg-emerald-955/20 dark:text-emerald-450 dark:border-emerald-900/35">
                {roomSuccess}
              </div>
            ) : focusRooms.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-205 dark:border-slate-800 rounded-2xl space-y-4">
                <p className="text-slate-400 text-xs font-semibold">You haven't created any Focus Rooms yet.</p>
                <Link
                  to="/focus-rooms/create"
                  className="inline-flex items-center space-x-1 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Focus Room</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {focusRooms.map((room) => (
                  <button
                    key={room._id}
                    disabled={addingToRoom}
                    onClick={() => handleAddToRoom(room._id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/10 dark:border-slate-800 dark:hover:border-slate-700 transition-all text-left text-xs font-bold"
                  >
                    <div>
                      <h4 className="text-slate-700 dark:text-slate-205 line-clamp-1">{room.name}</h4>
                      <p className="text-[10px] text-slate-405 font-semibold uppercase mt-0.5">Topic: {room.topic || 'General'}</p>
                    </div>
                    <Check className="h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
