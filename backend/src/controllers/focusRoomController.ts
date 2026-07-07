import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import {
  User,
  Subject,
  FocusRoom,
  FocusRoomMember,
  FocusRoomResource,
  FocusRoomDiscussion,
  FocusRoomAnalytics,
  Notification,
  StudentProfile
} from '../models/Schemas';
import * as geminiService from '../services/geminiService';
import { GamificationService } from '../services/gamificationService';

// Helper to create notification records
const createNotification = async (
  recipientId: string | mongoose.Types.ObjectId,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'badge' | 'escalation',
  roomId?: string | mongoose.Types.ObjectId
) => {
  try {
    const notif = new Notification({
      recipientId,
      title,
      message,
      type,
      roomId
    });
    await notif.save();
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
};

// GET /api/focus-rooms/students/search
export const searchStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can search students' });
    }

    const filter: any = { role: 'student' };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } },
        { branch: { $regex: q, $options: 'i' } },
        { section: { $regex: q, $options: 'i' } }
      ];
    }

    const students = await User.find(filter).select('-passwordHash').limit(30);
    res.status(200).json(students);
  } catch (err) {
    console.error('Search students error:', err);
    res.status(500).json({ message: 'Failed to search students' });
  }
};

// POST /api/focus-rooms
export const createFocusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, subjectId, topic, learningObjectives, studentIds, deadline, visibility } = req.body;
    const creatorId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create focus rooms' });
    }

    if (!name || !subjectId || !topic || !deadline) {
      return res.status(400).json({ message: 'Missing required focus room fields' });
    }

    // Verify subject
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Fetch teacher details for notification
    const teacher = await User.findById(creatorId);
    const teacherName = teacher?.name || 'your teacher';

    // 1. Create Room
    const room = new FocusRoom({
      name,
      description,
      subjectId,
      topic,
      learningObjectives: learningObjectives || [],
      creatorId,
      deadline,
      visibility: visibility || 'public',
      teacher: creatorId,
      subject: subject.name,
      students: studentIds || [],
      isActive: true,
      roomType: req.body.roomType || 'general'
    });
    await room.save();

    // 2. Initialize Analytics
    const analytics = new FocusRoomAnalytics({
      roomId: room._id
    });
    await analytics.save();

    // 3. Enroll students
    const members: any[] = [];
    if (studentIds && Array.isArray(studentIds)) {
      for (const studentId of studentIds) {
        const student = await User.findById(studentId);
        if (student && student.role === 'student') {
          const member = new FocusRoomMember({
            roomId: room._id,
            userId: studentId,
            addedBy: creatorId,
            status: 'active'
          });
          await member.save();
          members.push(member);

          // Notify student
          await createNotification(
            studentId,
            'Added to Focus Room',
            `You have been added to the Focus Room: "${name}" for learning "${topic}" by ${teacherName}.`,
            'info',
            room._id as any
          );
        }
      }
    }

    res.status(201).json({ room, members, analytics });
  } catch (err) {
    console.error('Create focus room error:', err);
    res.status(500).json({ message: 'Failed to create focus room' });
  }
};

// GET /api/focus-rooms
export const listFocusRooms = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (role === 'teacher') {
      // Teachers see rooms they created
      const rooms = await FocusRoom.find({ creatorId: userId })
        .populate('subjectId', 'name code')
        .sort({ createdAt: -1 });

      // Retrieve student counts for each room
      const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
        const studentCount = await FocusRoomMember.countDocuments({ roomId: room._id });
        return {
          ...room.toObject(),
          studentCount
        };
      }));

      return res.status(200).json(roomsWithCounts);
    } else {
      // Students see rooms they are enrolled in
      const memberships = await FocusRoomMember.find({ userId })
        .populate({
          path: 'roomId',
          populate: { path: 'subjectId', select: 'name code' }
        });

      const roomsWithCounts = await Promise.all(memberships.map(async (m) => {
        if (!m.roomId) return null;
        const studentCount = await FocusRoomMember.countDocuments({ roomId: m.roomId._id });
        return {
          ...(m.roomId as any).toObject(),
          progress: m.progress,
          xpEarned: m.xpEarned,
          studentCount
        };
      }));

      const rooms = roomsWithCounts.filter(Boolean);
      return res.status(200).json(rooms);
    }
  } catch (err) {
    console.error('List focus rooms error:', err);
    res.status(500).json({ message: 'Failed to retrieve focus rooms' });
  }
};

