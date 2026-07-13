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
  BookOpen,
  Plus,
  UserCheck,
  Activity,
  Zap,
  Settings,
  Save,
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

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

  // Global settings states
  const [globalAllowCommunity, setGlobalAllowCommunity] = useState(true);
  const [globalHideUntilFirst, setGlobalHideUntilFirst] = useState(true);
  const [globalAllowUnlimited, setGlobalAllowUnlimited] = useState(true);
  const [globalMaxAttempts, setGlobalMaxAttempts] = useState<number | string>('');
  const [globalAllowEditing, setGlobalAllowEditing] = useState(true);
  const [globalAiHintLevels, setGlobalAiHintLevels] = useState('three-levels');
  const [globalEscalationRules, setGlobalEscalationRules] = useState('auto-escalate');
  
  // XP Reward configs
  const [askerXP, setAskerXP] = useState(25);
  const [solverXP, setSolverXP] = useState(100);
  const [bonusXP, setBonusXP] = useState(50);
  const [verificationXP, setVerificationXP] = useState(100);
  const [streakMultiplier, setStreakMultiplier] = useState(1.5);
  
  // Coin Reward configs
  const [askerCoins, setAskerCoins] = useState(10);
  const [solverCoins, setSolverCoins] = useState(40);
  const [bonusCoins, setBonusCoins] = useState(20);
  const [verificationCoins, setVerificationCoins] = useState(40);

  const [savingGlobalSettings, setSavingGlobalSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // New allocation states
  const [studentCount, setStudentCount] = useState(0);
  const [slowLearnersCount, setSlowLearnersCount] = useState(0);
  const [activeRoomsCount, setActiveRoomsCount] = useState(0);
  const [strugglingStudents, setStrugglingStudents] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      const [metricsRes, trendRes, heatmapRes, escalationsRes, studentsRes, roomsRes] = await Promise.all([
        axios.get(`${API_URL}/analytics/workload`),
        axios.get(`${API_URL}/analytics/weekly-trend`),
        axios.get(`${API_URL}/analytics/topic-heatmap`),
        axios.get(`${API_URL}/analytics/escalations`),
        axios.get(`${API_URL}/allocation/my-students`),
        axios.get(`${API_URL}/focus-room/my-rooms`)
      ]);

      setMetricsData(metricsRes.data);
      setWeeklyTrendData(trendRes.data);
      setHeatmapData(heatmapRes.data);
      setEscalations(escalationsRes.data);

      const students = studentsRes.data.students || [];
      setStudentCount(students.length);
      const slowList = students.filter((s: any) => s.isSlowLearner);
      setSlowLearnersCount(slowList.length);
      setStrugglingStudents(slowList.slice(0, 3));

      const rooms = roomsRes.data || [];
      setActiveRoomsCount(rooms.filter((r: any) => r.isActive).length);
    } catch (err) {
      console.error('Failed to load teacher dashboard data:', err);
      setError('Failed to retrieve analytics data from server.');
      
      setMetricsData({
        total: 0,
        peerSolved: 0,
        aiHinted: 0,
        escalated: 0,
        teacherSolved: 0,
        open: 0,
        workloadReduction: '0.0%',
        workloadReductionPercent: 0.0,
        minutesSaved: 0,
        hoursSaved: 0,
        teacherInterventionRate: '0.0%',
        averageResolutionTimeMinutes: 0
      });
      setWeeklyTrendData([]);
      setHeatmapData([]);
      setEscalations([]);
      setStudentCount(0);
      setSlowLearnersCount(0);
      setStrugglingStudents([]);
      setActiveRoomsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/teacher/global-settings`);
      const s = response.data;
      setGlobalAllowCommunity(s.allowCommunitySolutions);
      setGlobalHideUntilFirst(s.hideCommunitySolutionsUntilFirstAttempt);
      setGlobalAllowUnlimited(s.allowUnlimitedAttempts);
      setGlobalMaxAttempts(s.maxAttempts ?? '');
      setGlobalAllowEditing(s.allowAnswerEditing);
      setGlobalAiHintLevels(s.aiHintLevels || 'three-levels');
      setGlobalEscalationRules(s.escalationRules || 'auto-escalate');
      
      if (s.xpRewardConfig) {
        setAskerXP(s.xpRewardConfig.askerXP);
        setSolverXP(s.xpRewardConfig.solverXP);
        setBonusXP(s.xpRewardConfig.bonusXP);
        setVerificationXP(s.xpRewardConfig.verificationXP);
        setStreakMultiplier(s.xpRewardConfig.streakMultiplier);
      }
      
      if (s.coinRewardConfig) {
        setAskerCoins(s.coinRewardConfig.askerCoins);
        setSolverCoins(s.coinRewardConfig.solverCoins);
        setBonusCoins(s.coinRewardConfig.bonusCoins);
        setVerificationCoins(s.coinRewardConfig.verificationCoins);
      }
    } catch (err) {
      console.error('Failed to load global settings:', err);
    }
  };

  const handleSaveGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobalSettings(true);
    setSettingsSavedSuccess(false);
    try {
      await axios.post(`${API_URL}/teacher/global-settings`, {
        allowCommunitySolutions: globalAllowCommunity,
        hideCommunitySolutionsUntilFirstAttempt: globalHideUntilFirst,
        allowUnlimitedAttempts: globalAllowUnlimited,
        maxAttempts: globalMaxAttempts === '' ? null : Number(globalMaxAttempts),
        allowAnswerEditing: globalAllowEditing,
        aiHintLevels: globalAiHintLevels,
        escalationRules: globalEscalationRules,
        xpRewardConfig: {
          askerXP,
          solverXP,
          bonusXP,
          verificationXP,
          streakMultiplier
        },
        coinRewardConfig: {
          askerCoins,
          solverCoins,
          bonusCoins,
          verificationCoins
        }
      });
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save global configurations');
    } finally {
      setSavingGlobalSettings(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchGlobalSettings();
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
  const formattedPieData = pieData;

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

      {/* Redesigned Animated 8 KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Students */}
        <Link
          to="/teacher/my-students"
          className="group relative p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-blue-450 dark:hover:border-blue-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Students</span>
            <div className="p-2.5 bg-blue-50 text-blue-505 dark:bg-blue-950/20 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <Users className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{studentCount}</h3>
            <p className="text-[10px] text-blue-505 font-bold group-hover:underline mt-1">View mentored list</p>
          </div>
        </Link>

        {/* Card 2: Active Focus Rooms */}
        <Link
          to="/teacher/focus-rooms"
          className="group relative p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-indigo-450 dark:hover:border-indigo-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Rooms</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-505 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{activeRoomsCount}</h3>
            <p className="text-[10px] text-indigo-505 font-bold group-hover:underline mt-1">Remedial focus groups</p>
          </div>
        </Link>

        {/* Card 3: Total Doubts */}
        <div className="group p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-violet-450 dark:hover:border-violet-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Doubts</span>
            <div className="p-2.5 bg-violet-50 text-violet-500 dark:bg-violet-950/20 dark:text-violet-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <HelpCircle className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{metricsData.total}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1">Total doubts posted</p>
          </div>
        </div>

        {/* Card 4: Doubts Solved by Students */}
        <div className="group p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-emerald-450 dark:hover:border-emerald-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Peer Solved</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-450 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-450">{metricsData.peerSolved}</h3>
            <p className="text-[10px] text-emerald-505 dark:text-emerald-400 font-extrabold mt-1">Solved by peer students</p>
          </div>
        </div>

        {/* Card 5: AI Assisted Doubts */}
        <div className="group p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-purple-450 dark:hover:border-purple-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Assisted</span>
            <div className="p-2.5 bg-purple-50 text-purple-505 dark:bg-purple-950/20 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{metricsData.aiHinted}</h3>
            <p className="text-[10px] text-purple-605 dark:text-purple-400 font-extrabold mt-1">AI hint guided doubts</p>
          </div>
        </div>

        {/* Card 6: Teacher Interventions */}
        <div className="group p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-orange-450 dark:hover:border-orange-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Interventions</span>
            <div className="p-2.5 bg-orange-50 text-orange-555 dark:bg-orange-950/20 dark:text-orange-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <UserCheck className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{metricsData.teacherSolved}</h3>
            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-extrabold mt-1">Teacher resolved doubts</p>
          </div>
        </div>

        {/* Card 7: Estimated Faculty Time Saved */}
        <div className="group p-6 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 rounded-3xl shadow-sm hover:shadow-lg hover:border-teal-450 dark:hover:border-teal-700 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Faculty Time Saved</span>
            <div className="p-2.5 bg-teal-50 text-teal-505 dark:bg-teal-950/20 dark:text-teal-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-5.5 w-5.5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-105">{metricsData.hoursSaved} hrs</h3>
            <p className="text-[10px] text-teal-605 dark:text-teal-400 font-extrabold mt-1">Estimated workload saved</p>
          </div>
        </div>

        {/* Card 8: Faculty Workload Reduction % */}
        <div className="group relative p-6 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-450 dark:hover:border-emerald-500 rounded-3xl shadow-premium hover:shadow-premium-lg transition-all duration-300 transform hover:-translate-y-1.5 flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-455 uppercase tracking-wider block">Workload Reduction</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-105">{reductionPercent.toFixed(1)}%</h3>
            <p className="text-[9px] text-slate-455 dark:text-slate-400 mt-1 font-bold">Doubts solved by system</p>
          </div>
          {/* Small Radial Progress */}
          <div className="relative h-16 w-16 flex-shrink-0 flex items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="25"
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="5"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="25"
                className="stroke-emerald-500"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 25}
                strokeDashoffset={2 * Math.PI * 25 - (reductionPercent / 100) * 2 * Math.PI * 25}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-[10px] font-black text-slate-800 dark:text-slate-105">
              {Math.round(reductionPercent)}%
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Portal */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-805 shadow-sm space-y-3.5">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Quick Actions Portal</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/teacher/my-students"
            className="flex-1 min-w-[150px] inline-flex items-center justify-center space-x-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-xs py-2.5 transition-all text-center dark:bg-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
          >
            <Users className="h-4.5 w-4.5 text-brand-605" />
            <span>View My Students</span>
          </Link>
          
          <Link
            to="/focus-rooms/create"
            className="flex-1 min-w-[150px] inline-flex items-center justify-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2.5 transition-all text-center shadow-sm"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Focus Room</span>
          </Link>

          <Link
            to="/teacher/progress"
            className="flex-1 min-w-[150px] inline-flex items-center justify-center space-x-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-xs py-2.5 transition-all text-center dark:bg-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
          >
            <TrendingUp className="h-4.5 w-4.5 text-emerald-555" />
            <span>View Progress Report</span>
          </Link>
        </div>
      </div>

      {/* Struggling Students Alert Panel */}
      {strugglingStudents.length > 0 && (
        <div className="bg-rose-50/10 dark:bg-rose-955/5 border border-rose-150/40 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-455">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-black uppercase tracking-wider">
                ⚠️ {slowLearnersCount} students need your attention
              </h3>
            </div>
            <Link
              to="/teacher/my-students?filter=slow"
              className="text-xs font-black text-rose-605 dark:text-rose-400 hover:underline inline-flex items-center space-x-1"
            >
              <span>View All Struggling Students</span>
              <ChevronRight className="h-4.5 w-4.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {strugglingStudents.map(student => (
              <div 
                key={student.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805 p-5 rounded-2xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-105 text-sm">{student.name}</h4>
                  <p className="text-[9px] text-slate-405 font-bold uppercase tracking-wider">{student.rollNumber || 'No Roll'}</p>
                  
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2">
                    <span>Section: {student.section || 'N/A'}</span>
                    <span className="text-rose-500 font-black uppercase tracking-wider">{student.performanceLevel || 'slow'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-805 flex items-center justify-between gap-3">
                  <Link
                    to={`/teacher/student/${student.id}`}
                    className="flex-1 inline-flex items-center justify-center space-x-0.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 text-brand-605 font-bold text-[10px] py-2 transition-all text-center"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Activity Timeline & AI Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Activity Timeline */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <Activity className="h-4.5 w-4.5 text-brand-605" />
              <span>Today's Activity Timeline</span>
            </h3>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold text-slate-500">Live feed</span>
          </div>

          <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-6">
            {!metricsData?.activityTimeline || metricsData.activityTimeline.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 font-semibold">No activity has been recorded today.</div>
            ) : (
              metricsData.activityTimeline.map((item: any, idx: number) => {
                const formattedTime = new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={idx} className="relative pl-6">
                    <span className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-white dark:border-[#1E293B] ${item.color || 'bg-slate-400'} shadow-sm`} />
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{formattedTime}</div>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 mt-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{item.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Recommendation Panel */}
        <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-105 uppercase tracking-wider flex items-center space-x-2">
              <Brain className="h-4.5 w-4.5 text-purple-600" />
              <span>AI Remediation Insights</span>
            </h3>
            <span className="text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/20 dark:text-purple-400 px-2 py-0.5 rounded-full font-black">Copilot active</span>
          </div>

          <div className="space-y-4">
            {/* Recommendation 1 */}
            {slowLearnersCount > 0 ? (
              <div className="p-4 bg-rose-550/5 border border-rose-550/25 rounded-2xl flex items-start space-x-3.5">
                <div className="p-2 bg-rose-50 dark:bg-rose-955/25 text-rose-605 rounded-xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-105">Focus Room Suggested</h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                    {strugglingStudents.map(s => s.name).join(', ')} need assistance. Start a Focus Room on their weak topics.
                  </p>
                  <Link
                    to="/focus-rooms/create"
                    className="inline-flex items-center space-x-1 text-rose-605 dark:text-rose-455 font-extrabold text-xs hover:underline pt-0.5"
                  >
                    <span>Launch OS Remedial Room</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/25 rounded-2xl flex items-start space-x-3.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-955/25 text-emerald-600 rounded-xl">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-105">Academic Performance Strong</h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                    No students currently flagged as slow learners. Consider publishing a competitive coding quest.
                  </p>
                </div>
              </div>
            )}

            {/* Recommendation 2 */}
            {escalations.length > 0 ? (
              <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-2xl flex items-start space-x-3.5">
                <div className="p-2 bg-amber-50 dark:bg-amber-955/25 text-amber-600 rounded-xl">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-105">Pending Escalated Doubts</h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                    There are {escalations.length} unresolved escalations. Manual intervention is recommended.
                  </p>
                  <Link
                    to="/teacher/escalations"
                    className="inline-flex items-center space-x-1 text-amber-605 dark:text-amber-455 font-extrabold text-xs hover:underline pt-0.5"
                  >
                    <span>Review Escalation Queue</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl flex items-start space-x-3.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-955/25 text-indigo-600 rounded-xl">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-105">Gamification Rule Tuning</h4>
                  <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                    DBMS doubt velocity is low this week. We recommend doubling solver reputation weights to boost student resolution rates.
                  </p>
                  <Link
                    to="/teacher/rules"
                    className="inline-flex items-center space-x-1 text-indigo-650 dark:text-indigo-400 font-extrabold text-xs hover:underline pt-0.5"
                  >
                    <span>Adjust Reward Rules</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1 - Pie Chart: Doubt Resolution Breakdown */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Doubt Resolution Breakdown</h3>
          <div className="h-64 w-full relative flex items-center justify-center text-xs">
            {formattedPieData.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-850/10 w-full h-full flex items-center justify-center rounded-2xl">
                No workload data available yet.
              </div>
            ) : (
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
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
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
            )}
          </div>
        </div>

        {/* Chart 2 - Bar Chart: Weekly Workload Trend */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Weekly Workload Trend</h3>
          <div className="h-64 w-full text-xs flex items-center justify-center">
            {weeklyTrendData.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-850/10 w-full h-full flex items-center justify-center rounded-2xl">
                No workload data available yet.
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Chart 3 - Line Chart: Faculty Time Saved Per Week */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Faculty Time Saved Per Week</h3>
          <div className="h-64 w-full text-xs flex items-center justify-center">
            {weeklyTrendData.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-850/10 w-full h-full flex items-center justify-center rounded-2xl">
                Time saved statistics will appear after AI resolves student doubts.
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Chart 4 - Horizontal Bar Chart: Most Repeated Doubt Topics */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-premium dark:bg-slate-900 dark:border-slate-850 flex flex-col space-y-4">
          <h3 className="text-base font-bold text-slate-805 dark:text-slate-100">Most Repeated Doubt Topics (Top 10)</h3>
          <div className="h-64 w-full text-xs flex items-center justify-center">
            {heatmapData.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-850/10 w-full h-full flex items-center justify-center rounded-2xl">
                No repeated topics found yet.
              </div>
            ) : (
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
            )}
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
            No escalated doubts at the moment.
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

      {/* Question Management Section */}
      <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-premium dark:bg-[#1E293B] dark:border-slate-800 space-y-6 transition-colors duration-300">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Settings className="h-6 w-6 text-brand-600 animate-spin-slow" />
          <div>
            <h3 className="text-lg font-bold text-slate-805 dark:text-slate-100">Question Management</h3>
            <p className="text-xs text-slate-400">Configure global doubt solving parameters, AI hinting rules, and gamification rewards.</p>
          </div>
        </div>

        {settingsSavedSuccess && (
          <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400 border border-emerald-100/40">
            ✓ Question settings and reward rules updated and synchronized successfully!
          </div>
        )}

        <form onSubmit={handleSaveGlobalSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Question Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-205 border-b border-slate-50 dark:border-slate-800/40 pb-1.5">Question Configurations</h4>
              
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label htmlFor="globalAllowCommunity" className="cursor-pointer">Allow community solutions</label>
                <input 
                  id="globalAllowCommunity"
                  type="checkbox" 
                  checked={globalAllowCommunity} 
                  onChange={(e) => setGlobalAllowCommunity(e.target.checked)} 
                  className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label htmlFor="globalHideUntilFirst" className="cursor-pointer">Hide solutions until first attempt</label>
                <input 
                  id="globalHideUntilFirst"
                  type="checkbox" 
                  checked={globalHideUntilFirst} 
                  onChange={(e) => setGlobalHideUntilFirst(e.target.checked)} 
                  className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label htmlFor="globalAllowUnlimited" className="cursor-pointer">Allow unlimited attempts</label>
                <input 
                  id="globalAllowUnlimited"
                  type="checkbox" 
                  checked={globalAllowUnlimited} 
                  onChange={(e) => setGlobalAllowUnlimited(e.target.checked)} 
                  className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </div>

              {!globalAllowUnlimited && (
                <div className="flex items-center justify-between pl-4 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="globalMaxAttempts">Set maximum attempts</label>
                  <input 
                    id="globalMaxAttempts"
                    type="number" 
                    min={1}
                    value={globalMaxAttempts} 
                    onChange={(e) => setGlobalMaxAttempts(e.target.value)} 
                    className="w-20 p-2 border border-slate-200 rounded-xl text-center bg-white dark:bg-slate-900 dark:border-slate-800 font-extrabold focus:outline-none focus:border-brand-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <label htmlFor="globalAllowEditing" className="cursor-pointer">Allow answer editing</label>
                <input 
                  id="globalAllowEditing"
                  type="checkbox" 
                  checked={globalAllowEditing} 
                  onChange={(e) => setGlobalAllowEditing(e.target.checked)} 
                  className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="flex flex-col space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <label htmlFor="globalAiHintLevels" className="font-semibold">AI Hint Levels</label>
                <select 
                  id="globalAiHintLevels"
                  value={globalAiHintLevels}
                  onChange={(e) => setGlobalAiHintLevels(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                >
                  <option value="three-levels">Three progressive levels (Small clue, Medium clue, Strong clue)</option>
                  <option value="two-levels">Two progressive levels (Brief hint, Full strategy)</option>
                  <option value="single-clue">Single clue level only</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <label htmlFor="globalEscalationRules" className="font-semibold">Escalation Rules</label>
                <select 
                  id="globalEscalationRules"
                  value={globalEscalationRules}
                  onChange={(e) => setGlobalEscalationRules(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:border-brand-500"
                >
                  <option value="auto-escalate">Auto-escalate on low AI confidence or contradict outcomes</option>
                  <option value="manual-only">Manual escalation only by student or teacher</option>
                  <option value="time-escalate">Auto-escalate after 24 hrs waiting time in Open state</option>
                </select>
              </div>
            </div>

            {/* Right Column: Gamification Configuration */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-205 border-b border-slate-50 dark:border-slate-800/40 pb-1.5">Gamification & Reward Configurations</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="askerXP" className="font-semibold">Asker Participation (XP)</label>
                  <input
                    id="askerXP"
                    type="number"
                    value={askerXP}
                    onChange={(e) => setAskerXP(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="askerCoins" className="font-semibold">Asker Participation (Coins)</label>
                  <input
                    id="askerCoins"
                    type="number"
                    value={askerCoins}
                    onChange={(e) => setAskerCoins(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="solverXP" className="font-semibold">Solver Base (XP)</label>
                  <input
                    id="solverXP"
                    type="number"
                    value={solverXP}
                    onChange={(e) => setSolverXP(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="solverCoins" className="font-semibold">Solver Base (Coins)</label>
                  <input
                    id="solverCoins"
                    type="number"
                    value={solverCoins}
                    onChange={(e) => setSolverCoins(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="bonusXP" className="font-semibold">AI Rating Bonus (XP)</label>
                  <input
                    id="bonusXP"
                    type="number"
                    value={bonusXP}
                    onChange={(e) => setBonusXP(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="bonusCoins" className="font-semibold">AI Rating Bonus (Coins)</label>
                  <input
                    id="bonusCoins"
                    type="number"
                    value={bonusCoins}
                    onChange={(e) => setBonusCoins(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="verificationXP" className="font-semibold">Faculty Verification (XP)</label>
                  <input
                    id="verificationXP"
                    type="number"
                    value={verificationXP}
                    onChange={(e) => setVerificationXP(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  <label htmlFor="verificationCoins" className="font-semibold">Faculty Verification (Coins)</label>
                  <input
                    id="verificationCoins"
                    type="number"
                    value={verificationCoins}
                    onChange={(e) => setVerificationCoins(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                <label htmlFor="streakMultiplier" className="font-semibold">Streak Multiplier (x)</label>
                <input
                  id="streakMultiplier"
                  type="number"
                  step="0.1"
                  value={streakMultiplier}
                  onChange={(e) => setStreakMultiplier(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-3 border-t border-slate-50 dark:border-slate-800">
            <button
              type="submit"
              disabled={savingGlobalSettings}
              className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-premium transition-all flex items-center space-x-1.5"
            >
              <Save className="h-4 w-4" />
              <span>{savingGlobalSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
