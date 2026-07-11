import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as doubtController from '../controllers/doubtController';
import * as answerController from '../controllers/answerController';
import * as hintController from '../controllers/hintController';
import * as analyticsController from '../controllers/analyticsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Subject } from '../models/Schemas';
import aiRoutes from './aiRoutes';
import focusRoomRouter from './focusRoomRoutes';
import * as focusRoomController from '../controllers/focusRoomController';
import allocationRouter from './allocationRoutes';
import progressRouter from './progressRoutes';

const router = Router();

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);

// Subject Routes
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.status(200).json(subjects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve subjects' });
  }
});

// Doubt Routes
router.post('/doubts', authenticateToken, requireRole('student'), doubtController.createDoubt);
router.get('/doubts', authenticateToken, doubtController.getDoubtsFeed);
router.get('/doubts/:id', authenticateToken, doubtController.getDoubtDetails);
router.put('/doubts/:id', authenticateToken, requireRole('student'), doubtController.updateDoubt);
router.delete('/doubts/:id', authenticateToken, requireRole('student'), doubtController.deleteDoubt);
router.post('/doubts/:id/escalate', authenticateToken, doubtController.escalateDoubt);
router.patch('/doubts/:id/status', authenticateToken, doubtController.updateDoubtStatus);
router.put('/doubts/:id/settings', authenticateToken, requireRole('teacher'), doubtController.updateDoubtSettings);
router.post('/doubts/:id/grant-permission', authenticateToken, requireRole('teacher'), doubtController.grantStudentPermission);

// Answer Routes
router.post('/answers', authenticateToken, requireRole('student'), answerController.submitAnswer);
router.get('/answers/my-solutions', authenticateToken, requireRole('student'), answerController.getMySolutions);
router.get('/answers/doubt/:doubtId', authenticateToken, answerController.getDoubtAnswers);
router.post('/answers/:id/accept', authenticateToken, requireRole('student'), answerController.acceptAnswer);
router.post('/answers/:id/verify', authenticateToken, requireRole('teacher'), answerController.verifyAnswer);
router.post('/answers/:id/decision', authenticateToken, requireRole('teacher'), answerController.teacherDecision);
router.post('/answers/:id/upvote', authenticateToken, answerController.upvoteAnswer);


// Hint Routes
router.post('/hints/request', authenticateToken, requireRole('student'), hintController.requestHint);
router.get('/hints/revealed/:doubtId', authenticateToken, hintController.getRevealedHints);

// Analytics and Leaderboard Routes
router.get('/leaderboard', authenticateToken, analyticsController.getLeaderboardData);
router.get('/analytics/student', authenticateToken, requireRole('student'), analyticsController.getStudentDashboardData);
router.get('/analytics/teacher', authenticateToken, requireRole('teacher'), analyticsController.getTeacherDashboardData);
router.get('/analytics/escalations', authenticateToken, requireRole('teacher'), analyticsController.getEscalationQueue);
router.get('/analytics/workload', authenticateToken, analyticsController.getWorkloadData);
router.get('/analytics/weekly-trend', authenticateToken, analyticsController.getWeeklyTrendData);
router.get('/analytics/topic-heatmap', authenticateToken, analyticsController.getTopicHeatmapData);

// AI Learning Assistant Routes
router.use('/ai', aiRoutes);

// Allocation Routes
router.use('/allocation', allocationRouter);

// Progress Routes
router.use('/progress', progressRouter);

// Focus Room Routes
router.use('/focus-rooms', focusRoomRouter);
router.use('/focus-room', focusRoomRouter);

// Notification Routes
router.get('/notifications', authenticateToken, focusRoomController.getUserNotifications);
router.post('/notifications/:id/read', authenticateToken, focusRoomController.markNotificationRead);

export default router;