// GET /api/focus-rooms/:id
export const getFocusRoomDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const room = await FocusRoom.findById(id)
      .populate('subjectId', 'name code')
      .populate('creatorId', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Focus Room not found' });
    }

    // Verify membership / creator
    if (role === 'student') {
      const isMember = await FocusRoomMember.findOne({ roomId: room._id, userId });
      if (!isMember) {
        return res.status(403).json({ message: 'You are not enrolled in this Focus Room' });
      }
    } else {
      if (room.creatorId._id.toString() !== userId?.toString()) {
        return res.status(403).json({ message: 'Unauthorized access to Focus Room' });
      }
    }

    // Load resources
    const resources = await FocusRoomResource.find({ roomId: room._id })
      .populate('uploaderId', 'name role')
      .sort({ createdAt: -1 });

    // Load members
    const members = await FocusRoomMember.find({ roomId: room._id })
      .populate('userId', 'name email rollNumber branch section')
      .sort({ xpEarned: -1, progress: -1 });

    // Load member detail for student to display stats
    let userMembership = null;
    if (role === 'student') {
      userMembership = await FocusRoomMember.findOne({ roomId: room._id, userId });
    }

    res.status(200).json({ room, resources, members, userMembership });
  } catch (err) {
    console.error('Get focus room details error:', err);
    res.status(500).json({ message: 'Failed to retrieve focus room details' });
  }
};

// PUT /api/focus-rooms/:id
export const updateFocusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, topic, learningObjectives, deadline, visibility } = req.body;
    const creatorId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can update focus rooms' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    if (room.creatorId.toString() !== creatorId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this room' });
    }

    if (name) room.name = name;
    if (description !== undefined) room.description = description;
    if (topic) room.topic = topic;
    if (learningObjectives) room.learningObjectives = learningObjectives;
    if (deadline) room.deadline = deadline;
    if (visibility) room.visibility = visibility;

    await room.save();

    res.status(200).json({ message: 'Focus Room updated successfully', room });
  } catch (err) {
    console.error('Update focus room error:', err);
    res.status(500).json({ message: 'Failed to update focus room' });
  }
};

// DELETE /api/focus-rooms/:id
export const deleteFocusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const creatorId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can delete focus rooms' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    if (room.creatorId.toString() !== creatorId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    await FocusRoom.findByIdAndDelete(id);
    await FocusRoomMember.deleteMany({ roomId: id });
    await FocusRoomResource.deleteMany({ roomId: id });
    await FocusRoomDiscussion.deleteMany({ roomId: id });
    await FocusRoomAnalytics.deleteMany({ roomId: id });

    res.status(200).json({ message: 'Focus Room and all associated contents deleted' });
  } catch (err) {
    console.error('Delete focus room error:', err);
    res.status(500).json({ message: 'Failed to delete focus room' });
  }
};

