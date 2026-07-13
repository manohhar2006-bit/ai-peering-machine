import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  TrendingUp, 
  Users, 
  Award, 
  AlertCircle, 
  Brain, 
  Plus, 
  Loader2, 
  Sparkles,
  ChevronRight,
  HelpCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

interface StudentProgressData {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    section: string;
    batch: string;
    performanceLevel: 'excellent' | 'good' | 'average' | 'slow';
    isSlowLearner: boolean;
  };
  weekNumber: number;
  year: number;
  doubtsPosted: number;
  doubtsResolved: number;
  answersGiven: number;
  correctAnswers: number;
  hintsUsed: number;
  xpEarned: number;
  streakDays: number;
  performanceScore: number;
  improvementPercent: number;
  aiGeneratedReport: string;
}

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
}

export const StudentProgressOverview: React.FC = () => {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState<StudentProgressData[]>([]);
  const [focusRooms, setFocusRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState('current');

  // Modal States for Add to Focus Room
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [addingToRoom, setAddingToRoom] = useState(false);
  const [roomSuccess, setRoomSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [progressRes, roomsRes] = await Promise.all([
          axios.get(`${API_URL}/progress/all-students`, { headers }),
          axios.get(`${API_URL}/focus-room/my-rooms`, { headers })
        ]);

        setProgressData(progressRes.data || []);
        setFocusRooms(roomsRes.data || []);
      } catch (err) {
        console.error('Failed to load progress summary dashboard:', err);
        setError('Failed to retrieve progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToRoom = async (roomId: string) => {
    if (!selectedStudentId) return;
    setAddingToRoom(true);
    setRoomSuccess(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-room/${roomId}/add-students`,
        { studentIds: [selectedStudentId] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoomSuccess('Enrolled student successfully!');
      setTimeout(() => {
        setSelectedStudentId(null);
        setRoomSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add student to room:', err);
      alert('Could not enroll student in Focus Room. They might already be inside.');
    } finally {
      setAddingToRoom(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading progress comparisons...</p>
        </div>
      </div>
    );
  }

  // Sort progressData by performanceScore or xpEarned to calculate rank
  const rankedProgress = [...progressData].sort((a, b) => b.performanceScore - a.performanceScore);

  // Bar Chart Data: compare XP of students
  const barChartData = rankedProgress.map(p => ({
    name: p.student.name.split(' ')[0], // First name only for space
    XP: p.xpEarned
  }));

  // Pie Chart Data: distribution of performance levels
  const levelCounts = progressData.reduce(
    (acc, p) => {
      const level = p.student.performanceLevel || 'average';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    { excellent: 0, good: 0, average: 0, slow: 0 }
  );

  const pieChartData = [
    { name: 'Excellent', value: levelCounts.excellent, color: '#10B981' },
    { name: 'Good', value: levelCounts.good, color: '#3B82F6' },
    { name: 'Average', value: levelCounts.average, color: '#F59E0B' },
    { name: 'Slow Learner', value: levelCounts.slow, color: '#EF4444' }
  ].filter(d => d.value > 0);

  // Slow learners list
  const slowLearners = progressData.filter(p => p.student.isSlowLearner);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header card */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-800 via-indigo-650 to-indigo-500 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-350" />
              <span>Weekly Academic Insights & Leaderboard</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">Student Progress</h2>
            <p className="text-brand-100 text-sm leading-relaxed">
              Compare student activity performance, review peer resolved trends, diagnose levels, and deploy focus-remedial rooms for slow learners.
            </p>
          </div>
          
          {/* Week selector */}
          <div className="bg-white/10 rounded-xl p-1 border border-white/20">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-transparent text-white font-extrabold text-xs py-2 px-3 focus:outline-none cursor-pointer"
            >
              <option value="current" className="text-slate-800">Current Week</option>
              <option value="prev" className="text-slate-800">Previous Week</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs dark:bg-rose-955/20 dark:text-rose-455">
          {error}
        </div>
      )}

      {/* Progress Table section */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider">
          Weekly Progress Leaderboard Comparison
        </h3>

        <div className="overflow-x-auto border border-slate-50 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 font-extrabold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Rank</th>
                <th className="p-4">Name</th>
                <th className="p-4">Section</th>
                <th className="p-4">XP Earned</th>
                <th className="p-4">Doubts Posted</th>
                <th className="p-4">Answers (Accepted)</th>
                <th className="p-4">Hints Used</th>
                <th className="p-4">Score</th>
                <th className="p-4">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {rankedProgress.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 font-semibold">No progress data logged for this week.</td>
                </tr>
              ) : (
                rankedProgress.map((p, index) => {
                  const level = p.student.performanceLevel;
                  
                  // Row styling based on performance level
                  let rowStyle = '';
                  if (level === 'excellent') {
                    rowStyle = 'bg-emerald-50/15 text-emerald-850 dark:bg-emerald-950/5 dark:text-emerald-350';
                  } else if (level === 'slow') {
                    rowStyle = 'bg-rose-50/20 text-rose-800 dark:bg-rose-955/5 dark:text-rose-350';
                  } else if (level === 'average') {
                    rowStyle = 'bg-amber-50/10 text-amber-800 dark:bg-amber-955/5 dark:text-amber-350';
                  }

                  return (
                    <tr key={p.id} className={`hover:bg-slate-50/30 dark:hover:bg-slate-850/20 font-semibold ${rowStyle}`}>
                      <td className="p-4 font-black">
                        #{index + 1}
                      </td>
                      <td className="p-4">
                        <Link to={`/teacher/student/${p.student.id}`} className="font-extrabold hover:text-brand-605">
                          {p.student.name}
                        </Link>
                        <div className="text-[10px] text-slate-400">{p.student.rollNumber || 'No Roll'}</div>
                      </td>
                      <td className="p-4">{p.student.section || 'N/A'}</td>
                      <td className="p-4 font-bold">{p.xpEarned} XP</td>
                      <td className="p-4">{p.doubtsPosted} doubts</td>
                      <td className="p-4">{p.answersGiven} ({p.correctAnswers} accept)</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{p.hintsUsed} hints</td>
                      <td className="p-4 font-black text-slate-850 dark:text-slate-205">{p.performanceScore}</td>
                      <td className="p-4 font-extrabold text-emerald-555">
                        +{p.improvementPercent}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Bar chart comparing XP */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider">
            Weekly Student XP Comparison
          </h3>
          <div className="h-72 w-full text-slate-655">
            {barChartData.length === 0 ? (
              <p className="text-xs text-slate-400 py-24 text-center">No comparison data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800/60" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} fontWeight="bold" />
                  <YAxis stroke="#94A3B8" fontSize={9} fontWeight="bold" />
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
                  <Bar dataKey="XP" radius={[8, 8, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#6366F1' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Distribution Pie Chart */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider">
            Performance Level Distribution
          </h3>
          <div className="h-72 w-full flex items-center justify-center">
            {pieChartData.length === 0 ? (
              <p className="text-xs text-slate-400 py-24 text-center">No distribution data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
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
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Slow Learners Alerts Section */}
      <div className="bg-rose-50/10 dark:bg-rose-955/5 border border-rose-100/50 dark:border-rose-950/20 p-6 rounded-3xl space-y-4">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-455">
          <AlertCircle className="h-5 w-5" />
          <h3 className="text-base font-black uppercase tracking-wider">
            Priority Attention Required (Slow Learners)
          </h3>
        </div>

        {slowLearners.length === 0 ? (
          <div className="text-center py-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-2xl text-xs font-semibold text-slate-400">
            All students are currently performing at or above baseline. Awesome job!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {slowLearners.map(p => (
              <div 
                key={p.id}
                className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-205 text-sm">{p.student.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.student.rollNumber || 'No Roll'}</p>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-450 dark:text-slate-405 font-bold uppercase">Section: {p.student.section || 'N/A'}</span>
                    <span className="text-rose-500 font-extrabold">XP: {p.xpEarned}</span>
                  </div>

                  <div className="bg-rose-50/30 dark:bg-rose-955/10 p-2.5 rounded-xl border border-rose-100/20 text-[10px] font-semibold text-rose-800 dark:text-rose-350 leading-relaxed">
                    Student has used <strong className="text-rose-600 dark:text-rose-405 font-black">{p.hintsUsed}</strong> AI Coach hints and resolved <strong className="text-rose-600 dark:text-rose-455 font-black">{p.doubtsResolved}</strong> doubts.
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedStudentId(p.student.id)}
                    className="flex-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-[10px] py-2 transition-all dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850"
                  >
                    Add to Focus Room
                  </button>

                  <button
                    onClick={() => navigate(`/teacher/student/${p.student.id}`)}
                    className="flex-1 inline-flex items-center justify-center space-x-0.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 font-bold text-[10px] py-2 transition-all text-center"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setSelectedStudentId(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-405 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 mb-2">
              Add to Focus Room
            </h3>
            <p className="text-slate-450 text-xs mb-5 font-semibold">
              Enroll this student into a Focus Room to initiate concept remediation.
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
                    <ChevronRight className="h-4 w-4 text-slate-400" />
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
