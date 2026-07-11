import mongoose from 'mongoose';
import { Response } from 'express';
import { Doubt, Subject, AIAnalysis, User, StudentProfile, Escalation, HintHistory, Answer, RefereeEvaluation } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { GamificationService } from '../services/gamificationService';
import * as geminiService from '../services/geminiService';

export const createDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const {
      question,
      inputType = 'text',
      originalUploadUrl,
      extractedText,
      subjectCode,
      customSubject
    } = req.body;
    const askerId = req.user?.userId;

    if (!question || (!subjectCode && !customSubject)) {
      return res.status(400).json({ message: 'Question text and subject details are required' });
    }

    // Resolve or create subject
    let subject;
    if (customSubject && customSubject.trim() !== '') {
      const trimmedSubject = customSubject.trim();
      // Case-insensitive search
      subject = await Subject.findOne({ name: { $regex: new RegExp(`^${trimmedSubject}$`, 'i') } });
      if (!subject) {
        // Create a unique uppercase subject code
        const generatedCode = 'SUB-' + trimmedSubject.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
        subject = new Subject({
          name: trimmedSubject,
          code: generatedCode,
          description: `Custom subject entered by student.`
        });
        await subject.save();
      }
    } else if (subjectCode) {
      subject = await Subject.findOne({ code: subjectCode });
    }

    if (!subject) {
      return res.status(404).json({ message: 'Subject not resolved' });
    }

    // Generate title (compatibility) and description
    const title = question.length > 80 ? question.substring(0, 80) + '...' : question;
    const description = question;

    // Generate stable anonymousId for asker
    const anonNum = parseInt(askerId!.toString().slice(-4), 16) % 1000;
    const anonymousId = `Student #${anonNum}`;

    // 1. Save initial doubt
    const doubt = new Doubt({
      title,
      description,
      question,
      inputType,
      originalUploadUrl,
      extractedText,
      fileUrl: originalUploadUrl, // sync for backwards compatibility
      askerId,
      subjectId: subject._id,
      status: 'open',
      anonymousId
    });
    await doubt.save();

    // 2. Invoke detailed AI analysis
    const analysisResult = await geminiService.analyzeDoubtDetailed(question, subject.name);

    // 3. Save AI Analysis
    const aiAnalysis = new AIAnalysis({
      doubtId: doubt._id,
      topic: analysisResult.topic,
      difficulty: analysisResult.difficulty,
      isPeerAnswerable: analysisResult.difficulty !== 'hard',
      explanation: analysisResult.explanation
    });
    await aiAnalysis.save();

    // Update doubt details with AI classifications and keywords
    doubt.topic = analysisResult.topic;
    doubt.difficulty = analysisResult.difficulty;
    doubt.keywords = analysisResult.keywords || [];
    
    // 4. Peer Routing suggestions
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
    const { subjectCode, difficulty, status, recommendedOnly, askerId } = req.query;
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

    if (askerId) {
      filter.askerId = askerId;
    }

    const doubts = await Doubt.find(filter)
      .sort({ createdAt: -1 })
      .populate('askerId', 'name email rollNumber section batch department')
      .populate('subjectId', 'name code');

    // Enrich doubts with answer statistics
    const doubtsWithStats = await Promise.all(doubts.map(async (d) => {
      const answers = await Answer.find({ doubtId: d._id });
      const scoredAnswers = answers.filter((a: any) => a.aiScore !== undefined);
      const avgScore = scoredAnswers.length > 0
        ? Math.round(scoredAnswers.reduce((sum: number, a: any) => sum + (a.aiScore || 0), 0) / scoredAnswers.length)
        : 0;

      const dObj = d.toObject() as any;
      dObj.answersCount = answers.length;
      dObj.averageAiScore = avgScore;
      return dObj;
    }));

    const isTeacher = req.user?.role === 'teacher';
    if (isTeacher) {
      return res.status(200).json(doubtsWithStats);
    }

    // Student Anonymization
    const anonymizedDoubts = doubtsWithStats.map(doubtObj => {
      const asker = doubtObj.askerId as any;
      if (asker) {
        const askerNum = parseInt(asker._id.toString().slice(-4), 16) % 1000;
        const anonAskerId = doubtObj.anonymousId || `Student #${askerNum}`;
        
        if (asker._id.toString() === req.user?.userId) {
          doubtObj.askerName = `${anonAskerId} (You)`;
          doubtObj.askerId = {
            _id: asker._id,
            name: `${anonAskerId} (You)`
          };
        } else {
          doubtObj.askerName = anonAskerId;
          doubtObj.askerId = {
            _id: asker._id,
            name: anonAskerId
          };
        }
      } else {
        doubtObj.askerName = doubtObj.anonymousId || 'Anonymous Student';
        doubtObj.askerId = {
          _id: null,
          name: doubtObj.anonymousId || 'Anonymous Student'
        };
      }
      return doubtObj;
    });

    res.status(200).json(anonymizedDoubts);
  } catch (error) {
    console.error('Fetch doubts feed error:', error);
    res.status(500).json({ message: 'Failed to retrieve doubts feed' });
  }
};