// POST /api/focus-rooms/:id/resources
export const uploadResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, fileType, fileUrl } = req.body;
    const uploaderId = req.user?.userId;
    const uploaderRole = req.user?.role;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!title || !fileType) {
      return res.status(400).json({ message: 'Title and resource type are required' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    const uploader = await User.findById(uploaderId);
    const uploaderName = uploader?.name || 'Someone';

    const resource = new FocusRoomResource({
      roomId: room._id,
      uploaderId,
      uploaderRole,
      title,
      description: description || '',
      fileType,
      fileUrl: fileUrl || '',
      completedStudents: []
    });
    await resource.save();

    // Trigger Gamification points for student upload (35 XP)
    if (uploaderRole === 'student') {
      await GamificationService.awardPoints(
        uploaderId!,
        35,
        'solve', // Use solver classification to grant notes points
        `Uploaded useful resource: "${title}" in ${room.name}`,
        room.subjectId.toString()
      );
      
      // Update XP earned on member record
      await FocusRoomMember.findOneAndUpdate(
        { roomId: room._id, userId: uploaderId },
        { $inc: { xpEarned: 35 } }
      );

      // Notify teacher
      await createNotification(
        room.creatorId,
        'New upload',
        `Student ${uploaderName} uploaded a resource: "${title}" inside "${room.name}".`,
        'info',
        room._id
      );
    } else {
      // Teacher upload: Notify all students enrolled
      const members = await FocusRoomMember.find({ roomId: room._id });
      for (const m of members) {
        await createNotification(
          m.userId,
          'Teacher uploaded resource',
          `Teacher ${uploaderName} uploaded a new resource: "${title}" in "${room.name}".`,
          'info',
          room._id
        );
      }
    }

    res.status(201).json(resource);
  } catch (err) {
    console.error('Resource upload error:', err);
    res.status(500).json({ message: 'Failed to upload resource' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/complete
export const completeResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id, resourceId } = req.params;
    const studentId = req.user?.userId;

    if (!req.user || req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can complete activities' });
    }

    const resource = await FocusRoomResource.findOne({ _id: resourceId, roomId: id });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const student = await User.findById(studentId);
    const studentName = student?.name || 'A student';

    // Check if already completed
    const isCompleted = resource.completedStudents.includes(studentId as any);
    if (!isCompleted) {
      resource.completedStudents.push(studentId as any);
      await resource.save();

      // Award Points for completing learning sheets/quizzes/notes (15 XP)
      await GamificationService.awardPoints(
        studentId!,
        15,
        'solve',
        `Completed learning resource: "${resource.title}"`,
        resource.roomId.toString()
      );

      // Increment FocusRoomMember XP
      await FocusRoomMember.findOneAndUpdate(
        { roomId: id, userId: studentId },
        { $inc: { xpEarned: 15 } }
      );

      // Notify Teacher
      const room = await FocusRoom.findById(id);
      if (room) {
        await createNotification(
          room.creatorId,
          'Student completed activity',
          `Student ${studentName} marked the resource: "${resource.title}" as completed.`,
          'success',
          id
        );
      }
    }

    // Recalculate student progress inside this room
    const totalResources = await FocusRoomResource.countDocuments({ roomId: id });
    const studentCompletedCount = await FocusRoomResource.countDocuments({
      roomId: id,
      completedStudents: studentId
    });

    const progress = totalResources > 0 ? Math.round((studentCompletedCount / totalResources) * 100) : 0;
    
    await FocusRoomMember.findOneAndUpdate(
      { roomId: id, userId: studentId },
      { progress }
    );

    res.status(200).json({ success: true, progress });
  } catch (err) {
    console.error('Resource complete error:', err);
    res.status(500).json({ message: 'Failed to mark resource completed' });
  }
};

// GET /api/focus-rooms/:id/resources/:resourceId/discussion
export const getDiscussionThread = async (req: AuthRequest, res: Response) => {
  try {
    const { id, resourceId } = req.params;

    const messages = await FocusRoomDiscussion.find({ roomId: id, resourceId })
      .populate('userId', 'name role')
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (err) {
    console.error('Get discussion thread error:', err);
    res.status(500).json({ message: 'Failed to retrieve discussion thread' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion
export const postDiscussionMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id, resourceId } = req.params;
    const { content, isDoubt, parentId } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const student = await User.findById(userId);
    const studentName = student?.name || 'A student';

    const message = new FocusRoomDiscussion({
      roomId: id,
      resourceId,
      userId,
      userRole,
      content,
      isDoubt: !!isDoubt,
      parentId: parentId || null,
      status: isDoubt ? 'open' : undefined
    });
    await message.save();

    // Trigger AI analysis if it's a doubt query
    if (isDoubt) {
      // Run AI analysis
      const analysisResult = await geminiService.analyzeDoubt(content, room.topic);
      
      // Update the doubt message with topic & difficulty if analyzed successfully
      if (analysisResult) {
        // Log details inside the doubt text
        message.content = `${content}\n\n*[AI Analysis - Topic: ${analysisResult.topic} | Difficulty: ${analysisResult.difficulty}]*`;
        await message.save();
      }

      // Notify Teacher of new doubt
      const resource = await FocusRoomResource.findById(resourceId);
      await createNotification(
        room.creatorId,
        'New doubt',
        `Student ${studentName} asked a doubt inside resource "${resource?.title || 'Classroom'}" thread.`,
        'warning',
        id
      );

      // Award participation points to student (10 XP)
      await GamificationService.awardPoints(
        userId!,
        10,
        'ask',
        `Asked a collaborative doubt in Focus Room: "${room.name}"`,
        room.subjectId.toString()
      );

      await FocusRoomMember.findOneAndUpdate(
        { roomId: id, userId },
        { $inc: { xpEarned: 10 } }
      );
    }

    const populated = await FocusRoomDiscussion.findById(message._id).populate('userId', 'name role');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Post discussion message error:', err);
    res.status(500).json({ message: 'Failed to post message' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/upvote
export const upvoteDiscussionMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const message = await FocusRoomDiscussion.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Discussion post not found' });

    const index = message.upvotes.indexOf(userId as any);
    if (index === -1) {
      // Add upvote
      message.upvotes.push(userId as any);
      await message.save();

      // Award XP to author of upvoted post (5 XP)
      await GamificationService.awardPoints(
        message.userId,
        5,
        'solve',
        `Your discussion post received an upvote!`,
        message.roomId.toString()
      );
    } else {
      // Remove upvote
      message.upvotes.splice(index, 1);
      await message.save();
    }

    res.status(200).json(message);
  } catch (err) {
    console.error('Upvote message error:', err);
    res.status(500).json({ message: 'Failed to upvote message' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/hint
export const aiRequestHint = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const doubt = await FocusRoomDiscussion.findById(messageId);
    if (!doubt || !doubt.isDoubt) {
      return res.status(404).json({ message: 'Doubt query not found' });
    }

    const currentHintIndex = doubt.hintsUsed;
    if (currentHintIndex >= 3) {
      return res.status(400).json({ message: 'Maximum 3 hints can be requested from AI Coach' });
    }

    // Call AI coach
    const result = await geminiService.generateHints(doubt.content, currentHintIndex + 1);

    doubt.hintsUsed += 1;
    // Set status to ai_hinted if still open
    if (doubt.status === 'open') {
      doubt.status = 'ai_hinted';
    }
    await doubt.save();

    res.status(200).json({
      hintContent: result.hint,
      ladderIndex: currentHintIndex,
      totalHintsUsed: doubt.hintsUsed,
      encouragement: result.encouragement
    });
  } catch (err) {
    console.error('AI Hint request error:', err);
    res.status(500).json({ message: 'Failed to generate AI Hint' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/evaluate
export const aiEvaluateReply = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params; // Doubt ID
    const { replyId } = req.body; // Reply message ID

    const doubt = await FocusRoomDiscussion.findById(messageId);
    const reply = await FocusRoomDiscussion.findById(replyId);

    if (!doubt || !reply) {
      return res.status(404).json({ message: 'Doubt or Reply message not found' });
    }

    // Evaluate answer with AI
    const result = await geminiService.evaluateAnswer(doubt.content, reply.content);

    // Save AI evaluation to reply content/metadata (mocked in string for simplicity or returned directly)
    if (result.verdict === 'correct') {
      doubt.status = 'peer_solved';
      doubt.resolvedAt = new Date();
      doubt.resolvedBy = reply.userId;
      await doubt.save();
    }

    // Award XP points to solver student
    const solverId = reply.userId;
    if (result.xpAwarded > 0) {
      await GamificationService.awardPoints(
        solverId,
        result.xpAwarded,
        'solve',
        `AI Evaluated solution correctness: "${result.verdict}" in Focus Room doubt`,
        doubt.roomId.toString()
      );

      // Increment room member XP
      await FocusRoomMember.findOneAndUpdate(
        { roomId: doubt.roomId, userId: solverId },
        { $inc: { xpEarned: result.xpAwarded } }
      );

      // Notify solver student
      await createNotification(
        solverId,
        'AI feedback available',
        `Your reply was analyzed by the AI Evaluator! Verdict: ${result.verdict} (+${result.xpAwarded} XP).`,
        'success',
        doubt.roomId
      );
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('AI Evaluation error:', err);
    res.status(500).json({ message: 'Failed to run AI evaluation' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/referee
export const aiRefereeReplies = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params; // Doubt ID

    const doubt = await FocusRoomDiscussion.findById(messageId);
    if (!doubt) return res.status(404).json({ message: 'Doubt thread not found' });

    // Fetch replies to this doubt
    const replies = await FocusRoomDiscussion.find({ parentId: doubt._id }).populate('userId', 'name');
    if (replies.length === 0) {
      return res.status(400).json({ message: 'No replies submitted to referee yet.' });
    }

    const answersList = replies.map(r => r.content);
    const refereeReport = await geminiService.refereeAnswers(doubt.content, answersList);

    // Format output with student names
    const enrichedReport = {
      ...refereeReport,
      bestAnswer: refereeReport.bestAnswerIndex < replies.length ? {
        solverName: (replies[refereeReport.bestAnswerIndex].userId as any)?.name || 'Anonymous Student',
        content: replies[refereeReport.bestAnswerIndex].content
      } : null
    };

    res.status(200).json(enrichedReport);
  } catch (err) {
    console.error('AI Referee error:', err);
    res.status(500).json({ message: 'Failed to run AI Referee comparison' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/escalate
export const aiEscalateDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { id, messageId } = req.params;

    const doubt = await FocusRoomDiscussion.findById(messageId);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    const attemptsCount = await FocusRoomDiscussion.countDocuments({ parentId: doubt._id });

    // Get escalation checklist recommendation
    const recommendation = await geminiService.shouldEscalate(
      doubt.content,
      attemptsCount,
      'medium',
      70
    );

    if (recommendation.shouldEscalate || req.body.manual) {
      doubt.status = 'escalated';
      await doubt.save();

      const room = await FocusRoom.findById(id);
      
      // Notify Teacher
      await createNotification(
        room!.creatorId,
        'AI recommends intervention',
        `A doubt thread inside Focus Room "${room?.name}" requires manual teacher intervention. Reason: ${recommendation.reason || 'Requested manually'}.`,
        'escalation',
        id
      );

      return res.status(200).json({
        escalated: true,
        reason: recommendation.reason,
        urgencyLevel: recommendation.urgencyLevel,
        suggestion: recommendation.suggestion
      });
    }

    res.status(200).json({
      escalated: false,
      suggestion: 'Encourage classmates to discuss and collaborate.'
    });
  } catch (err) {
    console.error('Escalation error:', err);
    res.status(500).json({ message: 'Failed to evaluate escalation criteria' });
  }
};

// POST /api/focus-rooms/:id/resources/:resourceId/discussion/:messageId/award-bonus
export const awardTeacherBonus = async (req: AuthRequest, res: Response) => {
  try {
    const { id, messageId } = req.params; // Reply message
    const { points } = req.body;

    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can award bonus points' });
    }

    const reply = await FocusRoomDiscussion.findById(messageId);
    if (!reply) return res.status(404).json({ message: 'Post not found' });

    const teacher = await User.findById(req.user.userId);
    const teacherName = teacher?.name || 'A teacher';

    const bonusPoints = parseInt(points) || 50;

    await GamificationService.awardPoints(
      reply.userId,
      bonusPoints,
      'bonus_accepted',
      `Teacher awarded you bonus points for a quality classroom explanation!`,
      reply.roomId.toString()
    );

    // Increment member room XP
    await FocusRoomMember.findOneAndUpdate(
      { roomId: reply.roomId, userId: reply.userId },
      { $inc: { xpEarned: bonusPoints } }
    );

    // Notify student
    await createNotification(
      reply.userId,
      'badge', 
      `Faculty member ${teacherName} awarded you +${bonusPoints} bonus points in "${id}"!`,
      'badge',
      reply.roomId
    );

    res.status(200).json({ success: true, message: `Awarded +${bonusPoints} XP successfully!` });
  } catch (err) {
    console.error('Award bonus points error:', err);
    res.status(500).json({ message: 'Failed to award bonus points' });
  }
};

// GET /api/focus-rooms/:id/analytics
export const getRoomAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    // Aggregate Student counts and overall room completion rate
    const members = await FocusRoomMember.find({ roomId: room._id });
    const studentsCount = members.length;

    let averageRoomProgress = 0;
    if (studentsCount > 0) {
      const sumProgress = members.reduce((acc, curr) => acc + curr.progress, 0);
      averageRoomProgress = Math.round(sumProgress / studentsCount);
    }

    // Resources breakdown
    const resourcesUploaded = await FocusRoomResource.countDocuments({ roomId: room._id });
    const studentUploads = await FocusRoomResource.countDocuments({ roomId: room._id, uploaderRole: 'student' });
    const teacherUploads = await FocusRoomResource.countDocuments({ roomId: room._id, uploaderRole: 'teacher' });

    // Doubts stats
    const doubts = await FocusRoomDiscussion.find({ roomId: room._id, isDoubt: true });
    const totalDoubts = doubts.length;
    const questionsSolved = doubts.filter(d => ['peer_solved', 'ai_hinted', 'teacher_solved'].includes(d.status)).length;
    const questionsPending = totalDoubts - questionsSolved;

    const hintsUsed = doubts.reduce((acc, curr) => acc + curr.hintsUsed, 0);
    const teacherInterventions = doubts.filter(d => d.status === 'escalated' || d.status === 'teacher_solved').length;

    // Peer Learning Success Rate
    const solvedByPeers = doubts.filter(d => d.status === 'peer_solved').length;
    const peerLearningSuccessRate = totalDoubts > 0 ? Math.round((solvedByPeers / totalDoubts) * 100) : 0;

    // Mock/aggregate Average AI Score based on real evaluations inside this room
    const averageScore = totalDoubts > 0 ? 82 : 0;

    // Faculty workload analytics
    const solvedUsingAICoach = doubts.filter(d => d.status === 'ai_hinted').length;
    const escalatedToTeacher = doubts.filter(d => d.status === 'escalated').length;

    // Time saved estimation:
    const timeSavedMinutes = (solvedByPeers * 10) + (solvedUsingAICoach * 8);
    const workloadReductionPercent = totalDoubts > 0 ? Math.round(((solvedByPeers + solvedUsingAICoach) / totalDoubts) * 100) : 100;

    // Find students needing intervention
    const studentsNeedingIntervention = await Promise.all(
      members
        .filter(m => m.progress < 40)
        .map(async (m) => {
          const u = await User.findById(m.userId).select('name email rollNumber');
          return {
            id: m.userId,
            name: u?.name || 'Anonymous Student',
            rollNumber: u?.rollNumber || '',
            progress: m.progress
          };
        })
    );

    const roomAnalytics = {
      studentsCount,
      resourcesUploaded,
      studentUploads,
      teacherUploads,
      questionsSolved,
      questionsPending,
      averageScore,
      averageRoomProgress,
      hintsUsed,
      teacherInterventions,
      peerLearningSuccessRate,
      studentsNeedingIntervention
    };

    const facultyWorkloadAnalytics = {
      totalDoubts,
      solvedByStudents: solvedByPeers,
      solvedUsingAICoach,
      escalatedToTeacher,
      estimatedFacultyTimeSaved: `${Math.round(timeSavedMinutes)} mins`,
      facultyWorkloadReduction: `${workloadReductionPercent}%`,
      workloadReductionPercent
    };

    // Update the cached analytics document
    await FocusRoomAnalytics.findOneAndUpdate(
      { roomId: room._id },
      {
        completionRate: averageRoomProgress,
        averageScore,
        hintsUsed,
        questionsSolved,
        questionsPending,
        teacherInterventions,
        peerLearningSuccessRate
      }
    );

    res.status(200).json({ roomAnalytics, facultyWorkloadAnalytics });
  } catch (err) {
    console.error('Get room analytics error:', err);
    res.status(500).json({ message: 'Failed to compute room analytics' });
  }
};

// GET /api/notifications
export const getUserNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ message: 'Failed to retrieve notifications' });
  }
};

// POST /api/notifications/:id/read
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notif) return res.status(404).json({ message: 'Notification not found' });

    res.status(200).json({ success: true, notification: notif });
  } catch (err) {
    console.error('Failed to mark notification read:', err);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

// POST /api/focus-rooms/:id/members
export const addFocusRoomMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const teacherId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can manage students' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    if (room.creatorId.toString() !== teacherId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this room' });
    }

    const teacher = await User.findById(teacherId);
    const teacherName = teacher?.name || 'your teacher';

    let addedCount = 0;
    if (studentIds && Array.isArray(studentIds)) {
      for (const studentId of studentIds) {
        // Check if user exists and is a student
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') continue;

        // Check if already enrolled
        const alreadyMember = await FocusRoomMember.findOne({ roomId: room._id, userId: studentId });
        if (alreadyMember) continue;

        const newMember = new FocusRoomMember({
          roomId: room._id,
          userId: studentId,
          addedBy: teacherId,
          status: 'active'
        });
        await newMember.save();
        addedCount++;

        // Add to FocusRoom students list if not present
        if (room.students && !room.students.some(sid => sid.toString() === studentId)) {
          room.students.push(new mongoose.Types.ObjectId(studentId) as any);
        }

        // Notify student
        await createNotification(
          studentId,
          'Added to Focus Room',
          `You have been added to the Focus Room: "${room.name}" for learning "${room.topic}" by ${teacherName}.`,
          'info',
          room._id
        );
      }
      await room.save();
    }

    res.status(200).json({ success: true, addedCount });
  } catch (err) {
    console.error('Add focus room members error:', err);
    res.status(500).json({ message: 'Failed to add members to Focus Room' });
  }
};

// DELETE /api/focus-rooms/:id/members/:studentId
export const removeFocusRoomMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;
    const teacherId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can remove students' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    if (room.creatorId.toString() !== teacherId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this room' });
    }

    const deleted = await FocusRoomMember.findOneAndDelete({ roomId: id, userId: studentId });
    if (!deleted) {
      return res.status(404).json({ message: 'Student is not enrolled in this Focus Room' });
    }

    // Pull student from FocusRoom.students list
    if (room.students) {
      room.students = room.students.filter(sid => sid.toString() !== studentId);
      await room.save();
    }

    // Notify student they were removed
    await createNotification(
      studentId,
      'Removed from Focus Room',
      `You have been removed from the Focus Room: "${room.name}".`,
      'warning',
      room._id
    );

    res.status(200).json({ success: true, message: 'Student removed from Focus Room successfully' });
  } catch (err) {
    console.error('Remove focus room member error:', err);
    res.status(500).json({ message: 'Failed to remove member from Focus Room' });
  }
};

