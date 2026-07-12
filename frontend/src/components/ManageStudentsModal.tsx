import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  X,
  Search,
  UserMinus,
  UserPlus,
  Check,
  AlertTriangle,
  Loader2,
  Users
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

interface ManageStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
  onSuccess: () => void;
}

export const ManageStudentsModal: React.FC<ManageStudentsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'add'>('current');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Lists
  const [currentMembers, setCurrentMembers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);

  // Confirmation state
  const [studentToRemove, setStudentToRemove] = useState<any | null>(null);

  // Fetch current members
  const fetchCurrentMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/${roomId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out teachers from the members list
      const studentsOnly = response.data.filter((m: any) => m.userId && m.userId.role === 'student');
      setCurrentMembers(studentsOnly);
    } catch (err) {
      console.error('Failed to load current members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all directory students
  const fetchAllStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/focus-rooms/students/search`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllStudents(response.data);
    } catch (err) {
      console.error('Failed to load student directory:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCurrentMembers();
      fetchAllStudents();
      setSelectedAddIds([]);
      setSearchQuery('');
      setStudentToRemove(null);
      setActiveTab('current');
    }
  }, [isOpen, roomId]);

  // Remove member API call
  const handleRemoveMember = async () => {
    if (!studentToRemove) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/focus-rooms/${roomId}/members/${studentToRemove._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentToRemove(null);
      fetchCurrentMembers();
      fetchAllStudents();
      onSuccess(); // refresh parent counters
    } catch (err: any) {
      console.error('Failed to remove student:', err);
      alert(err.response?.data?.message || 'Failed to remove student');
    }
  };

  // Bulk add members API call
  const handleAddMembers = async () => {
    if (selectedAddIds.length === 0) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms/${roomId}/members`,
        { studentIds: selectedAddIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Students enrolled and invitations dispatched!');
      setSelectedAddIds([]);
      fetchCurrentMembers();
      fetchAllStudents();
      onSuccess(); // refresh parent counters
      setActiveTab('current');
    } catch (err: any) {
      console.error('Failed to add students:', err);
      alert(err.response?.data?.message || 'Failed to add students');
    }
  };

  if (!isOpen) return null;

  // Filter lists based on search input
  const filteredCurrent = currentMembers.filter(m => {
    const q = searchQuery.toLowerCase();
    const u = m.userId || {};
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.rollNumber || '').toLowerCase().includes(q) ||
      (u.branch || '').toLowerCase().includes(q) ||
      (u.section || '').toLowerCase().includes(q)
    );
  });

  // Filter candidates (all students minus enrolled members)
  const candidateStudents = allStudents.filter(
    student => !currentMembers.some(member => member.userId && member.userId._id === student._id)
  );

  const filteredCandidates = candidateStudents.filter(s => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q) ||
      (s.section || '').toLowerCase().includes(q)
    );
  });

  // Checkbox functions for Add tab
  const handleToggleAdd = (studentId: string) => {
    if (selectedAddIds.includes(studentId)) {
      setSelectedAddIds(selectedAddIds.filter(id => id !== studentId));
    } else {
      setSelectedAddIds([...selectedAddIds, studentId]);
    }
  };

  const handleSelectAllCandidates = () => {
    const ids = filteredCandidates.map(s => s._id);
    setSelectedAddIds(Array.from(new Set([...selectedAddIds, ...ids])));
  };

  const handleDeselectAllCandidates = () => {
    const ids = filteredCandidates.map(s => s._id);
    setSelectedAddIds(selectedAddIds.filter(id => !ids.includes(id)));
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
      {/* Modal Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-brand-50 text-brand-650 rounded-xl dark:bg-brand-950/20 dark:text-brand-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-850 dark:text-slate-100">Manage Students</h2>
              <p className="text-xs text-slate-400 truncate max-w-[350px]">Classroom: {roomName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-[#152033]">
          <button
            onClick={() => {
              setActiveTab('current');
              setSearchQuery('');
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'current'
                ? 'bg-white text-brand-605 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Current Members ({currentMembers.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              setSearchQuery('');
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'add'
                ? 'bg-white text-brand-605 shadow-sm dark:bg-[#1E293B] dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Add Students ({candidateStudents.length} available)
          </button>
        </div>

        {/* Search Bar inside Modal */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <input
              type="text"
              placeholder={
                activeTab === 'current'
                  ? 'Search enrolled students by Name, Roll No...'
                  : 'Search user directory to enroll...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-150"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Members/Add List Section */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 p-4 space-y-2">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-405 flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              <span>Fetching list...</span>
            </div>
          ) : activeTab === 'current' ? (
            // Current Members Roster
            filteredCurrent.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                {currentMembers.length === 0 ? 'No student members inside this Focus Room.' : 'No members matches search query.'}
              </div>
            ) : (
              filteredCurrent.map(member => {
                const u = member.userId || {};
                const nameInitials = (u.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div key={member._id} className="flex justify-between items-center p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(u.name || '')}`}>
                        {nameInitials || 'ST'}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">{u.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-semibold">
                          {u.rollNumber || 'No Roll No'} • {u.branch || 'Gen'} (Sec {u.section || 'A'})
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStudentToRemove(u)}
                      className="flex items-center space-x-1 border border-red-105 hover:bg-red-50 text-red-650 dark:border-red-950/20 dark:hover:bg-red-950/25 p-2 rounded-xl transition-all"
                    >
                      <UserMinus className="h-4 w-4" />
                      <span className="text-[10px] font-bold">Remove</span>
                    </button>
                  </div>
                );
              })
            )
          ) : (
            // Add Students Roster
            <div className="space-y-4">
              {/* Select All Actions */}
              {filteredCandidates.length > 0 && (
                <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-[10px] font-bold text-slate-455 dark:text-slate-500 uppercase">
                    Candidates ({filteredCandidates.length})
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCandidates}
                      className="text-[10px] font-black text-brand-650 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllCandidates}
                      className="text-[10px] font-black text-red-600 hover:underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {filteredCandidates.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  {candidateStudents.length === 0 ? 'All student candidates are already enrolled.' : 'No candidates match your search.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {filteredCandidates.map(student => {
                    const isChecked = selectedAddIds.includes(student._id);
                    const nameInitials = (student.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={student._id}
                        onClick={() => handleToggleAdd(student._id)}
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
                            onChange={() => handleToggleAdd(student._id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(student.name)}`}>
                            {nameInitials || 'ST'}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs block">{student.name}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-semibold">
                              {student.rollNumber || 'No Roll No'} • {student.branch || 'Gen'} (Sec {student.section || 'A'})
                            </span>
                          </div>
                        </div>

                        <div className="pr-2">
                          {isChecked ? (
                            <span className="p-1 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 block">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full border border-slate-200 text-slate-300 block">
                              <UserPlus className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#152033]/60 flex justify-between items-center">
          <span className="text-xs text-slate-400 font-bold">
            {activeTab === 'add' ? `${selectedAddIds.length} students selected` : ''}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              Close
            </button>
            {activeTab === 'add' && (
              <button
                onClick={handleAddMembers}
                disabled={selectedAddIds.length === 0}
                className="px-5 py-2 text-xs font-black bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog Overlay */}
      {studentToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-850 shadow-2xl p-6 space-y-4">
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
