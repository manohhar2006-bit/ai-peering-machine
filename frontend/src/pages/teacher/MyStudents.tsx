import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Users, 
  UserCheck, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  BookOpen, 
  Clock, 
  Award, 
  ChevronRight, 
  Loader2,
  X
} from 'lucide-react';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  section: string;
  batch: string;
  department: string;
  performanceLevel: 'excellent' | 'good' | 'average' | 'slow';
  isSlowLearner: boolean;
  weakTopics: string[];
  xp: number;
  streak: number;
  doubtsPosted: number;
  doubtsResolved: number;
  lastActive: string;
}

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
}

export const MyStudents: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [focusRooms, setFocusRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'slow_learner' | 'inactive'>('all');
  
  // Modal state for adding a student to a focus room
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [addingToRoom, setAddingToRoom] = useState(false);
  const [addToRoomSuccess, setAddToRoomSuccess] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'slow') {
      setActiveFilter('slow_learner');
    }
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [studentsRes, roomsRes] = await Promise.all([
          axios.get(`${API_URL}/allocation/my-students`, { headers }),
          axios.get(`${API_URL}/focus-room/my-rooms`, { headers })
        ]);

        setStudents(studentsRes.data.students || []);
        setFocusRooms(roomsRes.data || []);
      } catch (err) {
        console.error('Failed to load teacher students data:', err);
        setError('Failed to retrieve students. Please verify your connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddToRoom = async (roomId: string) => {
    if (!selectedStudent) return;
    setAddingToRoom(true);
    setAddToRoomSuccess(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-room/${roomId}/add-students`,
        { studentIds: [selectedStudent.id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAddToRoomSuccess(`Successfully added ${selectedStudent.name} to the Focus Room!`);
      setTimeout(() => {
        setSelectedStudent(null);
        setAddToRoomSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add student to room:', err);
      alert('Could not add student to Focus Room. They might already be enrolled.');
    } finally {
      setAddingToRoom(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading your students list...</p>
        </div>
      </div>
    );
  }

  // Filter students
  const filteredStudents = students.filter((student) => {
    // Search filter
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Category filter
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const lastActiveDate = new Date(student.lastActive);
    const isActive = lastActiveDate >= sevenDaysAgo;

    if (activeFilter === 'active') return isActive;
    if (activeFilter === 'inactive') return !isActive;
    if (activeFilter === 'slow_learner') return student.isSlowLearner;

    return true;
  });

  // Calculate Header Stats
  const totalCount = students.length;
  const slowLearnersCount = students.filter(s => s.isSlowLearner).length;
  const activeCount = students.filter(s => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return new Date(s.lastActive) >= sevenDaysAgo;
  }).length;
  const excellentCount = students.filter(s => s.performanceLevel === 'excellent').length;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-800 via-indigo-650 to-indigo-500 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-4 w-4 text-yellow-350 fill-yellow-350" />
              <span>Student Mentorship & Monitoring</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">My Assigned Students</h2>
            <p className="text-brand-100 text-sm leading-relaxed">
              Track student statistics, group them into active peer clusters, diagnose weak concepts, and assign remediation rooms.
            </p>
          </div>
          <Link
            to="/teacher/assign-students"
            className="inline-flex items-center space-x-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-md hover:bg-slate-50 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Assign Students</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30">
          {error}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-100 dark:border-slate-805 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-950/20 text-brand-605 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Mentored</p>
            <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-100 dark:border-slate-805 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active This Week</p>
            <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100">{activeCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-100 dark:border-slate-805 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-605 rounded-xl">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Slow Learners</p>
            <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100">{slowLearnersCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-100 dark:border-slate-805 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-555 rounded-xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Excellent Performers</p>
            <h3 className="text-2xl font-black text-slate-850 dark:text-slate-100">{excellentCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-100 dark:border-slate-805 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-slate-700 dark:text-slate-200"
            placeholder="Search students by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-1.5 self-stretch overflow-x-auto md:self-auto">
          {(['all', 'active', 'slow_learner', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold capitalize transition-all border whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-brand-600 border-brand-605 text-white shadow-premium'
                  : 'bg-slate-50 text-slate-500 border-slate-150 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-405 hover:bg-slate-100 dark:hover:bg-slate-850'
              }`}
            >
              {filter === 'slow_learner' ? 'Slow Learners' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors">
          <Users className="mx-auto h-16 w-16 text-slate-250 dark:text-slate-655 mb-4" />
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-200">No Students Found</h3>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            {students.length === 0 
              ? 'No students are currently assigned to you. Click the "Assign Students" button to link students to your profile.'
              : 'No students match your active filters or search terms. Try modifying your criteria.'}
          </p>
          {students.length === 0 && (
            <Link
              to="/teacher/assign-students"
              className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-3 text-xs font-black text-white transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Assign First Student</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const lastActiveDate = new Date(student.lastActive);
            const timeDiff = Math.abs(Date.now() - lastActiveDate.getTime());
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            // Performance Badge
            let badgeBg = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
            if (student.performanceLevel === 'excellent') {
              badgeBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400';
            } else if (student.performanceLevel === 'good') {
              badgeBg = 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400';
            } else if (student.performanceLevel === 'average') {
              badgeBg = 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400';
            } else if (student.performanceLevel === 'slow') {
              badgeBg = 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400';
            }

            return (
              <div
                key={student.id}
                className="group relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-premium dark:bg-[#1E293B] dark:border-slate-805 hover:border-brand-200/50 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top row Info */}
                  <div className="flex items-center space-x-3.5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white text-sm font-extrabold shadow-md">
                      {getInitials(student.name)}
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {student.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{student.rollNumber || 'No Roll Num'}</p>
                    </div>
                  </div>

                  {/* Section & Performance row */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450 dark:text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                      Section: <strong className="text-slate-655 dark:text-slate-350">{student.section || 'N/A'}</strong> ({student.batch || 'N/A'})
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${badgeBg}`}>
                      {student.performanceLevel}
                    </span>
                  </div>

                  {/* Weak topics preview */}
                  {student.weakTopics && student.weakTopics.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Weak Topics</p>
                      <div className="flex flex-wrap gap-1">
                        {student.weakTopics.slice(0, 3).map((topic, i) => (
                          <span
                            key={i}
                            className="bg-rose-50/50 text-rose-550 border border-rose-100/50 dark:bg-rose-955/10 dark:text-rose-400 dark:border-rose-950/20 px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            {topic}
                          </span>
                        ))}
                        {student.weakTopics.length > 3 && (
                          <span className="text-[10px] font-extrabold text-slate-400 px-1">
                            +{student.weakTopics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Grid details */}
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-50 dark:border-slate-800/40 pt-4 text-center">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">XP Score</p>
                      <span className="font-black text-brand-600 dark:text-brand-405 text-sm flex items-center justify-center space-x-0.5 mt-0.5">
                        <Award className="h-3.5 w-3.5" />
                        <span>{student.xp}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Weekly Doubts</p>
                      <span className="font-black text-slate-700 dark:text-slate-350 text-sm flex items-center justify-center space-x-0.5 mt-0.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{student.doubtsPosted}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Last Active</p>
                      <span className="font-bold text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center space-x-0.5 mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{daysDiff === 1 ? 'Today' : `${daysDiff}d ago`}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="flex-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-xs py-2.5 transition-all text-center dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850"
                  >
                    Add to Focus Room
                  </button>

                  <button
                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                    className="flex-1 inline-flex items-center justify-center space-x-1 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 font-bold text-xs py-2.5 transition-all text-center"
                  >
                    <span>View Profile</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Student to Focus Room Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
              Add to Focus Room
            </h3>
            <p className="text-slate-400 text-xs mb-5 font-semibold">
              Enroll <strong className="text-slate-655 dark:text-slate-350">{selectedStudent.name}</strong> into a collaborative Focus Room to initiate concept remediation.
            </p>

            {addToRoomSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-center text-xs font-bold dark:bg-emerald-955/20 dark:text-emerald-450 dark:border-emerald-900/35">
                {addToRoomSuccess}
              </div>
            ) : focusRooms.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
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
                      <h4 className="text-slate-700 dark:text-slate-200 line-clamp-1">{room.name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Topic: {room.topic || 'General'}</p>
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
