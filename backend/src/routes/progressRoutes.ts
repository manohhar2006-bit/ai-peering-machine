import { Router, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { User, StudentProfile, Doubt, Answer, HintHistory, StudentProgress, PointTransaction } from '../models/Schemas';
import * as geminiService from '../services/geminiService';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(requireRole('teacher'));

// Helper to calculate week number
const getWeekNumber = (date: Date) => {
  const t = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  t.setDate(t.getDate() - dayNumber + 3);
  const firstThursday = t.valueOf();
  t.setMonth(0, 1);
  if (t.getDay() !== 4) {
    t.setMonth(0, 1 + ((4 - t.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - t.valueOf()) / 604800000);
};

// Helper to get or create progress document
async function getOrCreateStudentProgress(studentId: string, teacherId: string, weekNumber: number, year: number) {
  let progress = await StudentProgress.findOne({ student: studentId, teacher: teacherId, weekNumber, year });
  
  if (!progress) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const doubtsPosted = await Doubt.countDocuments({ askerId: studentId, createdAt: { $gte: sevenDaysAgo } });
    const doubtsResolved = await Doubt.countDocuments({ askerId: studentId, status: { $in: ['peer_solved', 'teacher_solved'] }, createdAt: { $gte: sevenDaysAgo } });
    const answersGiven = await Answer.countDocuments({ solverId: studentId, createdAt: { $gte: sevenDaysAgo } });
    const correctAnswers = await Answer.countDocuments({ solverId: studentId, isAccepted: true, createdAt: { $gte: sevenDaysAgo } });
    const hintsUsed = await HintHistory.countDocuments({ userId: studentId, ladderIndex: { $gte: 0 }, revealedAt: { $gte: sevenDaysAgo } });
    
    const profile = await StudentProfile.findOne({ userId: studentId });
    const txs = await PointTransaction.find({ userId: studentId, createdAt: { $gte: sevenDaysAgo } });
    const xpEarned = txs.reduce((acc, t) => acc + t.points, 0);
    const streakDays = profile?.streak || 0;
    
    const student = await User.findById(studentId);
    const weakTopics = student?.weakTopics || [];

    // Calculate previous week's performance score to compute real improvement
    let prevWeekNum = weekNumber - 1;
    let prevYear = year;
    if (prevWeekNum === 0) {
      prevWeekNum = 52;
      prevYear = year - 1;
    }
    const prevProgress = await StudentProgress.findOne({ student: studentId, weekNumber: prevWeekNum, year: prevYear });
    const prevScore = prevProgress ? prevProgress.performanceScore : 0;

    const performanceScore = Math.min(100, Math.round(((doubtsResolved + correctAnswers * 2) * 10) + (xpEarned / 10)));
    const improvementPercent = prevScore > 0 ? Math.max(0, Math.round(((performanceScore - prevScore) / prevScore) * 100)) : 0;
    
    progress = new StudentProgress({
      student: studentId,
      teacher: teacherId,
      weekNumber,
      year,
      doubtsPosted,
      doubtsResolved,
      answersGiven,
      correctAnswers,
      hintsUsed,
      xpEarned,
      streakDays,
      weakTopics,
      strongTopics: [],
      performanceScore,
      improvementPercent,
      aiGeneratedReport: ''
    });
    
    await progress.save();
  }
  
  return progress;
}

// GET /api/progress/student/:studentId
router.get('/student/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user?.userId;

    const progressRecords = await StudentProgress.find({ student: studentId, teacher: teacherId })
      .sort({ year: 1, weekNumber: 1 });

    res.status(200).json(progressRecords);
  } catch (err) {
    console.error('Get student progress error:', err);
    res.status(500).json({ message: 'Failed to retrieve progress records.' });
  }
});

// GET /api/progress/all-students
router.get('/all-students', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const d = new Date();
    const week = getWeekNumber(d);
    const year = d.getFullYear();

    // Find all students assigned to this teacher
    const students = await User.find({ assignedTeacher: teacherId, role: 'student' });
    const progressList = [];

    for (const student of students) {
      const progress = await getOrCreateStudentProgress(student._id.toString(), teacherId!, week, year);
      
      progressList.push({
        id: progress._id,
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber || '',
          section: student.section || '',
          batch: student.batch || '',
          performanceLevel: student.performanceLevel || 'average',
          isSlowLearner: student.isSlowLearner || false
        },
        weekNumber: progress.weekNumber,
        year: progress.year,
        doubtsPosted: progress.doubtsPosted,
        doubtsResolved: progress.doubtsResolved,
        answersGiven: progress.answersGiven,
        correctAnswers: progress.correctAnswers,
        hintsUsed: progress.hintsUsed,
        xpEarned: progress.xpEarned,
        streakDays: progress.streakDays,
        performanceScore: progress.performanceScore,
        improvementPercent: progress.improvementPercent,
        aiGeneratedReport: progress.aiGeneratedReport
      });
    }

    res.status(200).json(progressList);
  } catch (err) {
    console.error('Get all students progress error:', err);
    res.status(500).json({ message: 'Failed to retrieve students progress.' });
  }
});

// POST /api/progress/generate-report/:studentId
router.post('/generate-report/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user?.userId;
    const d = new Date();
    const week = getWeekNumber(d);
    const year = d.getFullYear();

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const progress = await getOrCreateStudentProgress(studentId, teacherId!, week, year);
    
    // Build stats for Gemini prompt
    const stats = {
      name: student.name,
      weekNumber: week,
      year: year,
      doubtsPosted: progress.doubtsPosted,
      doubtsResolved: progress.doubtsResolved,
      answersGiven: progress.answersGiven,
      correctAnswers: progress.correctAnswers,
      hintsUsed: progress.hintsUsed,
      xpEarned: progress.xpEarned,
      streakDays: progress.streakDays,
      weakTopics: student.weakTopics || [],
      performanceLevel: student.performanceLevel || 'average'
    };

    // Generate report text
    const reportText = await geminiService.generateWeeklyProgressReport(stats);

    // Save report to progress record
    progress.aiGeneratedReport = reportText;
    await progress.save();

    res.status(200).json({
      success: true,
      report: reportText,
      updatedAt: new Date()
    });
  } catch (err) {
    console.error('Generate weekly report error:', err);
    res.status(500).json({ message: 'Failed to generate weekly progress report.' });
  }
});

export default router;
