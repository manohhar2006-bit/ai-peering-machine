import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Activity,
  Award,
  Clock,
  AlertTriangle,
  TrendingDown,
  ChevronRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const API_URL = 'http://localhost:5000/api';

export const TeacherDashboard: React.FC = () => {
  const { isDark } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const response = await axios.get(`${API_URL}/analytics/teacher`);
        setData(response.data);
      } catch (err) {
        console.error('Failed to retrieve teacher analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Loading faculty workload metrics...</p>
        </div>
      </div>
    );
  }

  const { metrics, subjectStats, weakTopics, timelineData } = data;

  const pieData = [
    { name: 'Peer Solved', value: metrics.peerSolvedPercentage, color: '#10b981' },
    { name: 'Teacher Escalate', value: 100 - metrics.peerSolvedPercentage, color: '#f43f5e' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Faculty Workload Control Center</h2>
          <p className="text-sm text-slate-400 font-sans">
            AI-orchestrated peer resolver analytics. Shifting repetitive loops to student-assisted groups.
          </p>
        </div>
        <Link
          to="/teacher/escalations"
          className="flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-premium transition-all"
        >
          <AlertTriangle className="h-4.5 w-4.5" />
          <span>View Escalation Queue ({metrics.escalatedDoubts})</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Time Saved</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-500 dark:bg-teal-950/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-105">{metrics.hoursSaved} Hours</div>
            <p className="text-xs text-emerald-500 font-semibold mt-1 flex items-center space-x-1">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Reduced faculty answering load</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peer Resolution Rate</span>
            <div className="p-2 rounded-lg bg-emerald-55/10 text-emerald-500 dark:bg-emerald-950/20">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-105">{metrics.peerSolvedPercentage}%</div>
            <p className="text-xs text-slate-400 mt-1">Doubts fully resolved by peer solvers</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Doubt Traffic</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800 dark:text-slate-105">{metrics.totalDoubts}</div>
            <p className="text-xs text-slate-400 mt-1">Total posted queries</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty Escalated</span>
            <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-red-600 dark:text-red-500">{metrics.escalatedDoubts}</div>
            <p className="text-xs text-slate-400 mt-1">Awaiting teacher moderation</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Trend Area Chart */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Workload Mitigation Trend (Weekly)</h3>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPeer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEsc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} />
                <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? "#1E293B" : "#ffffff", 
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    color: isDark ? "#f1f5f9" : "#0f172a" 
                  }} 
                />
                <Area type="monotone" dataKey="peerSolved" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPeer)" name="Peer Resolved" />
                <Area type="monotone" dataKey="escalated" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorEsc)" name="Escalated" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Resolution Pie Chart */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-855 flex flex-col items-center justify-center space-y-4">
          <h3 className="text-base font-bold text-slate-805 self-start dark:text-slate-100">Answering Duty Share</h3>
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value}%`}
                  contentStyle={{ 
                    backgroundColor: isDark ? "#1E293B" : "#ffffff", 
                    borderColor: isDark ? "#334155" : "#e2e8f0",
                    color: isDark ? "#f1f5f9" : "#0f172a" 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{metrics.peerSolvedPercentage}%</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Peer Solved</span>
            </div>
          </div>

          <div className="flex space-x-6 text-xs font-semibold">
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">Peer Solved ({metrics.peerSolvedPercentage}%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">Faculty Escalate ({100 - metrics.peerSolvedPercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weak Topics / Misconceptions Analysis & Subject Stats */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Misconception Tracker */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-50 dark:border-slate-800">
            <BrainCircuit className="h-5 w-5 text-brand-600" />
            <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Misconception patterns (Weak Topics)</h3>
          </div>
          {weakTopics.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No misconception clusters detected yet.</p>
          ) : (
            <div className="space-y-4">
              {weakTopics.map((topic: any, idx: number) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-200">
                      {topic.topic} <span className="text-[10px] text-slate-400 font-normal">({topic.subjectCode})</span>
                    </span>
                    <span className="text-red-500">{topic.escalatedDoubts} Escalations</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-450">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden dark:bg-slate-800">
                      <div className="bg-red-400 h-full rounded-full" style={{ width: `${Math.round((topic.escalatedDoubts / topic.totalDoubts) * 100)}%` }} />
                    </div>
                    <span className="flex-shrink-0 font-semibold">{topic.totalDoubts} total doubts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject-wise traffic list */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 space-y-4">
          <h3 className="text-base font-bold text-slate-805 mb-2 pb-2 border-b border-slate-50 dark:text-slate-100 dark:border-slate-800">
            Subject-wise Performance
          </h3>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {subjectStats.map((stat: any, index: number) => (
              <div key={index} className="flex justify-between items-center py-3">
                <div>
                  <span className="font-extrabold text-sm text-slate-700 dark:text-slate-205">{stat.subjectName}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">{stat.subjectCode}</span>
                </div>
                <div className="text-right">
                  <div className="font-black text-sm text-slate-800 dark:text-slate-105">{stat.total} Doubts</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stat.solved} Resolved</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
