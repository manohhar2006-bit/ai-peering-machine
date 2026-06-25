import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as doubtController from '../controllers/doubtController';
import * as answerController from '../controllers/answerController';
import * as hintController from '../controllers/hintController';
import * as analyticsController from '../controllers/analyticsController';
import * as aiController from '../controllers/aiController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { Subject } from '../models/Schemas';

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
router.post('/doubts/:id/escalate', authenticateToken, doubtController.escalateDoubt);

// Answer Routes
router.post('/answers', authenticateToken, requireRole('student'), answerController.submitAnswer);
router.get('/answers/doubt/:doubtId', authenticateToken, answerController.getDoubtAnswers);
router.post('/answers/:id/accept', authenticateToken, requireRole('student'), answerController.acceptAnswer);
router.post('/answers/:id/verify', authenticateToken, requireRole('teacher'), answerController.verifyAnswer);

// Hint Routes
router.post('/hints/request', authenticateToken, requireRole('student'), hintController.requestHint);
router.get('/hints/revealed/:doubtId', authenticateToken, requireRole('student'), hintController.getRevealedHints);

// Analytics and Leaderboard Routes
router.get('/leaderboard', authenticateToken, analyticsController.getLeaderboardData);
router.get('/analytics/student', authenticateToken, requireRole('student'), analyticsController.getStudentDashboardData);
router.get('/analytics/teacher', authenticateToken, requireRole('teacher'), analyticsController.getTeacherDashboardData);
router.get('/analytics/escalations', authenticateToken, requireRole('teacher'), analyticsController.getEscalationQueue);

// AI Learning Assistant Routes
router.post('/ai/analyze-doubt', authenticateToken, aiController.analyzeDoubt);
router.post('/ai/generate-hint', authenticateToken, aiController.generateHint);
router.post('/ai/evaluate-answer', authenticateToken, aiController.evaluateAnswer);
router.post('/ai/referee', authenticateToken, aiController.referee);
router.post('/ai/escalate', authenticateToken, aiController.escalate);

export default router;
