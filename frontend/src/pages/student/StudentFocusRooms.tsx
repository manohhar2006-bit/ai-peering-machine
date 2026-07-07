import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, 
  BookOpen, 
  Target, 
  ChevronRight, 
  Loader2, 
  Sparkles,
  Award
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

interface FocusRoom {
  _id: string;
  name: string;
  subject: string;
  topic: string;
  description: string;
  teacher: {
    _id: string;
    name: string;
  };
  questions: any[];
}

export const StudentFocusRooms: React.FC = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<FocusRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/focus-room/my-rooms-student`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRooms(response.data || []);
      } catch (err) {
        console.error('Failed to load student focus rooms:', err);
        setError('Failed to retrieve Focus Rooms. Make sure backend is running.');
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
          <p className="text-sm font-semibold text-slate-400">Loading your focus rooms...</p>
        </div>
      </div>
    );
  }

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
          <h2 className="text-3xl font-black tracking-tight">My Focus Rooms</h2>
          <p className="text-brand-100 text-sm leading-relaxed">
            Collaborate in targeted spaces set up by your teacher. Answer customized practice questions, consult the AI coach for hints, and gain XP with your peers!
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs dark:bg-rose-955/20 dark:text-rose-455">
          {error}
        </div>
      )}

      {/* Grid of rooms */}
      {rooms.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-16 text-center shadow-sm dark:bg-[#1E293B] dark:border-slate-800 transition-colors">
          <Users className="mx-auto h-16 w-16 text-slate-205 dark:text-slate-655 mb-4" />
          <h3 className="text-lg font-black text-slate-700 dark:text-slate-200">No Enrolled Focus Rooms</h3>
          <p className="text-sm text-slate-405 mt-2 max-w-md mx-auto">
            You are not currently enrolled in any Focus Rooms. Teachers assign students manually to help them target specific weak topics or review challenging material.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const questionCount = room.questions ? room.questions.length : 0;
            return (
              <div
                key={room._id}
                onClick={() => navigate(`/student/focus-rooms/${room._id}`)}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-premium dark:bg-[#1E293B] dark:border-slate-805 hover:border-brand-200/50 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header tags */}
                  <div className="flex justify-between items-start">
                    <span className="bg-brand-50 text-brand-605 dark:bg-brand-950/20 dark:text-brand-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                      {room.subject || 'GENERAL'}
                    </span>
                    <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                      Teacher: {room.teacher?.name || 'Faculty Member'}
                    </span>
                  </div>

                  {/* Title and details */}
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-805 dark:text-slate-100 group-hover:text-brand-605 dark:group-hover:text-brand-400 transition-colors text-base line-clamp-1">
                      {room.name}
                    </h3>
                    <p className="text-xs font-semibold text-brand-500 dark:text-brand-400 flex items-center space-x-1">
                      <Target className="h-3.5 w-3.5" />
                      <span>Topic: {room.topic || 'General Concepts'}</span>
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                      {room.description || 'Focus classroom for targeted topic peer discussions.'}
                    </p>
                  </div>

                  {/* Question count summary */}
                  <div className="pt-2.5 border-t border-slate-50 dark:border-slate-800/40 flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Practice Pool</span>
                    <span className="font-extrabold text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md text-[11px] flex items-center space-x-1">
                      <BookOpen className="h-3.5 w-3.5 text-brand-500" />
                      <span>{questionCount} Questions</span>
                    </span>
                  </div>
                </div>

                {/* Footer details */}
                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-805 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-wider flex items-center space-x-1">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    <span>XP Rewards Active</span>
                  </span>

                  <div className="flex items-center space-x-1 text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-all">
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