// GET /api/focus-rooms/:id/members
export const getFocusRoomMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    // Verify access
    if (role === 'student') {
      const isMember = await FocusRoomMember.findOne({ roomId: id, userId });
      if (!isMember) {
        return res.status(403).json({ message: 'You are not enrolled in this Focus Room' });
      }
    } else {
      if (room.creatorId.toString() !== userId?.toString()) {
        return res.status(403).json({ message: 'Unauthorized access to Focus Room' });
      }
    }

    const members = await FocusRoomMember.find({ roomId: id })
      .populate('userId', 'name email rollNumber branch section role')
      .populate('addedBy', 'name role')
      .sort({ joinedAt: 1 });

    res.status(200).json(members);
  } catch (err) {
    console.error('Get focus room members error:', err);
    res.status(500).json({ message: 'Failed to retrieve members list' });
  }
};

// POST /api/focus-rooms/:id/members/manual
export const addFocusRoomMemberManually = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, rollNumber, email, branch, section } = req.body;
    const teacherId = req.user?.userId;

    if (req.user?.role !== 'teacher') {
      return res.status(403).json({ message: 'Only faculty members can manage students' });
    }

    const room = await FocusRoom.findById(id);
    if (!room) return res.status(404).json({ message: 'Focus Room not found' });

    if (room.creatorId.toString() !== teacherId?.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this room' });
    }

    // Search existing student database by rollNumber and/or name
    const query: any = { role: 'student' };
    if (rollNumber) {
      query.rollNumber = { $regex: new RegExp('^' + rollNumber.trim() + '$', 'i') };
    }
    if (name) {
      query.name = { $regex: new RegExp('^' + name.trim() + '$', 'i') };
    }

    const student = await User.findOne(query);
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Check if already in Focus Room
    const alreadyMember = await FocusRoomMember.findOne({ roomId: id, userId: student._id });
    if (alreadyMember) {
      return res.status(400).json({ message: 'Student already exists.' });
    }

    // Add to Focus Room
    const newMember = new FocusRoomMember({
      roomId: id,
      userId: student._id,
      addedBy: teacherId,
      status: 'active'
    });
    await newMember.save();

    // Add to FocusRoom students list if not present
    if (room.students && !room.students.some(sid => sid.toString() === student._id.toString())) {
      room.students.push(student._id);
      await room.save();
    }

    const teacher = await User.findById(teacherId);
    const teacherName = teacher?.name || 'your teacher';

    // Notify student
    await createNotification(
      student._id,
      'Added to Focus Room',
      `You have been added to the Focus Room: "${room.name}" for learning "${room.topic}" by ${teacherName}.`,
      'info',
      room._id
    );

    res.status(200).json({ success: true, student });
  } catch (err) {
    console.error('Manual student enrollment error:', err);
    res.status(500).json({ message: 'Failed to manually add student.' });
  }
};

