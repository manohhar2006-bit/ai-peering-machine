import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/analyze-doubt', authenticateToken, aiController.analyzeDoubt);
router.post('/generate-hint', authenticateToken, aiController.generateHint);
router.post('/chat-coach', authenticateToken, aiController.chatCoach);
router.post('/evaluate-answer', authenticateToken, aiController.evaluateAnswer);
router.post('/chat', authenticateToken, aiController.chatAssistant);

// Referee routes
router.post('/referee', authenticateToken, aiController.referee);
router.get('/referee-history/:doubtId', authenticateToken, aiController.getRefereeHistory);
router.post('/referee-override', authenticateToken, aiController.refereeOverride);

router.post('/escalate', authenticateToken, aiController.escalate);
router.get('/test', aiController.testGemini);

export default router;
