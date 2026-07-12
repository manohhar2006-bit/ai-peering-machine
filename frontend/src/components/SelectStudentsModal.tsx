import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Search, Check, Loader2, Users } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

interface SelectStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  enrolledUserIds: string[];
  onSuccess: () => void;
}

export const SelectStudentsModal: React.FC<SelectStudentsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  enrolledUserIds,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic filter state
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Fetch student roster
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/students/search`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out students who are already enrolled in the room
      const candidates = response.data.filter((student: any) => !enrolledUserIds.includes(student._id));
      setAllStudents(candidates);
    } catch (err) {
      console.error('Failed to load class roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      setSelectedIds([]);
      setSearchQuery('');
      setSelectedBranch('');
      setSelectedSection('');
    }
  }, [isOpen, roomId, enrolledUserIds]);

  if (!isOpen) return null;

  // Extract unique branches and sections for dropdown filters
  const uniqueBranches = Array.from(new Set(allStudents.map(s => s.branch).filter(Boolean))) as string[];
  const uniqueSections = Array.from(new Set(allStudents.map(s => s.section).filter(Boolean))) as string[];

  // Apply filters locally (instant reaction)
  const filteredStudents = allStudents.filter(student => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (student.name || '').toLowerCase().includes(q) ||
      (student.rollNumber || '').toLowerCase().includes(q) ||
      (student.branch || '').toLowerCase().includes(q) ||
      (student.section || '').toLowerCase().includes(q);

    const matchesBranch = selectedBranch ? student.branch === selectedBranch : true;
    const matchesSection = selectedSection ? student.section === selectedSection : true;

    return matchesSearch && matchesBranch && matchesSection;
  });

  const handleToggleCheck = (studentId: string) => {
    if (selectedIds.includes(studentId)) {
      setSelectedIds(selectedIds.filter(id => id !== studentId));
    } else {
      setSelectedIds([...selectedIds, studentId]);
    }
  };

  const handleSelectAll = () => {
    const visibleIds = filteredStudents.map(s => s._id);
    setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
  };

  const handleDeselectAll = () => {
    const visibleIds = filteredStudents.map(s => s._id);
    setSelectedIds(selectedIds.filter(id => !visibleIds.includes(id)));
  };

  const handleAddSelected = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/members`,
        { studentIds: selectedIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`${selectedIds.length} students added successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to add selected students:', err);
      alert(err.response?.data?.message || 'Failed to add students');
    } finally {
      setLoading(false);
    }
  };

  // Avatar helper
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-50 text-brand-650 rounded-xl dark:bg-brand-950/20 dark:text-brand-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-850 dark:text-slate-100">Select Students</h2>
              <p className="text-xs text-slate-400 truncate max-w-[350px]">Enrolling in: {roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-[#152033]/40">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students by Name, Roll No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-155"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filter by Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-705 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">All Branches</option>
                {uniqueBranches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Filter by Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-705 focus:border-brand-500 focus:outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">All Sections</option>
                {uniqueSections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 p-4 space-y-2">
          {/* List Headers & Select Actions */}
          {filteredStudents.length > 0 && (
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase">
                Candidates ({filteredStudents.length})
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-black text-brand-650 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[10px] font-black text-red-600 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              <span>Fetching class roster...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              {allStudents.length === 0
                ? 'All students in the database are already enrolled in this Focus Room.'
                : 'No candidates match your search filters.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(student => {
                const isChecked = selectedIds.includes(student._id);
                const initials = (student.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div
                    key={student._id}
                    onClick={() => handleToggleCheck(student._id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'border-brand-300 bg-brand-50/10 dark:border-brand-900/40 dark:bg-brand-950/10'
                        : 'border-slate-100 bg-white dark:bg-[#1E293B] dark:border-slate-800/80 hover:bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCheck(student._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(student.name || '')}`}>
                        {initials || 'ST'}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">{student.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-405 block font-semibold">
                          {student.rollNumber || 'No Roll No'} • {student.branch || 'Gen'} (Sec {student.section || 'A'})
                        </span>
                      </div>
                    </div>

                    <div className="pr-2">
                      {isChecked ? (
                        <span className="p-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 block">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#152033]/60 flex justify-between items-center">
          <span className="text-xs text-slate-400 font-bold">
            Selected: {selectedIds.length} Students
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-slate-205 bg-white hover:bg-slate-50 text-slate-655 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              Close
            </button>
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.length === 0 || loading}
              className="px-5 py-2 text-xs font-black bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Add Selected Students</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