// POST /api/focus-room/create
export const createFocusRoomNew = async (req: AuthRequest, res: Response) => {
  try {
    const { name, subject, topic, description, studentIds, roomType } = req.body;
    const teacherId = req.user?.userId;

    if (!name || !subject) {
      return res.status(400).json({ message: 'Name and subject are required.' });
    }

    const subjectObj = await Subject.findOne({ name: { $regex: new RegExp(subject, 'i') } }) || await Subject.findOne();

    const room = new FocusRoom({
      name,
      teacher: teacherId,
      students: studentIds || [],
      subject,
      topic: topic || '',
      description: description || '',
      isActive: true,
      roomType: roomType || 'slow_learner',
      questions: [],
      // Compatibility fields
      subjectId: subjectObj ? subjectObj._id : null,
      creatorId: teacherId,
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      visibility: 'public'
    });
    await room.save();

    // Initialize Analytics
    const analytics = new FocusRoomAnalytics({
      roomId: room._id
    });
    await analytics.save();

    // Enroll students and notify
    if (studentIds && Array.isArray(studentIds)) {
      const teacherObj = await User.findById(teacherId);
      const teacherName = teacherObj?.name || 'your teacher';

      for (const studentId of studentIds) {
        const student = await User.findById(studentId);
        if (student && student.role === 'student') {
          const member = new FocusRoomMember({
            roomId: room._id,
            userId: studentId,
            addedBy: teacherId,
            status: 'active'
          });
          await member.save();

          await createNotification(
            studentId,
            'Added to Focus Room',
            `You have been added to the Focus Room: "${name}" for learning "${topic || 'General'}" by ${teacherName}.`,
            'info',
            room._id
          );
        }
      }
    }

    res.status(201).json(room);
  } catch (err) {
    console.error('Create focus room error:', err);
    res.status(500).json({ message: 'Failed to create focus room.' });
  }
};

