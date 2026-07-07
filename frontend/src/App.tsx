import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Landing } from './pages/public/Landing';
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';
import { StudentDashboard } from './pages/student/Dashboard';
import { AskDoubt } from './pages/student/AskDoubt';
import { DoubtFeed } from './pages/student/DoubtFeed';
import { DoubtDetail } from './pages/student/DoubtDetail';
import { Leaderboard } from './pages/student/Leaderboard';
import { Rewards } from './pages/student/Rewards';
import { Profile } from './pages/student/Profile';
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { DoubtMonitoring } from './pages/teacher/DoubtMonitoring';
import { EscalationQueue } from './pages/teacher/EscalationQueue';
import { RewardRules } from './pages/teacher/RewardRules';
import { FocusRoomsList } from './pages/FocusRoomsList';
import { CreateFocusRoom } from './pages/CreateFocusRoom';
import { FocusRoomDetails } from './pages/FocusRoomDetails';

// Allocation & Progress Pages (Teacher & Student)
import { MyStudents } from './pages/teacher/MyStudents';
import { AssignStudents } from './pages/teacher/AssignStudents';
import { StudentProfile } from './pages/teacher/StudentProfile';
import { TeacherFocusRooms } from './pages/teacher/TeacherFocusRooms';
import { TeacherFocusRoomDetail } from './pages/teacher/TeacherFocusRoomDetail';
import { StudentProgressOverview } from './pages/teacher/StudentProgressOverview';
import { StudentFocusRooms } from './pages/student/StudentFocusRooms';
import { StudentFocusRoomDetail } from './pages/student/StudentFocusRoomDetail';

// Auth Guard component for logged-in users
const RequireAuth: React.FC<{ children: React.ReactNode; allowedRole?: 'student' | 'teacher' }> = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />;
  }

  return <>{children}</>;
};

// Layout component grouping Navbar, Sidebar and main section
const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300 min-h-[calc(100vh-4rem)]">
          <Routes>
            {/* Student Pages */}
            <Route path="/student/dashboard" element={<RequireAuth allowedRole="student"><StudentDashboard /></RequireAuth>} />
            <Route path="/ask-doubt" element={<RequireAuth allowedRole="student"><AskDoubt /></RequireAuth>} />
            <Route path="/feed" element={<RequireAuth allowedRole="student"><DoubtFeed /></RequireAuth>} />
            <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
            <Route path="/rewards" element={<RequireAuth allowedRole="student"><Rewards /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth allowedRole="student"><Profile /></RequireAuth>} />
            
            {/* Student Focus Rooms */}
            <Route path="/student/focus-rooms" element={<RequireAuth allowedRole="student"><StudentFocusRooms /></RequireAuth>} />
            <Route path="/student/focus-rooms/:roomId" element={<RequireAuth allowedRole="student"><StudentFocusRoomDetail /></RequireAuth>} />
            
            {/* General Doubt Detail - both Student and Teacher can open */}
            <Route path="/doubt/:id" element={<RequireAuth><DoubtDetail /></RequireAuth>} />

            {/* Focus Rooms Pages */}
            <Route path="/focus-rooms" element={<RequireAuth><FocusRoomsList /></RequireAuth>} />
            <Route path="/focus-rooms/create" element={<RequireAuth allowedRole="teacher"><CreateFocusRoom /></RequireAuth>} />
            <Route path="/focus-rooms/:id" element={<RequireAuth><FocusRoomDetails /></RequireAuth>} />

            {/* Teacher Pages */}
            <Route path="/teacher/dashboard" element={<RequireAuth allowedRole="teacher"><TeacherDashboard /></RequireAuth>} />
            <Route path="/teacher/my-students" element={<RequireAuth allowedRole="teacher"><MyStudents /></RequireAuth>} />
            <Route path="/teacher/assign-students" element={<RequireAuth allowedRole="teacher"><AssignStudents /></RequireAuth>} />
            <Route path="/teacher/student/:studentId" element={<RequireAuth allowedRole="teacher"><StudentProfile /></RequireAuth>} />
            <Route path="/teacher/focus-rooms" element={<RequireAuth allowedRole="teacher"><TeacherFocusRooms /></RequireAuth>} />
            <Route path="/teacher/focus-rooms/:roomId" element={<RequireAuth allowedRole="teacher"><TeacherFocusRoomDetail /></RequireAuth>} />
            <Route path="/teacher/progress" element={<RequireAuth allowedRole="teacher"><StudentProgressOverview /></RequireAuth>} />
            <Route path="/teacher/monitoring" element={<RequireAuth allowedRole="teacher"><DoubtMonitoring /></RequireAuth>} />
            <Route path="/teacher/escalations" element={<RequireAuth allowedRole="teacher"><EscalationQueue /></RequireAuth>} />
            <Route path="/teacher/analytics" element={<RequireAuth allowedRole="teacher"><TeacherDashboard /></RequireAuth>} />
            <Route path="/teacher/rules" element={<RequireAuth allowedRole="teacher"><RewardRules /></RequireAuth>} />

            {/* Redirects */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<><Navbar /><Landing /></>} />
            <Route path="/login" element={<><Navbar /><Login /></>} />
            <Route path="/register" element={<><Navbar /><Register /></>} />

            {/* Layout Protected Pages */}
            <Route path="/*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
