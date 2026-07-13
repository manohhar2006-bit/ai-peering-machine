import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Plus, 
  Calendar, 
  BookOpen, 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  Target, 
  Eye, 
  EyeOff, 
  Loader2 
} from 'lucide-react';

const isProd = import.meta.env.PROD || import.meta.env.MODE === 'production';
const defaultApiUrl = isProd ? 'https://ai-peering-machine.onrender.com/api' : 'http://localhost:5000';
const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api$/, '');
const API_URL = `${API_BASE_URL}/api`;

export const FocusRoomsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/focus-rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRooms(response.data);
      } catch (err) {
        console.error('Failed to load focus rooms:', err);
        setError('Could not retrieve focus rooms. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-sm font-semibold text-slate-400">Loading focus classrooms...</p>
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === 'teacher';

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="rounded-3xl bg-gradient-to-tr from-brand-800 via-indigo-650 to-indigo-500 p-8 text-white shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-yellow-350 fill-yellow-350 animate-pulse" />
            <span>Targeted Collaborative Learning Spaces</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">AI-Assisted Focus Rooms</h2>
          <p className="text-brand-100 text-sm leading-relaxed">
            {isTeacher 
              ? 'Create custom focus groups for specific topics, upload files, assign target students, and review granular peer learning metrics and workload analytics.' 
              : 'Join teacher-assigned focus classrooms to resolve deadlock notes, download concept templates, consult the AI Learning Coach, and earn bonus XP with classmates.'
            }
          </p>
        </div>
        
        {isTeacher && (
          <div className="mt-6">
            <Link
              to="/focus-rooms/create"
              className="inline-flex items-center space-x-2 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-brand-700 shadow-md hover:bg-slate-50 transition-all transform hover:-translate-y-0.5"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Create Focus Room</span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs dark:bg-rose-955/20 dark:text-rose-400 dark:border-rose-900/30">
          {error}
        </div>
      )}

      {/* Grid of rooms */}
      {rooms.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors duration-300">
          <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No Focus Rooms Available</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {isTeacher 
              ? 'You have not created any focus rooms yet. Get started by clicking "Create Focus Room" above.' 
              : 'You are currently not enrolled in any focus rooms. Teachers manually assign students based on performance.'
            }
          </p>
          {isTeacher && (
            <Link
              to="/focus-rooms/create"
              className="mt-5 inline-flex items-center space-x-2 rounded-xl bg-brand-600 hover:bg-brand-705 px-4 py-2.5 text-xs font-bold text-white transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Room</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const deadlineDate = new Date(room.deadline);
            const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft < 0;

            return (
              <div
                key={room._id}
                onClick={() => navigate(`/focus-rooms/${room._id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-premium dark:bg-[#1E293B] dark:border-slate-800 hover:border-brand-200/50 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header tags */}
                  <div className="flex justify-between items-start">
                    <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {room.subjectId?.code || 'GEN'}
                    </span>
                    <div className="flex space-x-1.5 items-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        room.visibility === 'public'
                          ? 'bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400'
                      }`}>
                        {room.visibility === 'public' ? <Eye className="h-3 w-3 inline" /> : <EyeOff className="h-3 w-3 inline" />}
                        <span className="capitalize">{room.visibility}</span>
                      </span>
                    </div>
                  </div>

                  {/* Title and details */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors text-base line-clamp-1">
                      {room.name}
                    </h3>
                    <p className="text-xs font-semibold text-brand-500 dark:text-brand-400 flex items-center space-x-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>Topic: {room.topic}</span>
                    </p>
                    <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {room.description || 'Focus classroom for targeted peer group doubt discussions.'}
                    </p>
                  </div>

                  {/* Progress and Student count section */}
                  <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40 space-y-2.5">
                    {!isTeacher && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase">
                          <span>Activity Progress</span>
                          <span className="text-brand-605 dark:text-brand-400">{room.progress || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full dark:bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-brand-500 rounded-full transition-all duration-500" 
                            style={{ width: `${room.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Members</span>
                      <span className="font-extrabold text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md text-[11px]">
                        {room.studentCount || 0} Students
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Calendar className="h-3.5 w-3.5" />
                    {isOverdue ? (
                      <span className="text-red-500">Expired</span>
                    ) : (
                      <span>{daysLeft} days left</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-bold text-brand-600 dark:text-brand-405 group-hover:translate-x-1 transition-all">
                    <span>Enter Room</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
