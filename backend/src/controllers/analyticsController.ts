import { Response } from 'express';
import { Doubt, Answer, User, StudentProfile, Escalation, Subject, FacultyAnalytics, HintHistory, StudentProgress } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';

export const getStudentDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const profile = await StudentProfile.findOne({ userId })
      .populate({ path: 'userId', select: 'name email' });

    if (!profile) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // Load user's recent activity (doubts asked, doubts solved)
    const askedDoubts = await Doubt.find({ askerId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('subjectId', 'name code');

    const solvedAnswers = await Answer.find({ solverId: userId })
      .populate({
        path: 'doubtId',
        populate: { path: 'subjectId', select: 'name code' }
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // Compute detailed stats
    const questionsAsked = await Doubt.countDocuments({ askerId: userId });
    const answers = await Answer.find({ solverId: userId });
    const questionsSolved = answers.filter(a => a.isAccepted || a.isTeacherVerified).length;
    const acceptedAnswers = answers.filter(a => a.isAccepted).length;
    const teacherApprovedAnswers = answers.filter(a => a.isTeacherVerified).length;
    const topAnswers = answers.filter(a => (a.aiEvaluation?.score || 0) >= 90 || a.isTeacherVerified).length;
    const knowledgeBaseContributions = answers.filter(a => a.knowledgeBaseStatus === 'saved').length;

    const scoredAnswers = answers.filter(a => a.aiEvaluation && a.aiEvaluation.score !== undefined);
    const avgAIScore = scoredAnswers.length > 0
      ? Math.round(scoredAnswers.reduce((acc, a) => acc + (a.aiEvaluation?.score || 0), 0) / scoredAnswers.length)
      : 0;

    const contributionScore = (questionsAsked * 10) + (questionsSolved * 50) + (topAnswers * 100);

    // Compute Leaderboard Rank
    const allProfiles = await StudentProfile.find().sort({ xp: -1 });
    const rank = allProfiles.findIndex(p => p.userId.toString() === userId?.toString()) + 1;

    // Fetch Weekly Progress Records
    const progressRecords = await StudentProgress.find({ student: userId })
      .sort({ year: 1, weekNumber: 1 });

    const statistics = {
      questionsAsked,
      questionsSolved,
      answersSubmitted: answers.length,
      acceptedAnswers,
      teacherApprovedAnswers,
      topAnswers,
      knowledgeBaseContributions,
      xp: profile.xp,
      level: profile.level,
      badges: profile.badges,
      aiScore: avgAIScore,
      contributionScore,
      rank,
      progress: progressRecords
    };

    // Get subjects list
    const subjects = await Subject.find();

    res.status(200).json({
      profile,
      askedDoubts,
      solvedAnswers,
      subjects,
      statistics
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve student dashboard data' });
  }
};

export const getLeaderboardData = async (req: AuthRequest, res: Response) => {
  try {
    const profiles = await StudentProfile.find()
      .sort({ xp: -1 })
      .limit(10)
      .populate('userId', 'name email');

    const leaderboard = profiles.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId?._id,
      name: (p.userId as any)?.name || 'Anonymous Student',
      xp: p.xp,
      level: p.level,
      streak: p.streak,
      solvedCount: p.resolvedDoubtsCount
    }));

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
};

export const getTeacherDashboardData = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Core counters
    const totalDoubts = await Doubt.countDocuments();
    const resolvedDoubts = await Doubt.countDocuments({ status: 'resolved' });
    const escalatedDoubts = await Doubt.countDocuments({ status: 'escalated' });
    const openDoubts = await Doubt.countDocuments({ status: 'open' });
    const inProgressDoubts = await Doubt.countDocuments({ status: 'in-progress' });

    // 2. Peer-solved vs Teacher-solved
    // Peer-solved: resolved doubts where the accepted/verified answer is solved by a student (role: student)
    // Teacher-solved: resolved doubts where a teacher solved it (or escalated doubts that are resolved)
    // For calculation simplicity, let's load all resolved doubts and count solver roles
    const resolvedAnswers = await Answer.find({ isAccepted: true })
      .populate('solverId', 'role')
      .populate('doubtId', 'status');

    let doubtsSolvedByPeers = 0;
    let doubtsSolvedByTeachers = 0;

    resolvedAnswers.forEach((ans) => {
      const solver = ans.solverId as any;
      if (solver) {
        if (solver.role === 'student') {
          doubtsSolvedByPeers++;
        } else if (solver.role === 'teacher') {
          doubtsSolvedByTeachers++;
        }
      }
    });

    // 3. Subject-wise analytics
    const subjects = await Subject.find();
    const subjectStats = await Promise.all(
      subjects.map(async (subj) => {
        const count = await Doubt.countDocuments({ subjectId: subj._id });
        const solved = await Doubt.countDocuments({ subjectId: subj._id, status: { $in: ['peer_solved', 'teacher_solved'] } });
        return {
          subjectName: subj.name,
          subjectCode: subj.code,
          total: count,
          solved: solved
        };
      })
    );

    // 4. Misconceptions/Weak Topics tracking
    // We group doubts by topic and calculate average AI score of answers or total open doubts
    const doubtsByTopic = await Doubt.aggregate([
      {
        $group: {
          _id: { topic: '$topic', subjectId: '$subjectId' },
          count: { $sum: 1 },
          escalatedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const weakTopics = await Promise.all(
      doubtsByTopic.map(async (topicGroup) => {
        const subject = await Subject.findById(topicGroup._id.subjectId);
        return {
          topic: topicGroup._id.topic,
          subjectCode: subject?.code || 'GEN',
          totalDoubts: topicGroup.count,
          escalatedDoubts: topicGroup.escalatedCount,
          peerSolvedRate: topicGroup.count > 0 ? Math.round(((topicGroup.count - topicGroup.escalatedCount) / topicGroup.count) * 100) : 100
        };
      })
    );

    // 5. Weekly trend metrics (dynamic from database)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const startOfDay = d;
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayName = daysOfWeek[d.getDay()];

      const doubtsCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      const peerSolvedCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'peer_solved'
      });
      const escalatedCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        status: 'escalated'
      });

      timelineData.push({
        name: dayName,
        doubts: doubtsCount,
        peerSolved: peerSolvedCount,
        escalated: escalatedCount
      });
    }

    // Workload saved metrics
    const peerSolvedPercentage = totalDoubts > 0 ? Math.round((doubtsSolvedByPeers / totalDoubts) * 100) : 0;
    const avgMinutesPerDoubt = 20; // Assume 20 minutes of faculty time saved per doubt solved by peer
    const totalMinutesSaved = doubtsSolvedByPeers * avgMinutesPerDoubt;
    const hoursSaved = parseFloat((totalMinutesSaved / 60).toFixed(1));

    res.status(200).json({
      metrics: {
        totalDoubts,
        resolvedDoubts,
        escalatedDoubts,
        openDoubts,
        inProgressDoubts,
        peerSolvedPercentage,
        hoursSaved
      },
      subjectStats,
      weakTopics,
      timelineData
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ message: 'Failed to retrieve teacher dashboard data' });
  }
};

