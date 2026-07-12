import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Search,
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  UserCheck,
  Edit2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

export const CreateFocusRoom: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: Choice Screen state
  const [choiceModalOpen, setChoiceModalOpen] = useState(true);
  const [creationMethod, setCreationMethod] = useState<'select' | 'manual' | null>(null);

  // Form Fields (Step 2)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [deadline, setDeadline] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // Learning Objectives
  const [objectives, setObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');

  // Roster Directory preloaded from db
  const [students, setStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Mapped list of students selected/added to this room
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);

  // Remove confirmation overlay
  const [studentToRemove, setStudentToRemove] = useState<any | null>(null);

  // Option 1: Select Roster Checklist Filters
  const [selectSearch, setSelectSearch] = useState('');
  const [selectBranch, setSelectBranch] = useState('');
  const [selectSection, setSelectSection] = useState('');

  // Option 2: Manual Student Entry Fields
  const [manualName, setManualName] = useState('');
  const [manualRoll, setManualRoll] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualBranch, setManualBranch] = useState('');
  const [manualSection, setManualSection] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Subjects dropdown lists
  const [subjects, setSubjects] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubjects(response.data);
        if (response.data.length > 0) {
          setSubjectId(response.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  // Fetch students roster on mount
  useEffect(() => {
    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/focus-rooms/students/search`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(response.data);
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, []);

  // Unique branches & sections for roster filters
  const uniqueBranches = Array.from(new Set(students.map(s => s.branch).filter(Boolean))) as string[];
  const uniqueSections = Array.from(new Set(students.map(s => s.section).filter(Boolean))) as string[];

  // local filter for Option 1 Checklist
  const filteredStudents = students.filter(student => {
    const q = selectSearch.toLowerCase();
    const matchesSearch =
      (student.name || '').toLowerCase().includes(q) ||
      (student.rollNumber || '').toLowerCase().includes(q) ||
      (student.branch || '').toLowerCase().includes(q) ||
      (student.section || '').toLowerCase().includes(q);

    const matchesBranch = selectBranch ? student.branch === selectBranch : true;
    const matchesSection = selectSection ? student.section === selectSection : true;

    return matchesSearch && matchesBranch && matchesSection;
  });

  // Checklist toggles
  const handleToggleCheck = (student: any) => {
    const isSelected = selectedStudents.some(s => s._id === student._id);
    if (isSelected) {
      setSelectedStudents(selectedStudents.filter(s => s._id !== student._id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const handleSelectAllFiltered = () => {
    // Merge visible students into selectedStudents
    const currentMap = new Map(selectedStudents.map(s => [s._id, s]));
    filteredStudents.forEach(s => {
      currentMap.set(s._id, s);
    });
    setSelectedStudents(Array.from(currentMap.values()));
  };

  const handleDeselectAllFiltered = () => {
    const visibleIds = filteredStudents.map(s => s._id);
    setSelectedStudents(selectedStudents.filter(s => !visibleIds.includes(s._id)));
  };

  // Option 2 Manual Addition Logic
  const handleAddManualStudent = () => {
    setManualError(null);
    if (!manualName.trim() || !manualRoll.trim()) {
      setManualError('Student Name and Roll Number are required.');
      return;
    }

    // Lookup matching database student
    const matched = students.find(
      s => s.rollNumber?.toLowerCase() === manualRoll.trim().toLowerCase()
    );

    if (!matched) {
      setManualError('Student not found.');
      return;
    }

    // Check if student already in selection roster (excluding the one we are editing)
    const exists = selectedStudents.some(
      s => s._id === matched._id && s._id !== editingStudentId
    );
    if (exists) {
      setManualError('Student already exists.');
      return;
    }

    if (editingStudentId) {
      // Update student
      setSelectedStudents(
        selectedStudents.map(s => (s._id === editingStudentId ? matched : s))
      );
      setEditingStudentId(null);
    } else {
      // Add new student
      setSelectedStudents([...selectedStudents, matched]);
    }

    // Reset inputs
    setManualName('');
    setManualRoll('');
    setManualEmail('');
    setManualBranch('');
    setManualSection('');
  };

  // Edit action
  const handleEditManualStudent = (student: any) => {
    setEditingStudentId(student._id);
    setManualName(student.name || '');
    setManualRoll(student.rollNumber || '');
    setManualEmail(student.email || '');
    setManualBranch(student.branch || '');
    setManualSection(student.section || '');
  };

  // Confirm remove student from local list
  const handleRemoveStudentConfirm = () => {
    if (studentToRemove) {
      setSelectedStudents(selectedStudents.filter(s => s._id !== studentToRemove._id));
      setStudentToRemove(null);
    }
  };

  // Remove objective
  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  // Remove objective helper
  const handleRemoveObjective = (idx: number) => {
    setObjectives(objectives.filter((_, i) => i !== idx));
  };

  // Avatar bg
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

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subjectId || !topic || !deadline) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    if (selectedStudents.length === 0) {
      alert('Please add at least one student to the Focus Room roster.');
      return;
    }

    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/focus-rooms`,
        {
          name,
          description,
          subjectId,
          topic,
          learningObjectives: objectives,
          studentIds: selectedStudents.map(s => s._id),
          deadline: new Date(deadline),
          visibility
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      alert('Focus Room successfully created! Enrolled students have been notified.');
      navigate('/focus-rooms');
    } catch (err: any) {
      console.error('Failed to create focus room:', err);
      alert(err.response?.data?.message || 'Failed to create focus room');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Step 1 Selection Choice Modal Dialog */}
      {choiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col p-6 space-y-6">
            
            {/* Title and subtitle */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-black text-slate-850 dark:text-slate-100">Create Focus Room</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1">
                  Choose how you would like to add students to this Focus Room.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/focus-rooms')}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Option 1 */}
              <div
                onClick={() => setCreationMethod('select')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-1 ${
                  creationMethod === 'select'
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 dark:border-brand-500'
                    : 'border-slate-100 bg-white dark:bg-[#0F172A] dark:border-slate-800 hover:border-brand-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400">
                    <span className="text-lg">👥</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-150">Select Students</h3>
                  </div>
                  <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
                    Choose students from your existing class list. Best for selecting multiple students quickly.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-brand-650 uppercase dark:text-brand-405 self-start pt-1">
                  Option 1
                </span>
              </div>

              {/* Card Option 2 */}
              <div
                onClick={() => setCreationMethod('manual')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-1 ${
                  creationMethod === 'manual'
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10 dark:border-brand-500'
                    : 'border-slate-100 bg-white dark:bg-[#0F172A] dark:border-slate-800 hover:border-brand-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
                    <span className="text-lg">➕</span>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-150">Add Students Manually</h3>
                  </div>
                  <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed font-semibold">
                    Add students individually by entering their details. Useful for adding students outside the default class list.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-650 uppercase dark:text-indigo-405 self-start pt-1">
                  Option 2
                </span>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigate('/focus-rooms')}
                className="px-4 py-2 text-xs font-bold border border-slate-205 bg-white hover:bg-slate-50 text-slate-655 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-850 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!creationMethod}
                onClick={() => setChoiceModalOpen(false)}
                className="px-5 py-2 text-xs font-black bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 Form (Only renders after Choice Modal is closed) */}
      {!choiceModalOpen && (
        <>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setChoiceModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Create Room Setup (Option: {creationMethod === 'select' ? 'Select Students' : 'Add Manually'})
              </p>
              <h1 className="text-xl font-black text-slate-885 dark:text-slate-100">Focus Classroom Details</h1>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 border border-slate-100 dark:bg-[#1E293B] dark:border-slate-800 transition-colors">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Classroom Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Operating Systems Unit 3 Focus Room"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Target Topic / Subconcept *</label>
                  <input
                    type="text"
                    required
                    placeholder="Deadlocks"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Subject *</label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                  >
                    {subjects.map(sub => (
                      <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Room Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  placeholder="Practice and strengthen understanding of deadlock concepts before Mid Examination."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Visibility toggle */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Room Visibility</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      visibility === 'public'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-405'
                        : 'border-slate-200 bg-white text-slate-500 dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Public Classroom</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      visibility === 'private'
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/20 dark:text-brand-405'
                        : 'border-slate-200 bg-white text-slate-500 dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <EyeOff className="h-4 w-4" />
                    <span>Private (Invite Only)</span>
                  </button>
                </div>
              </div>

              {/* Learning Objectives List */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-455 uppercase tracking-wider block">Learning Objectives</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="E.g., Understand Deadlock Conditions"
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-sm font-semibold text-slate-850 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="bg-brand-600 hover:bg-brand-705 text-white rounded-xl px-4 transition-colors font-bold flex items-center justify-center"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {objectives.length > 0 && (
                  <div className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                    {objectives.map((obj, idx) => (
                      <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350">
                        <span>{obj}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveObjective(idx)}
                          className="text-red-500 hover:text-red-750 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- OPTION 1 VIEW: Select Students Checklist --- */}
              {creationMethod === 'select' && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-2">
                        <Users className="h-4.5 w-4.5 text-brand-500" />
                        <span>Select Students</span>
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Select students from your class list to enroll them.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-655 transition-all dark:bg-[#0F172A] dark:border-slate-805 dark:text-slate-300 dark:hover:bg-slate-900"
                      >
                        Select All {selectSearch && `(${filteredStudents.length})`}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllFiltered}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-red-600 transition-all dark:bg-[#0F172A] dark:border-slate-805 dark:text-red-400 dark:hover:bg-slate-900"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Search and filter tools */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative md:col-span-2">
                      <input
                        type="text"
                        placeholder="Search roster by Name, Roll No..."
                        value={selectSearch}
                        onChange={(e) => setSelectSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                      />
                      <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectBranch}
                        onChange={(e) => setSelectBranch(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-200"
                      >
                        <option value="">All Branches</option>
                        {uniqueBranches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <select
                        value={selectSection}
                        onChange={(e) => setSelectSection(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-200"
                      >
                        <option value="">All Sections</option>
                        {uniqueSections.map(s => (
                          <option key={s} value={s}>Sec {s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Candidates checklist */}
                  <div className="border border-slate-150 rounded-2xl max-h-[300px] overflow-y-auto bg-slate-50/20 dark:bg-[#0F172A] dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/40">
                    {loadingStudents ? (
                      <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                        <span>Loading class directory...</span>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-10 text-center text-xs text-slate-405">
                        No students match search filters.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-100 dark:bg-slate-800">
                        {filteredStudents.map(student => {
                          const isChecked = selectedStudents.some(s => s._id === student._id);
                          const initials = (student.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                          return (
                            <div
                              key={student._id}
                              onClick={() => handleToggleCheck(student)}
                              className={`flex items-center space-x-4 p-4 bg-white dark:bg-[#1E293B] cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all ${
                                isChecked ? 'bg-brand-50/20 dark:bg-brand-950/10' : ''
                              }`}
                            >
                              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCheck(student)}
                                  className="h-4.5 w-4.5 rounded border-slate-305 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                />
                              </div>
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarBg(student.name || '')}`}>
                                {initials || 'ST'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-150 truncate">{student.name}</p>
                                <p className="text-[10px] font-semibold text-slate-455 dark:text-slate-400 truncate">
                                  {student.rollNumber || 'No Roll No'} • {student.branch || 'Gen'} (Sec {student.section || 'A'})
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selection count */}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>Selected: {selectedStudents.length} Students</span>
                  </div>
                </div>
              )}

              {/* --- OPTION 2 VIEW: Manual Student Entry Form and Table --- */}
              {creationMethod === 'manual' && (
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-150 uppercase tracking-wider flex items-center space-x-2">
                    <Plus className="h-4.5 w-4.5 text-indigo-500" />
                    <span>Manual Student Entry</span>
                  </h3>

                  {manualError && (
                    <div className="flex items-start space-x-2 bg-red-50 text-red-650 dark:bg-red-955/20 dark:text-red-400 p-3.5 rounded-2xl text-xs font-semibold">
                      <AlertCircle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                      <span>{manualError}</span>
                    </div>
                  )}

                  {/* Input Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Student Name *</label>
                      <input
                        type="text"
                        placeholder="Alex Johnson"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-405 uppercase tracking-wider">Roll Number *</label>
                      <input
                        type="text"
                        placeholder="CS2026001"
                        value={manualRoll}
                        onChange={(e) => setManualRoll(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-405 uppercase tracking-wider">Email</label>
                      <input
                        type="email"
                        placeholder="alex@school.edu"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-405 uppercase tracking-wider">Branch/Sec</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="CS"
                          value={manualBranch}
                          onChange={(e) => setManualBranch(e.target.value)}
                          className="w-2/3 rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          placeholder="A"
                          value={manualSection}
                          onChange={(e) => setManualSection(e.target.value)}
                          className="w-1/3 rounded-xl border border-slate-205 bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-800 focus:border-brand-500 focus:outline-none dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddManualStudent}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{editingStudentId ? 'Update' : 'Add Student'}</span>
                    </button>
                  </div>

                  {/* Manual Entries Table List */}
                  <div className="pt-2">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2">Roster Table</h4>
                    <div className="border border-slate-150 rounded-2xl overflow-x-auto bg-white dark:bg-[#0F172A] dark:border-slate-800">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-150 bg-slate-50/50 dark:bg-slate-900/40 text-[9px] font-black text-slate-405 uppercase tracking-wider">
                            <th className="py-2.5 px-4">Student</th>
                            <th className="py-2.5 px-4">Roll Number</th>
                            <th className="py-2.5 px-4">Email</th>
                            <th className="py-2.5 px-4">Branch</th>
                            <th className="py-2.5 px-4">Section</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-700 dark:text-slate-300">
                          {selectedStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                                No manual roster entries yet. Type details and click Add Student above.
                              </td>
                            </tr>
                          ) : (
                            selectedStudents.map(student => {
                              const initials = (student.name || '').trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                              return (
                                <tr key={student._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                                  <td className="py-2 px-4 flex items-center space-x-2">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-black text-[10px] ${getAvatarBg(student.name || '')}`}>
                                      {initials || 'ST'}
                                    </div>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{student.name}</span>
                                  </td>
                                  <td className="py-2 px-4">{student.rollNumber}</td>
                                  <td className="py-2 px-4 text-slate-400 font-normal">{student.email || 'N/A'}</td>
                                  <td className="py-2 px-4">{student.branch || 'Gen'}</td>
                                  <td className="py-2 px-4">Sec {student.section || 'A'}</td>
                                  <td className="py-2 px-4 text-right space-x-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditManualStudent(student)}
                                      className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-all inline-flex items-center"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setStudentToRemove(student)}
                                      className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 transition-all inline-flex items-center"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-105 dark:border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setChoiceModalOpen(true)}
                  className="rounded-xl border border-slate-200 bg-white text-slate-655 font-bold py-2.5 px-6 text-sm hover:bg-slate-55 transition-all dark:bg-[#0F172A] dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-900"
                >
                  Back to Steps
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-brand-600 hover:bg-brand-705 text-white font-black py-2.5 px-8 text-sm shadow-premium transition-all flex items-center justify-center space-x-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Creating Classroom...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4.5 w-4.5" />
                      <span>Create Focus Room</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* --- INLINE OVERLAY 3: Confirm Student Removal --- */}
      {studentToRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-100 dark:border-slate-850 shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-505">
              <div className="p-2 bg-red-50 dark:bg-red-955/20 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-black text-slate-850 dark:text-slate-100">Confirm Member Removal</h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              Remove <span className="text-slate-800 dark:text-slate-200 underline font-black">{studentToRemove.name}</span> from Focus Room roster?
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2 text-[11px] font-bold border border-slate-205 bg-white hover:bg-slate-50 text-slate-655 rounded-xl transition-all dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveStudentConfirm}
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
