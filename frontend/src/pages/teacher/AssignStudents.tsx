import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Users, 
  CheckSquare, 
  Square, 
  UserCheck, 
  ArrowLeft, 
  Loader2, 
  Sparkles,
  Check
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface UnassignedStudent {
  _id: string;
  name: string;
  email: string;
  rollNumber?: string;
  branch?: string;
  section?: string;
}

export const AssignStudents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState<UnassignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection and form states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [section, setSection] = useState('CSE-A');
  const [batch, setBatch] = useState('2022-2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnassigned = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/allocation/unassigned-students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(response.data || []);
      } catch (err) {
        console.error('Failed to load unassigned students:', err);
        setError('Failed to load unassigned students.');
      } finally {
        setLoading(false);
      }
    };

    fetchUnassigned();
  }, []);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredIds: string[]) => {
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      // Unselect all filtered
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all filtered (merge without duplication)
      setSelectedIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert('Please select at least one student.');
      return;
    }
    if (!user || !user.id) {
      alert('Teacher credentials missing. Please log in again.');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/allocation/assign-students`,
        {
          teacherId: user.id,
          studentIds: selectedIds,
          section,
          batch
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setToastMessage(`Successfully assigned ${selectedIds.length} students to section ${section}!`);
      setTimeout(() => {
        navigate('/teacher/my-students');
      }, 1500);
    } catch (err) {
      console.error('Assign students failed:', err);
      setError('Could not complete student assignment. Please try again.');
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading unassigned students...</p>
        </div>
      </div>
    );
  }

  // Filter unassigned students by search query
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.rollNumber && s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedNames = students
    .filter(s => selectedIds.includes(s._id))
    .map(s => s.name);

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      {/* Back button and title */}
      <div className="flex items-center space-x-3">
        <Link 
          to="/teacher/my-students" 
          className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 text-slate-500 hover:text-slate-700 dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-405 dark:hover:text-slate-200 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black text-slate-850 dark:text-slate-100">Assign New Students</h2>
          <p className="text-slate-400 text-xs font-semibold">Allocate unassigned campus students to your mentoring profile</p>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-center text-xs font-bold dark:bg-emerald-955/20 dark:text-emerald-450 dark:border-emerald-900/30">
          {toastMessage}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30">
          {error}
        </div>
      )}

      <form onSubmit={handleAssign} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Setup details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Assignment Configuration
            </h3>

            {/* Section dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Section Selector</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
              >
                <option value="CSE-A">CSE-A (Computer Science Section A)</option>
                <option value="CSE-B">CSE-B (Computer Science Section B)</option>
                <option value="CSE-C">CSE-C (Computer Science Section C)</option>
                <option value="ECE-A">ECE-A (Electronics Section A)</option>
                <option value="IT-A">IT-A (Information Tech Section A)</option>
              </select>
            </div>

            {/* Batch input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batch Period</label>
              <input
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
                placeholder="e.g. 2022-2026"
                required
              />
            </div>
          </div>

          {/* Selected preview box */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Selected Group
              </h3>
              <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 px-2 py-0.5 rounded-md text-[10px] font-black">
                {selectedIds.length} Students
              </span>
            </div>

            {selectedIds.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">No students selected yet. Check boxes on the list to queue them.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedNames.map((name, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs font-bold text-slate-655 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="line-clamp-1">{name}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={selectedIds.length === 0 || assigning}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-150 disabled:dark:bg-slate-900 disabled:dark:text-slate-600 py-3 text-sm font-black text-white transition-all shadow-md transform hover:-translate-y-0.5 disabled:transform-none"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4.5 w-4.5" />
                  <span>Assign Selected Students</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Check list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-805 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-base font-black text-slate-805 dark:text-slate-100">
                Unassigned Students Database
              </h3>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700 dark:text-slate-200"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <Users className="mx-auto h-12 w-12 text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-xs text-slate-400 font-extrabold uppercase">No unassigned students found</p>
              </div>
            ) : (
              <div className="border border-slate-50 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center border-b border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(filteredStudents.map(s => s._id))}
                    className="mr-3 text-slate-500 dark:text-slate-405"
                  >
                    {filteredStudents.every(s => selectedIds.includes(s._id)) ? (
                      <CheckSquare className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
                    ) : (
                      <Square className="h-4.5 w-4.5" />
                    )}
                  </button>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Select All / Student Details</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredStudents.map(student => {
                    const isSelected = selectedIds.includes(student._id);
                    return (
                      <div
                        key={student._id}
                        onClick={() => handleToggleSelect(student._id)}
                        className={`px-4 py-3 flex items-center cursor-pointer transition-all hover:bg-slate-50/50 dark:hover:bg-slate-850/40 ${
                          isSelected ? 'bg-brand-50/5 dark:bg-brand-950/5' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="mr-3 text-slate-400 dark:text-slate-600 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4.5 w-4.5 text-brand-600 dark:text-brand-400" />
                          ) : (
                            <Square className="h-4.5 w-4.5" />
                          )}
                        </button>
                        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center w-full gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-205">{student.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold">{student.email}</p>
                          </div>
                          {student.rollNumber && (
                            <span className="bg-slate-50 text-slate-550 border border-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-black">
                              {student.rollNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
