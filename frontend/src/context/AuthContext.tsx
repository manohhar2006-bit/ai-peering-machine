import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
}

export interface StudentProfile {
  xp: number;
  level: number;
  streak: number;
  coins: number;
  consecutiveSolves: number;
  badges: Array<{ badgeId: string; earnedAt: string }>;
  subjectReputation: Record<string, number>;
  resolvedDoubtsCount: number;
  participationCount: number;
}

export interface TeacherProfile {
  department: string;
  activeModerationCount: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  studentProfile: StudentProfile | null;
  teacherProfile: TeacherProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'student' | 'teacher', department?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Configure Axios default headers
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = response.data;
      setUser({
        id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role
      });
      if (data.user.role === 'student') {
        setStudentProfile(data.profile);
      } else {
        setTeacherProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: receivedToken, user: loggedUser } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(loggedUser);
      // fetch profile will run automatically due to token state change
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, role: 'student' | 'teacher', department?: string) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
        role,
        department
      });
      const { token: receivedToken, user: registeredUser } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      setUser(registeredUser);
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setTeacherProfile(null);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (token) {
      try {
        const response = await axios.get(`${API_URL}/auth/profile`);
        const data = response.data;
        if (data.user.role === 'student') {
          setStudentProfile(data.profile);
        } else {
          setTeacherProfile(data.profile);
        }
      } catch (err) {
        console.error('Error refreshing profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      studentProfile,
      teacherProfile,
      loading,
      login,
      register,
      logout,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