export const getEscalationQueue = async (req: AuthRequest, res: Response) => {
  try {
    const escalations = await Escalation.find({ status: 'pending' })
      .populate({
        path: 'doubtId',
        populate: [
          { path: 'askerId', select: 'name email' },
          { path: 'subjectId', select: 'name code' }
        ]
      })
      .sort({ escalatedAt: 1 });

    res.status(200).json(escalations);
  } catch (error) {
    console.error('Escalation queue error:', error);
    res.status(500).json({ message: 'Failed to fetch escalation queue' });
  }
};

// Workload Metrics calculation utility
export const calculateWorkloadMetrics = async () => {
  const total = await Doubt.countDocuments();
  const peerSolved = await Doubt.countDocuments({ status: 'peer_solved' });
  const aiHinted = await Doubt.countDocuments({ status: 'ai_hinted' });
  const escalated = await Doubt.countDocuments({ status: 'escalated' });
  const teacherSolved = await Doubt.countDocuments({ status: 'teacher_solved' });
  const open = await Doubt.countDocuments({ status: 'open' });

  const workloadReduction = total > 0 ? ((peerSolved + aiHinted) / total) * 100 : 0;
  const minutesSaved = (peerSolved + aiHinted) * 5;
  const hoursSaved = parseFloat((minutesSaved / 60).toFixed(1));
  const teacherInterventionRate = total > 0 ? (escalated / total) * 100 : 0;

  // Calculate average resolution time in minutes
  const resolvedDoubts = await Doubt.find({
    status: { $in: ['peer_solved', 'ai_hinted', 'teacher_solved'] },
    timeToResolve: { $ne: null }
  });
  let averageResolutionTimeMinutes = 0;
  if (resolvedDoubts.length > 0) {
    const totalTime = resolvedDoubts.reduce((acc, d) => acc + (d.timeToResolve || 0), 0);
    averageResolutionTimeMinutes = Math.round(totalTime / resolvedDoubts.length);
  } else {
    averageResolutionTimeMinutes = 20; // Sensible fallback
  }

  // Dynamic Timeline Items
  const recentDoubts = await Doubt.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('askerId', 'name')
    .populate('subjectId', 'code');

  const recentAnswers = await Answer.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('solverId', 'name')
    .populate({
      path: 'doubtId',
      populate: { path: 'subjectId', select: 'code' }
    });

  const recentEscalations = await Escalation.find()
    .sort({ escalatedAt: -1 })
    .limit(5)
    .populate({
      path: 'doubtId',
      populate: { path: 'askerId', select: 'name' }
    });

  const timelineItems: any[] = [];

  recentDoubts.forEach((d) => {
    timelineItems.push({
      type: 'doubt_asked',
      title: 'New Doubt Asked',
      time: d.createdAt,
      message: `${(d.askerId as any)?.name || 'Student'} asked a doubt on "${d.title}" in ${(d.subjectId as any)?.code || 'GEN'}.`,
      color: 'bg-indigo-505'
    });
  });

  recentAnswers.forEach((ans) => {
    timelineItems.push({
      type: 'answer_submitted',
      title: ans.isTeacherVerified ? 'Answer Verified by Faculty' : 'Answer Submitted by Peer',
      time: ans.createdAt,
      message: `${(ans.solverId as any)?.name || 'Student'} submitted an answer to "${(ans.doubtId as any)?.title || 'doubt'}".`,
      color: ans.isTeacherVerified ? 'bg-emerald-500' : 'bg-purple-500'
    });
  });

  recentEscalations.forEach((esc) => {
    const doubt = esc.doubtId as any;
    timelineItems.push({
      type: 'doubt_escalated',
      title: 'Doubt Escalated to Faculty',
      time: esc.escalatedAt,
      message: `Doubt "${doubt?.title || 'doubt'}" was escalated due to ${esc.reason.replace('-', ' ')}.`,
      color: 'bg-amber-500'
    });
  });

  timelineItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const activityTimeline = timelineItems.slice(0, 5);

  return {
    total,
    peerSolved,
    aiHinted,
    escalated,
    teacherSolved,
    open,
    workloadReduction: `${workloadReduction.toFixed(1)}%`,
    workloadReductionPercent: workloadReduction,
    minutesSaved,
    hoursSaved,
    teacherInterventionRate: `${teacherInterventionRate.toFixed(1)}%`,
    averageResolutionTimeMinutes,
    activityTimeline
  };
};