export const getDoubtDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Increment view count dynamically
    const doubt = await Doubt.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })
      .populate('askerId', 'name email rollNumber section batch department')
      .populate('subjectId', 'name code');

    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const aiAnalysis = await AIAnalysis.findOne({ doubtId: doubt._id });
    const escalation = await Escalation.findOne({ doubtId: doubt._id, status: 'pending' });

    const isTeacher = req.user?.role === 'teacher';
    if (isTeacher) {
      return res.status(200).json({
        doubt,
        aiAnalysis,
        isEscalated: !!escalation,
        escalationReason: escalation?.reason || null
      });
    }

    // Student Anonymization
    const doubtObj = doubt.toObject() as any;
    const asker = doubtObj.askerId as any;
    if (asker) {
      const askerNum = parseInt(asker._id.toString().slice(-4), 16) % 1000;
      const anonAskerId = doubtObj.anonymousId || `Student #${askerNum}`;
      
      if (asker._id.toString() === req.user?.userId) {
        doubtObj.askerName = `${anonAskerId} (You)`;
        doubtObj.askerId = {
          _id: asker._id,
          name: `${anonAskerId} (You)`
        };
      } else {
        doubtObj.askerName = anonAskerId;
        doubtObj.askerId = {
          _id: asker._id,
          name: anonAskerId
        };
      }
    } else {
      doubtObj.askerName = doubtObj.anonymousId || 'Anonymous Student';
      doubtObj.askerId = {
        _id: null,
        name: doubtObj.anonymousId || 'Anonymous Student'
      };
    }

    res.status(200).json({
      doubt: doubtObj,
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
      const hintCount = await HintHistory.countDocuments({ doubtId: doubt._id, ladderIndex: { $gte: 0 } });
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

export const updateDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { question, title, description, topic, difficulty } = req.body;
    const userId = req.user?.userId;

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (doubt.askerId.toString() !== userId?.toString()) {
      return res.status(403).json({ message: 'Only the asker can update this doubt' });
    }

    if (question) doubt.question = question;
    if (title) doubt.title = title;
    if (description !== undefined) doubt.description = description;
    if (topic) doubt.topic = topic;
    if (difficulty) doubt.difficulty = difficulty;

    doubt.updatedAt = new Date();
    await doubt.save();

    res.status(200).json({ message: 'Doubt updated successfully', doubt });
  } catch (error) {
    console.error('Update doubt error:', error);
    res.status(500).json({ message: 'Failed to update doubt' });
  }
};

export const deleteDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (doubt.askerId.toString() !== userId?.toString()) {
      return res.status(403).json({ message: 'Only the asker can delete this doubt' });
    }

    // Clean up all related documents
    await Answer.deleteMany({ doubtId: id });
    await AIAnalysis.deleteMany({ doubtId: id });
    await Escalation.deleteMany({ doubtId: id });
    await HintHistory.deleteMany({ doubtId: id });
    await RefereeEvaluation.deleteMany({ doubtId: id });
    await Doubt.findByIdAndDelete(id);

    res.status(200).json({ message: 'Doubt deleted successfully' });
  } catch (error) {
    console.error('Delete doubt error:', error);
    res.status(500).json({ message: 'Failed to delete doubt' });
  }
};

export const updateDoubtSettings = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      allowCommunitySolutions,
      hideCommunitySolutionsUntilFirstAttempt,
      allowUnlimitedAttempts,
      maxAttempts,
      allowAnswerEditing
    } = req.body;

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (allowCommunitySolutions !== undefined) doubt.allowCommunitySolutions = allowCommunitySolutions;
    if (hideCommunitySolutionsUntilFirstAttempt !== undefined) doubt.hideCommunitySolutionsUntilFirstAttempt = hideCommunitySolutionsUntilFirstAttempt;
    if (allowUnlimitedAttempts !== undefined) doubt.allowUnlimitedAttempts = allowUnlimitedAttempts;
    if (maxAttempts !== undefined) {
      doubt.maxAttempts = maxAttempts === '' || maxAttempts === null ? null : Number(maxAttempts);
    }
    if (allowAnswerEditing !== undefined) doubt.allowAnswerEditing = allowAnswerEditing;

    await doubt.save();

    res.status(200).json({ message: 'Question settings updated successfully', doubt });
  } catch (error) {
    console.error('Update doubt settings error:', error);
    res.status(500).json({ message: 'Failed to update question settings' });
  }
};

export const grantStudentPermission = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    const doubt = await Doubt.findById(id);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (!doubt.permittedStudentIds) {
      doubt.permittedStudentIds = [];
    }

    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const alreadyPermitted = doubt.permittedStudentIds.some(
      (pid) => pid.toString() === studentId
    );

    if (!alreadyPermitted) {
      doubt.permittedStudentIds.push(studentObjectId);
      await doubt.save();
    }

    res.status(200).json({ message: 'Permission granted to student successfully', doubt });
  } catch (error) {
    console.error('Grant student permission error:', error);
    res.status(500).json({ message: 'Failed to grant permission to student' });
  }
};
