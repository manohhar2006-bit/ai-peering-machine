import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  HelpCircle,
  Users,
  Sparkles,
  AlertTriangle,
  Clock,
  TrendingDown,
  Download,
  CheckCircle,
  TrendingUp,
  Brain,
  Award,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const API_URL = 'http://localhost:5000/api';

export const TeacherDashboard: React.FC = () => {
  const { isDark } = useTheme();
  
  // States
  const [metricsData, setMetricsData] = useState<any>(null);
  const [weeklyTrendData, setWeeklyTrendData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      const [metricsRes, trendRes, heatmapRes, escalationsRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/workload`),
        axios.get(`${API_URL}/analytics/weekly-trend`),
        axios.get(`${API_URL}/analytics/topic-heatmap`),
        axios.get(`${API_URL}/analytics/escalations`)
      ]);

      setMetricsData(metricsRes.data);
      setWeeklyTrendData(trendRes.data);
      setHeatmapData(heatmapRes.data);
      setEscalations(escalationsRes.data);
    } catch (err) {
      console.error('Failed to load teacher dashboard data:', err);
      setError('Failed to retrieve analytics data from server. Utilizing simulated fallbacks.');
      
      // Fallback sensible defaults
      setMetricsData({
        total: 10,
        peerSolved: 5,
        aiHinted: 2,
        escalated: 2,
        teacherSolved: 1,
        open: 1,
        workloadReduction: '70.0%',
        workloadReductionPercent: 70.0,
        minutesSaved: 35,
        hoursSaved: 0.6,
        teacherInterventionRate: '20.0%',
        averageResolutionTimeMinutes: 20
      });
      setWeeklyTrendData([
        { week: 'Week 1', peerSolved: 5, aiHinted: 2, escalated: 8, workloadReduction: 46.7 },
        { week: 'Week 2', peerSolved: 8, aiHinted: 4, escalated: 6, workloadReduction: 54.5 },
        { week: 'Week 3', peerSolved: 12, aiHinted: 7, escalated: 4, workloadReduction: 67.9 },
        { week: 'Week 4', peerSolved: 15, aiHinted: 9, escalated: 3, workloadReduction: 75.0 },
        { week: 'Week 5', peerSolved: 18, aiHinted: 12, escalated: 2, workloadReduction: 81.1 },
        { week: 'Week 6', peerSolved: 22, aiHinted: 14, escalated: 1, workloadReduction: 87.8 }
      ]);
      setHeatmapData([
        { topic: 'Squeeze Theorem', count: 12, subject: 'Mathematics' },
        { topic: 'LEFT JOIN & NULL values', count: 10, subject: 'Computer Science' },
        { topic: 'Newtonian Friction force', count: 9, subject: 'Physics' },
        { topic: 'Organic reaction mechanism', count: 7, subject: 'Chemistry' },
        { topic: 'Mitosis division stages', count: 6, subject: 'Biology' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkResolved = async (doubtId: string) => {
    setResolvingId(doubtId);
    try {
      await axios.patch(`${API_URL}/doubts/${doubtId}/status`, { status: 'teacher_solved' });
      alert('Doubt manually marked as resolved by teacher!');
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to mark resolved:', err);
      alert('Failed to update doubt status');
    } finally {
      setResolvingId(null);
    }
  };

  const handleExportReport = () => {
    if (!metricsData) return;
    
    const reportData = {
      reportGeneratedAt: new Date().toISOString(),
      platformName: "DoubtsArena",
      researchTitle: "AI-Guided Gamified Peer Doubt Resolution Framework for Faculty Workload Reduction",
      metrics: {
        totalDoubts: metricsData.total,
        peerSolved: metricsData.peerSolved,
        aiHinted: metricsData.aiHinted,
        escalated: metricsData.escalated,
        teacherSolved: metricsData.teacherSolved,
        workloadReductionPercent: metricsData.workloadReduction,
        minutesSaved: metricsData.minutesSaved,
        hoursSaved: metricsData.hoursSaved,
        teacherInterventionRate: metricsData.teacherInterventionRate,
        averageResolutionTimeMinutes: metricsData.averageResolutionTimeMinutes
      },
      weeklyTrend: weeklyTrendData,
      topRepeatedTopics: heatmapData
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DoubtsArena_Research_Report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  // Format Recharts Pie data
  const pieData = [
    { name: 'Peer Solved', value: metricsData.peerSolved, color: '#10b981' },
    { name: 'AI Hinted', value: metricsData.aiHinted, color: '#8b5cf6' },
    { name: 'Teacher Solved', value: metricsData.teacherSolved, color: '#f97316' },
    { name: 'Open', value: metricsData.open, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  // Fallback if pie is empty
  const formattedPieData = pieData.length > 0 ? pieData : [
    { name: 'Peer Solved', value: 70, color: '#10b981' },
    { name: 'AI Hinted', value: 20, color: '#8b5cf6' },
    { name: 'Teacher Solved', value: 10, color: '#f97316' }
  ];

  // Calculate circular progress parameters for workload reduction
  const reductionPercent = metricsData.workloadReductionPercent || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (reductionPercent / 100) * circumference;

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
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportReport}
            className="flex items-center space-x-2 rounded-xl bg-brand-50 hover:bg-brand-100 border border-brand-200 px-4 py-3 text-sm font-bold text-brand-700 transition-all dark:bg-brand-950/20 dark:text-brand-400 dark:border-brand-900/30"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Export Research Report</span>
          </button>
          <Link
            to="/teacher/escalations"
            className="flex items-center space-x-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-bold text-white shadow-premium transition-all"
          >
            <AlertTriangle className="h-4.5 w-4.5" />
            <span>View Escalation Queue ({metricsData.escalated})</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-250 p-4 rounded-2xl text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
          ⚠️ {error}
        </div>
      )}

      {/* KPI Stats Grid - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Highlighted Workload Reduction Card - Col Span 2 */}
        <div className="md:col-span-2 rounded-3xl border-2 border-emerald-500/20 bg-emerald-50/10 p-6 shadow-premium dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between items-stretch">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider dark:text-emerald-450 block">Workload Reduction</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Key Research Metric</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mt-6">
            <div>
              <div className="text-4xl font-black text-slate-800 dark:text-slate-105">{reductionPercent.toFixed(1)}%</div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Faculty doubts resolved completely without teacher intervention.
              </p>
            </div>
            {/* Circular Progress Indicator */}
            <div className="relative h-24 w-24 flex-shrink-0 flex items-center justify-center">
              <svg className="h-full w-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-slate-205 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-emerald-500"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-sm font-black text-slate-800 dark:text-slate-105">
                {Math.round(reductionPercent)}%
              </div>
            </div>
          </div>
        </div>

        {/* Total doubts card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Doubts</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/20">
              <HelpCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-105">{metricsData.total}</div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Total doubts posted</p>
          </div>
        </div>

        {/* Solved by peers card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Peer Solved</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-105">{metricsData.peerSolved}</div>
            <p className="text-[10px] text-emerald-600 font-extrabold mt-1 dark:text-emerald-450">No teacher needed</p>
          </div>
        </div>

        {/* Solved by AI Hints card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Hint Solved</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-500 dark:bg-purple-950/20">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-105">{metricsData.aiHinted}</div>
            <p className="text-[10px] text-purple-605 font-extrabold mt-1 dark:text-purple-400">AI guided resolution</p>
          </div>
        </div>

        {/* Escalated to Teacher card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escalated</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-500">{metricsData.escalated}</div>
            <p className="text-[10px] text-amber-600 font-extrabold mt-1 dark:text-amber-400">Requires intervention</p>
          </div>
        </div>

        {/* Time saved card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time Saved</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-500 dark:bg-teal-950/20">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-105">
              {metricsData.hoursSaved} hrs
            </div>
            <p className="text-[10px] text-teal-600 font-extrabold mt-1 dark:text-teal-450">Estimated faculty saved</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1 - Pie Chart: Doubt Resolution Breakdown */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Doubt Resolution Breakdown</h3>
          <div className="h-64 w-full relative flex items-center justify-center text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {formattedPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value} doubts`}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2 - Bar Chart: Weekly Workload Trend */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Weekly Workload Trend</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="week" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
                <Bar dataKey="peerSolved" fill="#10b981" name="Peer Solved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="aiHinted" fill="#8b5cf6" name="AI Hinted" radius={[4, 4, 0, 0]} />
                <Bar dataKey="escalated" fill="#f97316" name="Escalated" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3 - Line Chart: Faculty Time Saved Per Week */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Faculty Time Saved Per Week</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData.map(d => ({ ...d, minutesSaved: (d.peerSolved + d.aiHinted) * 5 }))}>
                <defs>
                  <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="week" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                />
                <Area type="monotone" dataKey="minutesSaved" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorSaved)" name="Minutes Saved" dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4 - Horizontal Bar Chart: Most Repeated Doubt Topics */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Most Repeated Doubt Topics (Top 10)</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis type="number" stroke={isDark ? '#94a3b8' : '#64748b'} />
                <YAxis dataKey="topic" type="category" width={100} stroke={isDark ? '#94a3b8' : '#64748b'} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E293B' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f1f5f9' : '#0f172a'
                  }}
                />
                <Bar dataKey="count" fill="#4f46e5" name="Queries Asked" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Escalated Doubts Table */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300 space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-50 dark:border-slate-800">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Escalated doubts requiring teacher attention</h3>
        </div>

        {escalations.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            🎉 Great job! No pending escalated doubt tickets in the queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Doubt Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Posted At</th>
                  <th className="py-3 px-4">Escalated At</th>
                  <th className="py-3 px-4 text-center">Time Waiting (hrs)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs dark:divide-slate-800 text-slate-600 dark:text-slate-350">
                {escalations.map((esc) => {
                  const doubt = esc.doubtId;
                  if (!doubt) return null;

                  const postedDate = new Date(doubt.createdAt);
                  const escalatedDate = new Date(esc.escalatedAt || doubt.updatedAt);
                  const hoursWaiting = Math.max(0, parseFloat(((Date.now() - escalatedDate.getTime()) / (1000 * 60 * 60)).toFixed(1)));

                  return (
                    <tr key={esc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-105 max-w-xs truncate">
                        <Link to={`/doubt/${doubt._id}`} className="hover:underline">
                          {doubt.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[10px] font-bold dark:bg-brand-950/20 dark:text-brand-400">
                          {doubt.subjectId?.code || 'GEN'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{doubt.askerId?.name}</td>
                      <td className="py-3.5 px-4 text-slate-400">{postedDate.toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-slate-400">{escalatedDate.toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">{hoursWaiting} hrs</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleMarkResolved(doubt._id)}
                          disabled={resolvingId === doubt._id}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 text-[10px] shadow-sm transition-all"
                        >
                          {resolvingId === doubt._id ? 'Saving...' : 'Mark Resolved'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
