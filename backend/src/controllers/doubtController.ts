import { Response } from 'express';
import { Doubt, Subject, AIAnalysis, User, StudentProfile, Escalation, Hint } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { GamificationService } from '../services/gamificationService';

export const createDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description = '', subjectCode, fileUrl } = req.body;
    const askerId = req.user?.userId;

    if (!title || !subjectCode) {
      return res.status(400).json({ message: 'Title and subject code are required' });
    }

    // Resolve subject
    const subject = await Subject.findOne({ code: subjectCode });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // 1. Save initial doubt
    const doubt = new Doubt({
      title,
      description,
      fileUrl,
      askerId,
      subjectId: subject._id,
      status: 'open'
    });
    await doubt.save();

    // 2. Invoke AI analysis
    const analysisResult = await AIService.analyzeDoubt(title, description);

    // 3. Save AI Analysis
    const aiAnalysis = new AIAnalysis({
      doubtId: doubt._id,
      topic: analysisResult.topic,
      difficulty: analysisResult.difficulty,
      isPeerAnswerable: analysisResult.isPeerAnswerable,
      explanation: analysisResult.explanation
    });
    await aiAnalysis.save();

    // Update doubt details with AI classifications
    doubt.topic = analysisResult.topic;
    doubt.difficulty = analysisResult.difficulty;
    
    // 4. Peer Routing suggestions
    // Recommend peer solvers who have high reputation or levels
    // We'll query student profiles that have subject reputation in this subject
    const potentialPeers = await StudentProfile.find({
      userId: { $ne: askerId }
    })
      .sort({ [`subjectReputation.${subject._id}`]: -1, xp: -1 })
      .limit(3)
      .populate({ path: 'userId', select: 'name' });

    const peerIds = potentialPeers.map(p => p.userId._id);
    doubt.peerResponderIds = peerIds;
    await doubt.save();

    // 5. Award points to the asker for participation (25 XP)
    await GamificationService.awardPoints(
      askerId!,
      25,
      'ask',
      `Asked a well-formulated doubt about ${analysisResult.topic}`,
      subject._id.toString()
    );

    res.status(201).json({
      doubt,
      analysis: aiAnalysis,
      suggestedPeers: potentialPeers.map(p => ({ id: p.userId._id, name: (p.userId as any).name }))
    });
  } catch (error) {
    console.error('Create doubt error:', error);
    res.status(500).json({ message: 'Failed to create doubt' });
  }
};

export const getDoubtsFeed = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectCode, difficulty, status, recommendedOnly } = req.query;
    const filter: any = {};

    if (subjectCode) {
      const subject = await Subject.findOne({ code: subjectCode });
      if (subject) filter.subjectId = subject._id;
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (status) {
      if (status === 'resolved') {
        filter.status = { $in: ['peer_solved', 'ai_hinted', 'teacher_solved'] };
      } else {
        filter.status = status;
      }
    }

    if (recommendedOnly && req.user?.userId) {
      // Filter where the current student is listed in peerResponderIds
      filter.peerResponderIds = req.user.userId;
      filter.status = 'open';
    }

    const doubts = await Doubt.find(filter)
      .sort({ createdAt: -1 })
      .populate('askerId', 'name email')
      .populate('subjectId', 'name code');

    res.status(200).json(doubts);
  } catch (error) {
    console.error('Fetch doubts feed error:', error);
    res.status(500).json({ message: 'Failed to retrieve doubts feed' });
  }
};

export const getDoubtDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doubt = await Doubt.findById(id)
      .populate('askerId', 'name email')
      .populate('subjectId', 'name code');

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const aiAnalysis = await AIAnalysis.findOne({ doubtId: doubt._id });
    const escalation = await Escalation.findOne({ doubtId: doubt._id, status: 'pending' });

    res.status(200).json({
      doubt,
      aiAnalysis,
      isEscalated: !!escalation,
      escalationReason: escalation?.reason || null
    });
  } catch (error) {
    console.error('Fetch doubt details error:', error);
    res.status(500).json({ message: 'Failed to retrieve doubt details' });
  }
};

export const escalateDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // 'timeout' | 'low-confidence' | 'contradictory'

    const doubt = await Doubt.findById(id);
    if (!doubt) return res.status(404).json({ message: 'Doubt not found' });

    doubt.status = 'escalated';
    doubt.escalatedAt = new Date();
    await doubt.save();

    const escalation = new Escalation({
      doubtId: doubt._id,
      reason: reason || 'low-confidence',
      status: 'pending'
    });
    await escalation.save();

    res.status(200).json({ message: 'Doubt escalated to faculty queue', doubt, escalation });
  } catch (error) {
    console.error('Escalation error:', error);
    res.status(500).json({ message: 'Failed to escalate doubt' });
  }
};

export const updateDoubtStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'peer_solved', 'ai_hinted', 'escalated', 'teacher_solved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    doubt.status = status as any;

    if (status === 'peer_solved') {
      doubt.resolvedAt = new Date();
      doubt.resolvedBy = 'peer';
      const createdTime = new Date(doubt.createdAt).getTime();
      doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
    } else if (status === 'ai_hinted') {
      doubt.resolvedAt = new Date();
      doubt.resolvedBy = 'ai';
      const hintCount = await Hint.countDocuments({ doubtId: doubt._id });
      doubt.hintsUsed = hintCount;
    } else if (status === 'teacher_solved') {
      doubt.resolvedAt = new Date();
      doubt.resolvedBy = 'teacher';
      const createdTime = new Date(doubt.createdAt).getTime();
      doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
      
      // Resolve any pending escalations
      await Escalation.findOneAndUpdate(
        { doubtId: doubt._id, status: 'pending' },
        { status: 'resolved', resolvedAt: new Date() }
      );
    } else if (status === 'escalated') {
      doubt.escalatedAt = new Date();
    }

    await doubt.save();

    res.status(200).json({ message: 'Doubt status updated successfully', doubt });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update doubt status' });
  }
};