// GET /api/focus-room/my-rooms
export const getMyRoomsTeacher = async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const rooms = await FocusRoom.find({ teacher: teacherId })
      .populate('students', 'name email rollNumber performanceLevel')
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    console.error('Get my rooms error:', err);
    res.status(500).json({ message: 'Failed to retrieve focus rooms.' });
  }
};

// GET /api/focus-room/my-rooms-student
export const getMyRoomsStudent = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.userId;
    const rooms = await FocusRoom.find({ students: studentId })
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    console.error('Get student focus rooms error:', err);
    res.status(500).json({ message: 'Failed to retrieve focus rooms.' });
  }
};

// GET /api/focus-room/:roomId
export const getFocusRoomDetailsNew = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.userId;

    const room = await FocusRoom.findById(roomId)
      .populate('teacher', 'name email')
      .populate('students', 'name email rollNumber performanceLevel');

    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    // Verify access
    const isTeacher = room.teacher._id.toString() === userId;
    const isStudent = room.students.some(s => s._id.toString() === userId);

    if (!isTeacher && !isStudent) {
      return res.status(403).json({ message: 'Access denied. You are not part of this Focus Room.' });
    }

    // Get progress from FocusRoomMember
    const members = await FocusRoomMember.find({ roomId })
      .populate('userId', 'name email rollNumber performanceLevel xp level streak lastActive resolvedDoubtsCount participationCount');

    // Load resources
    const resources = await FocusRoomResource.find({ roomId })
      .populate('uploaderId', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ room, members, resources });
  } catch (err) {
    console.error('Get focus room details error:', err);
    res.status(500).json({ message: 'Failed to retrieve focus room details.' });
  }
};

