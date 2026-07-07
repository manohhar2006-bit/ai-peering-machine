import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import { User, StudentProfile, Doubt, Answer, HintHistory, StudentProgress } from '../models/Schemas';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);
router.use(requireRole('teacher'));

// POST /api/allocation/assign-students
router.post('/assign-students', async (req: AuthRequest, res: Response) => {
  try {
    const { teacherId, studentIds, section, batch } = req.body;

    if (!teacherId || !studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'Teacher ID and student IDs list are required.' });
    }

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ message: 'Teacher not found.' });
    }

    // Update each student's assignedTeacher, section, batch, and department (inherited from teacher)
    for (const studentId of studentIds) {
      await User.findByIdAndUpdate(studentId, {
        assignedTeacher: teacherId,
        section: section || '',
        batch: batch || '',
        department: teacher.department || ''
      });
    }

    // Update teacher's assignedStudents list (without duplicate values)
    const currentStudents = teacher.assignedStudents ? teacher.assignedStudents.map(id => id.toString()) : [];
    const newStudentIds = studentIds.filter(id => !currentStudents.includes(id));
    
    if (newStudentIds.length > 0) {
      if (!teacher.assignedStudents) teacher.assignedStudents = [];
      newStudentIds.forEach(id => {
        teacher.assignedStudents!.push(new mongoose.Types.ObjectId(id) as any);
      });
      await teacher.save();
    }

    res.status(200).json({
      message: 'Students assigned successfully.',
      teacher: {
        id: teacher._id,
        name: teacher.name,
        assignedStudentsCount: teacher.assignedStudents ? teacher.assignedStudents.length : 0
      }
    });
  } catch (err) {
    console.error('Assign students error:', err);
    res.status(500).json({ message: 'Failed to assign students.' });
  }
});

// GET /api/allocation/my-students
router.get('/my-students', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;

    const students = await User.find({ assignedTeacher: teacherId, role: 'student' });
    const studentsData = [];

    let slowLearnersCount = 0;
    let activeCount = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const student of students) {
      const profile = await StudentProfile.findOne({ userId: student._id });
      const doubtsPosted = await Doubt.countDocuments({ askerId: student._id });
      
      const lastActive = profile?.lastActive || student.createdAt;
      const isSlowLearner = student.isSlowLearner || false;

      if (isSlowLearner) slowLearnersCount++;
      if (lastActive >= sevenDaysAgo) activeCount++;

      studentsData.push({
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber || '',
        section: student.section || '',
        batch: student.batch || '',
        department: student.department || '',
        performanceLevel: student.performanceLevel || 'average',
        isSlowLearner,
        weakTopics: student.weakTopics || [],
        xp: profile?.xp || 0,
        streak: profile?.streak || 0,
        doubtsPosted,
        doubtsResolved: profile?.resolvedDoubtsCount || 0,
        lastActive
      });
    }

    res.status(200).json({
      students: studentsData,
      totalCount: students.length,
      slowLearnersCount,
      activeCount
    });
  } catch (err) {
    console.error('Get my students error:', err);
    res.status(500).json({ message: 'Failed to retrieve students.' });
  }
});

// GET /api/allocation/student-profile/:studentId
router.get('/student-profile/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).select('-passwordHash');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const profile = await StudentProfile.findOne({ userId: studentId });

    // Aggregate stats
    const totalDoubts = await Doubt.countDocuments({ askerId: studentId });
    const resolvedDoubts = await Doubt.countDocuments({ 
      askerId: studentId, 
      status: { $in: ['peer_solved', 'teacher_solved'] } 
    });
    const totalAnswers = await Answer.countDocuments({ solverId: studentId });
    const correctAnswers = await Answer.countDocuments({ solverId: studentId, isAccepted: true });
    const hintsUsed = await HintHistory.countDocuments({ userId: studentId, ladderIndex: { $gte: 0 } });

    const recentDoubts = await Doubt.find({ askerId: studentId })
      .sort({ createdAt: -1 })
      .limit(5);

    const weeklyProgress = await StudentProgress.find({ student: studentId })
      .sort({ year: 1, weekNumber: 1 });

    res.status(200).json({
      student,
      stats: {
        totalDoubts,
        resolvedDoubts,
        totalAnswers,
        correctAnswers,
        hintsUsed,
        xp: profile?.xp || 0,
        streak: profile?.streak || 0,
        badges: profile?.badges || [],
        performanceLevel: student.performanceLevel || 'average'
      },
      weakTopics: student.weakTopics || [],
      strongTopics: (weeklyProgress.length > 0) ? weeklyProgress[weeklyProgress.length - 1].strongTopics : [],
      recentDoubts,
      weeklyProgress
    });
  } catch (err) {
    console.error('Get student profile error:', err);
    res.status(500).json({ message: 'Failed to retrieve student profile.' });
  }
});

// PUT /api/allocation/update-student/:studentId
router.put('/update-student/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { section, batch, department, rollNumber, isSlowLearner, performanceLevel } = req.body;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (section !== undefined) student.section = section;
    if (batch !== undefined) student.batch = batch;
    if (department !== undefined) student.department = department;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (isSlowLearner !== undefined) student.isSlowLearner = isSlowLearner;
    if (performanceLevel !== undefined) student.performanceLevel = performanceLevel;

    await student.save();
    res.status(200).json(student);
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ message: 'Failed to update student.' });
  }
});

// DELETE /api/allocation/remove-student/:studentId
router.delete('/remove-student/:studentId', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const teacherId = req.user?.userId;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Reset assignedTeacher
    student.assignedTeacher = null;
    await student.save();

    // Pull from teacher's assignedStudents list
    const teacher = await User.findById(teacherId);
    if (teacher && teacher.assignedStudents) {
      teacher.assignedStudents = teacher.assignedStudents.filter(id => id.toString() !== studentId);
      await teacher.save();
    }

    res.status(200).json({ message: 'Student removed from teacher successfully.' });
  } catch (err) {
    console.error('Remove student error:', err);
    res.status(500).json({ message: 'Failed to remove student.' });
  }
});

// GET /api/allocation/unassigned-students
router.get('/unassigned-students', async (req: AuthRequest, res: Response) => {
  try {
    const unassigned = await User.find({ 
      role: 'student', 
      $or: [{ assignedTeacher: null }, { assignedTeacher: { $exists: false } }] 
    }).select('-passwordHash');

    res.status(200).json(unassigned);
  } catch (err) {
    console.error('Get unassigned students error:', err);
    res.status(500).json({ message: 'Failed to retrieve unassigned students.' });
  }
});

// POST /api/allocation/mark-slow-learner
router.post('/mark-slow-learner', async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, isSlowLearner, weakTopics } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required.' });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (isSlowLearner !== undefined) student.isSlowLearner = isSlowLearner;
    if (weakTopics !== undefined) student.weakTopics = weakTopics;

    await student.save();
    res.status(200).json(student);
  } catch (err) {
    console.error('Mark slow learner error:', err);
    res.status(500).json({ message: 'Failed to update student state.' });
  }
});

// GET /api/allocation/slow-learners
router.get('/slow-learners', async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const slowLearners = await User.find({ 
      assignedTeacher: teacherId, 
      role: 'student',
      isSlowLearner: true 
    }).select('-passwordHash');

    res.status(200).json(slowLearners);
  } catch (err) {
    console.error('Get slow learners error:', err);
    res.status(500).json({ message: 'Failed to retrieve slow learners.' });
  }
});

export default router;