// GET /api/analytics/workload
export const getWorkloadData = async (req: AuthRequest, res: Response) => {
  try {
    const metrics = await calculateWorkloadMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Workload metrics fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch workload metrics' });
  }
};

// GET /api/analytics/weekly-trend
export const getWeeklyTrendData = async (req: AuthRequest, res: Response) => {
  try {
    const trend = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const startOfWeek = new Date();
      startOfWeek.setDate(now.getDate() - (i + 1) * 7 + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date();
      endOfWeek.setDate(now.getDate() - i * 7);
      endOfWeek.setHours(23, 59, 59, 999);

      const doubtsCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfWeek, $lte: endOfWeek }
      });
      const peerSolvedCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        status: 'peer_solved'
      });
      const aiHintedCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        status: 'ai_hinted'
      });
      const escalatedCount = await Doubt.countDocuments({
        createdAt: { $gte: startOfWeek, $lte: endOfWeek },
        status: 'escalated'
      });

      const workloadReductionPercent = doubtsCount > 0 
        ? Math.round(((peerSolvedCount + aiHintedCount) / doubtsCount) * 100)
        : 0;

      trend.push({
        week: `Week ${6 - i}`,
        peerSolved: peerSolvedCount,
        aiHinted: aiHintedCount,
        escalated: escalatedCount,
        workloadReduction: workloadReductionPercent
      });
    }

    const totalActivity = trend.reduce((sum, item) => sum + item.peerSolved + item.aiHinted + item.escalated, 0);
    if (totalActivity === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(trend);
  } catch (error) {
    console.error('Weekly trend fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch weekly trend' });
  }
};

// GET /api/analytics/topic-heatmap
export const getTopicHeatmapData = async (req: AuthRequest, res: Response) => {
  try {
    const totalCount = await Doubt.countDocuments();
    if (totalCount === 0) {
      return res.status(200).json([]);
    }

    const heatmap = await Doubt.aggregate([
      {
        $group: {
          _id: { topic: '$topic', subjectId: '$subjectId' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'subjects',
          localField: '_id.subjectId',
          foreignField: '_id',
          as: 'subjectInfo'
        }
      },
      { $unwind: { path: '$subjectInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          topic: '$_id.topic',
          count: '$count',
          subject: { $ifNull: ['$subjectInfo.name', 'General'] }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json(heatmap);
  } catch (error) {
    console.error('Topic heatmap fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch topic heatmap' });
  }
};