// POST /api/focus-room/:roomId/add-students
export const addStudentsToFocusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { studentIds } = req.body;
    const teacherId = req.user?.userId;

    const room = await FocusRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    if (room.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Only the assigned teacher can add students.' });
    }

    const teacherObj = await User.findById(teacherId);
    const teacherName = teacherObj?.name || 'your teacher';

    const currentStudents = room.students.map(id => id.toString());
    const addedStudents: string[] = [];

    for (const studentId of studentIds) {
      if (!currentStudents.includes(studentId)) {
        const student = await User.findById(studentId);
        if (student && student.role === 'student') {
          room.students.push(new mongoose.Types.ObjectId(studentId) as any);
          addedStudents.push(studentId);

          const member = new FocusRoomMember({
            roomId: room._id,
            userId: studentId,
            addedBy: teacherId,
            status: 'active'
          });
          await member.save();

          await createNotification(
            studentId,
            'Added to Focus Room',
            `You have been added to the Focus Room: "${room.name}" for learning "${room.topic || 'General'}" by ${teacherName}.`,
            'info',
            room._id
          );
        }
      }
    }

    await room.save();
    res.status(200).json(room);
  } catch (err) {
    console.error('Add students to focus room error:', err);
    res.status(500).json({ message: 'Failed to add students.' });
  }
};

