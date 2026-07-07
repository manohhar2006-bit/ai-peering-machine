import { Router } from 'express';
import * as focusRoomController from '../controllers/focusRoomController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// New Focus Room Routes (evaluated first to avoid route parameter collision)
router.post('/create', authenticateToken, requireRole('teacher'), focusRoomController.createFocusRoomNew);
router.get('/my-rooms', authenticateToken, requireRole('teacher'), focusRoomController.getMyRoomsTeacher);
router.get('/my-rooms-student', authenticateToken, requireRole('student'), focusRoomController.getMyRoomsStudent);
router.post('/:roomId/add-students', authenticateToken, requireRole('teacher'), focusRoomController.addStudentsToFocusRoom);
router.post('/:roomId/add-question', authenticateToken, requireRole('teacher'), focusRoomController.addQuestionToFocusRoom);
router.post('/:roomId/add-questions', authenticateToken, requireRole('teacher'), focusRoomController.addQuestionsBulk);
router.post('/:roomId/generate-questions', authenticateToken, requireRole('teacher'), focusRoomController.generateQuestionsWithAI);
router.get('/:roomId', authenticateToken, focusRoomController.getFocusRoomDetailsNew);
router.post('/:roomId/questions/:questionIndex/answer', authenticateToken, requireRole('student'), focusRoomController.submitFocusRoomAnswer);

// Student search (Teacher only)
router.get('/students/search', authenticateToken, requireRole('teacher'), focusRoomController.searchStudents);

// Room CRUD
router.post('/', authenticateToken, requireRole('teacher'), focusRoomController.createFocusRoom);
router.get('/', authenticateToken, focusRoomController.listFocusRooms);
router.get('/:id', authenticateToken, focusRoomController.getFocusRoomDetails);
router.put('/:id', authenticateToken, requireRole('teacher'), focusRoomController.updateFocusRoom);
router.delete('/:id', authenticateToken, requireRole('teacher'), focusRoomController.deleteFocusRoom);

// Resource Upload and Completion
router.post('/:id/resources', authenticateToken, focusRoomController.uploadResource);
router.post('/:id/resources/:resourceId/complete', authenticateToken, requireRole('student'), focusRoomController.completeResource);

// Discussion / doubts / comments
router.get('/:id/resources/:resourceId/discussion', authenticateToken, focusRoomController.getDiscussionThread);
router.post('/:id/resources/:resourceId/discussion', authenticateToken, focusRoomController.postDiscussionMessage);
router.post('/:id/resources/:resourceId/discussion/:messageId/upvote', authenticateToken, focusRoomController.upvoteDiscussionMessage);

// AI Assistant
router.post('/:id/resources/:resourceId/discussion/:messageId/hint', authenticateToken, focusRoomController.aiRequestHint);
router.post('/:id/resources/:resourceId/discussion/:messageId/evaluate', authenticateToken, focusRoomController.aiEvaluateReply);
router.post('/:id/resources/:resourceId/discussion/:messageId/referee', authenticateToken, focusRoomController.aiRefereeReplies);
router.post('/:id/resources/:resourceId/discussion/:messageId/escalate', authenticateToken, focusRoomController.aiEscalateDoubt);

// Teacher Bonus XP
router.post('/:id/resources/:resourceId/discussion/:messageId/award-bonus', authenticateToken, requireRole('teacher'), focusRoomController.awardTeacherBonus);

// Room Analytics
router.get('/:id/analytics', authenticateToken, focusRoomController.getRoomAnalytics);

// Student Management
router.get('/:id/members', authenticateToken, focusRoomController.getFocusRoomMembers);
router.post('/:id/members', authenticateToken, requireRole('teacher'), focusRoomController.addFocusRoomMembers);
router.post('/:id/members/manual', authenticateToken, requireRole('teacher'), focusRoomController.addFocusRoomMemberManually);
router.delete('/:id/members/:studentId', authenticateToken, requireRole('teacher'), focusRoomController.removeFocusRoomMember);

export default router;
