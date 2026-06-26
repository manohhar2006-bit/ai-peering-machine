import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, StudentProfile, TeacherProfile } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { GamificationService } from '../services/gamificationService';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (role !== 'student' && role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      passwordHash,
      role
    });
    await user.save();

    if (role === 'student') {
      const studentProfile = new StudentProfile({
        userId: user._id
      });
      await studentProfile.save();
    } else {
      const teacherProfile = new TeacherProfile({
        userId: user._id,
        department: department || 'General'
      });
      await teacherProfile.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwttokenkeyforpeerdoubtplatform1234!',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid email or password' });
    }

    // Update streak on login if student
    if (user.role === 'student') {
      await GamificationService.updateStreak(user._id.toString());
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecretjwttokenkeyforpeerdoubtplatform1234!',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'student') {
      const profile = await StudentProfile.findOne({ userId: user._id });
      return res.status(200).json({ user, profile });
    } else {
      const profile = await TeacherProfile.findOne({ userId: user._id });
      return res.status(200).json({ user, profile });
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to retrieve profile' });
  }
};