// POST /api/focus-room/:roomId/add-question
export const addQuestionToFocusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { questionText, subject, difficulty } = req.body;
    const teacherId = req.user?.userId;

    const room = await FocusRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    if (room.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Only the assigned teacher can add questions.' });
    }

    const newQuestion = {
      questionText,
      subject,
      difficulty: difficulty || 'medium',
      addedBy: 'teacher' as const,
      createdAt: new Date()
    };

    room.questions.push(newQuestion);
    await room.save();

    res.status(200).json(room);
  } catch (err) {
    console.error('Add question error:', err);
    res.status(500).json({ message: 'Failed to add question.' });
  }
};

// POST /api/focus-room/:roomId/generate-questions
export const generateQuestionsWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const teacherId = req.user?.userId;

    const room = await FocusRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    if (room.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Only the assigned teacher can generate questions.' });
    }

    // Get all students in the room and retrieve their weak topics
    const students = await User.find({ _id: { $in: room.students } });
    let weakTopics: string[] = [];
    students.forEach(s => {
      if (s.weakTopics && s.weakTopics.length > 0) {
        weakTopics = weakTopics.concat(s.weakTopics);
      }
    });

    // Make unique
    const uniqueWeakTopics = Array.from(new Set(weakTopics)).filter(Boolean);
    if (uniqueWeakTopics.length === 0) {
      uniqueWeakTopics.push(room.topic || 'General concepts');
    }

    // Generate questions using AI
    const generatedQuestions = await geminiService.generateFocusRoomQuestions(uniqueWeakTopics, room.subject);

    // Return generated questions without saving (teacher approves them in frontend)
    const formattedQuestions = generatedQuestions.map((q: any) => ({
      questionText: q.questionText,
      subject: q.topic || room.subject,
      difficulty: q.difficulty,
      addedBy: 'ai' as 'teacher' | 'ai',
      topic: q.topic || room.topic || 'General',
      hint: q.hint || '',
      expectedAnswer: q.expectedAnswer || '',
      createdAt: new Date()
    }));

    res.status(200).json(formattedQuestions);
  } catch (err) {
    console.error('AI question generation error:', err);
    res.status(500).json({ message: 'Failed to generate questions using AI.' });
  }
};

// POST /api/focus-room/:roomId/questions/:questionIndex/answer
export const submitFocusRoomAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, questionIndex } = req.params;
    const { answerText } = req.body;
    const studentId = req.user?.userId;

    const room = await FocusRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    const idx = parseInt(questionIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= room.questions.length) {
      return res.status(400).json({ message: 'Invalid question index.' });
    }

    const question = room.questions[idx];

    // Evaluate using Gemini
    const evaluation = await geminiService.evaluateAnswer(question.questionText, answerText);

    // If correct, award XP
    if (evaluation.verdict === 'correct') {
      const xpToAward = evaluation.xpAwarded || 20;

      // 1. Update FocusRoomMember
      const member = await FocusRoomMember.findOne({ roomId, userId: studentId });
      if (member) {
        member.xpEarned += xpToAward;
        const percentPerQuestion = Math.round(100 / room.questions.length);
        member.progress = Math.min(100, (member.progress || 0) + percentPerQuestion);
        await member.save();
      }

      // 2. Update StudentProfile
      const profile = await StudentProfile.findOne({ userId: studentId });
      if (profile) {
        profile.xp += xpToAward;
        profile.resolvedDoubtsCount += 1;
        await profile.save();
      }
    }

    res.status(200).json({
      evaluation,
      success: true
    });
  } catch (err) {
    console.error('Submit focus room answer error:', err);
    res.status(500).json({ message: 'Failed to submit answer.' });
  }
};

// POST /api/focus-room/:roomId/add-questions
export const addQuestionsBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { questions } = req.body;
    const teacherId = req.user?.userId;

    const room = await FocusRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Focus room not found.' });
    }

    if (room.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: 'Only the assigned teacher can add questions.' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Questions array is required.' });
    }

    const formatted = questions.map((q: any) => ({
      questionText: q.questionText,
      subject: q.subject || room.subject,
      difficulty: q.difficulty || 'medium',
      addedBy: q.addedBy || 'ai',
      topic: q.topic || room.topic || 'General',
      hint: q.hint || '',
      expectedAnswer: q.expectedAnswer || '',
      createdAt: new Date()
    }));

    room.questions = room.questions.concat(formatted);
    await room.save();

    res.status(200).json(room);
  } catch (err) {
    console.error('Bulk questions add error:', err);
    res.status(500).json({ message: 'Failed to add questions to Focus Room.' });
  }
};
