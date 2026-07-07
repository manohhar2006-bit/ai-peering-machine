import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Plus, 
  Users, 
  BookOpen, 
  Target, 
  Activity, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  X,
  Check,
  Award
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  students: string[];
  roomType: 'slow_learner' | 'advanced' | 'general';
  isActive: boolean;
  questions: any[];
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  section: string;
}

export const TeacherFocusRooms: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [mentoredStudents, setMentoredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [activeRoom, setActiveRoom] = useState<FocusRoom | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [roomsRes, studentsRes] = await Promise.all([
          axios.get(`${API_URL}/focus-room/my-rooms`, { headers }),
          axios.get(`${API_URL}/allocation/my-students`, { headers })
        ]);

        setRooms(roomsRes.data || []);
        setMentoredStudents(studentsRes.data.students || []);
      } catch (err) {
        console.error('Failed to load focus rooms dashboard:', err);
        setError('Failed to retrieve focus rooms. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenAddStudentsModal = (room: FocusRoom) => {
    setActiveRoom(room);
    // Exclude students already in the room
    const currentMemberIds = room.students || [];
    const eligible = mentoredStudents.filter(s => !currentMemberIds.includes(s.id));
    setSelectedStudentIds([]);
    setEnrollSuccess(null);
  };

  const handleToggleStudentSelect = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleEnrollStudents = async () => {
    if (!activeRoom || selectedStudentIds.length === 0) return;
    setAddingStudents(true);
    setEnrollSuccess(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_URL}/focus-room/${activeRoom._id}/add-students`,
        { studentIds: selectedStudentIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update room state locally
      setRooms(prev => prev.map(r => r._id === activeRoom._id ? {
        ...r,
        students: [...r.students, ...selectedStudentIds]
      } : r));

      setEnrollSuccess(`Successfully added ${selectedStudentIds.length} students to the room!`);
      setTimeout(() => {
        setActiveRoom(null);
        setEnrollSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to add students:', err);
      alert('Could not enroll students in Focus Room.');
    } finally {
      setAddingStudents(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading Focus Rooms dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter students eligible to add to the active room
  const eligibleStudents = activeRoom 
    ? mentoredStudents.filter(s => !activeRoom.students.includes(s.id))
    : [];

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-800 via-indigo-650 to-indigo-500 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-4 w-4 text-yellow-350 fill-yellow-350" />
              <span>Targeted AI-Remediation Learning Spaces</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">AI-Assisted Focus Rooms</h2>
            <p className="text-brand-100 text-sm leading-relaxed">
              Create and manage focus rooms for slow learners, advanced modules, or general queries. Add doubts, let Gemini generate questions, and monitor real-time scores.
            </p>
          </div>
          <Link
            to="/focus-rooms/create"
            className="inline-flex items-center space-x-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-brand-700 shadow-md hover:bg-slate-50 transition-all transform hover:-translate-y-0.5"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Focus Room</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs dark:bg-rose-955/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Grid of rooms */}
      {rooms.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors">
          <Users className="mx-auto h-16 w-16 text-slate-205 dark:text-slate-655 mb-4" />
          <h3 className="text-lg font-black text-slate-700 dark:text-slate-200">No Focus Rooms Created</h3>
          <p className="text-sm text-slate-405 mt-2 max-w-md mx-auto">
            You haven't initialized any Focus Rooms yet. Focus rooms let you assign custom question pools and track slow learner progress.
          </p>
          <Link
            to="/focus-rooms/create"
            className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-3 text-xs font-black text-white transition-all shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Focus Room</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const studentCount = room.students ? room.students.length : 0;
            const questionCount = room.questions ? room.questions.length : 0;
            
            // Badges formatting
            let roomTypeLabel = 'General';
            let roomTypeBadge = 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400';
            if (room.roomType === 'slow_learner') {
              roomTypeLabel = 'Slow Learner';
              roomTypeBadge = 'bg-rose-50 text-rose-600 dark:bg-rose-955/10 dark:text-rose-405';
            } else if (room.roomType === 'advanced') {
              roomTypeLabel = 'Advanced';
              roomTypeBadge = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400';
            }

            return (
              <div
                key={room._id}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-premium dark:bg-[#1E293B] dark:border-slate-805 hover:border-brand-200/50 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header tags */}
                  <div className="flex justify-between items-start">
                    <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {room.subject || 'GENERAL'}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${roomTypeBadge}`}>
                      {roomTypeLabel}
                    </span>
                  </div>

                  {/* Title and details */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-805 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-base line-clamp-1">
                      {room.name}
                    </h3>
                    <p className="text-xs font-semibold text-brand-500 dark:text-brand-400 flex items-center space-x-1">
                      <Target className="h-3.5 w-3.5 animate-pulse" />
                      <span>Topic: {room.topic || 'General Concepts'}</span>
                    </p>
                    <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {room.description || 'Custom remediation and target concept focus classroom.'}
                    </p>
                  </div>

                  {/* Grid of details */}
                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800/40 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Students</p>
                      <span className="font-extrabold text-slate-750 dark:text-slate-350">{studentCount} enrolled</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Questions</p>
                      <span className="font-extrabold text-slate-750 dark:text-slate-350">{questionCount} active</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
                      <span className={`font-black uppercase text-[10px] tracking-wider ${room.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {room.isActive ? 'Active' : 'Archived'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-805 flex items-center justify-between gap-3">
                  <button
                    onClick={() => handleOpenAddStudentsModal(room)}
                    className="flex-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-655 font-bold text-xs py-2.5 transition-all text-center dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-850"
                  >
                    Add Students
                  </button>

                  <button
                    onClick={() => navigate(`/teacher/focus-rooms/${room._id}`)}
                    className="flex-1 inline-flex items-center justify-center space-x-1 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-605 font-bold text-xs py-2.5 transition-all text-center"
                  >
                    <span>Open Room</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Students to Room Modal */}
      {activeRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-premium relative animate-float">
            <button
              onClick={() => setActiveRoom(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-405 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 mb-1">
              Add Students to Room
            </h3>
            <p className="text-slate-400 text-xs mb-5 font-semibold">
              Select student(s) to add to <strong className="text-slate-655 dark:text-slate-350">{activeRoom.name}</strong>
            </p>

            {enrollSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-center text-xs font-bold dark:bg-emerald-955/20 dark:text-emerald-450 dark:border-emerald-900/35">
                {enrollSuccess}
              </div>
            ) : eligibleStudents.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-xs font-bold uppercase">All assigned students are already enrolled!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {eligibleStudents.map(student => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudentSelect(student.id)}
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
                  className="w-full inline-flex items-center justify-center space-x-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:dark:bg-slate-900 py-3 text-xs font-black text-white shadow-md transition-all"
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
