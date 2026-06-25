import { Response } from 'express';
import { Doubt, Answer, Subject, Escalation, StudentProfile } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { GamificationService } from '../services/gamificationService';

export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId, content, hintsUsedCount } = req.body;
    const solverId = req.user?.userId;

    if (!doubtId || !content) {
      return res.status(400).json({ message: 'Doubt ID and answer content are required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // 1. Create preliminary answer
    const answer = new Answer({
      doubtId,
      solverId,
      content,
      hintsUsedCount: hintsUsedCount || 0
    });
    await answer.save();

    // Update doubt status to in-progress
    if (doubt.status === 'open') {
      doubt.status = 'in-progress';
      await doubt.save();
    }

    // 2. Invoke AI evaluation
    const evaluation = await AIService.evaluateAnswer(doubt.title, doubt.description, content);
    answer.aiEvaluation = {
      correctness: evaluation.correctness,
      clarity: evaluation.clarity,
      completeness: evaluation.completeness,
      usefulness: evaluation.usefulness,
      score: evaluation.score,
      feedback: evaluation.feedback
    };

    // 3. Gamification scoring logic
    let points = 0;
    let reason = '';

    if (evaluation.score >= 50) {
      // Base points for correct/decent answer
      points += 100;
      reason = 'Solved a peer doubt';

      // Bonus points for high-quality response
      if (evaluation.score >= 85) {
        points += 50;
        reason += ' with High-Quality AI Rating (85+)';
      }

      // Bonus for first correct answer (check if other accepted/high-rated answers exist)
      const otherAnswers = await Answer.find({ doubtId, _id: { $ne: answer._id } });
      const hasOtherGoodAnswer = otherAnswers.some(a => (a.aiEvaluation?.score || 0) >= 70);
      if (!hasOtherGoodAnswer) {
        points += 30;
        reason += ' (First Correct Solver)';
      }

      // Award XP
      const gamificationResult = await GamificationService.awardPoints(
        solverId!,
        points,
        'solve',
        reason,
        doubt.subjectId.toString()
      );

      answer.pointsAwarded = points;
      await answer.save();

      // Trigger automatic escalation check
      const escalationCheck = await AIService.decideEscalation(doubtId);
      if (escalationCheck.escalate) {
        doubt.status = 'escalated';
        await doubt.save();

        const escalation = new Escalation({
          doubtId: doubt._id,
          reason: escalationCheck.reason || 'low-confidence',
          status: 'pending'
        });
        await escalation.save();
      }

      return res.status(201).json({
        answer,
        evaluation,
        xpGained: points,
        levelUp: gamificationResult.levelUp,
        newLevel: gamificationResult.newLevel
      });
    } else {
      // Substandard answer, no points awarded
      answer.pointsAwarded = 0;
      await answer.save();

      // Trigger escalation immediately if low score and no other answers
      const otherAnswers = await Answer.find({ doubtId });
      if (otherAnswers.length === 1) {
        doubt.status = 'escalated';
        await doubt.save();

        const escalation = new Escalation({
          doubtId: doubt._id,
          reason: 'low-confidence',
          status: 'pending'
        });
        await escalation.save();
      }

      return res.status(201).json({
        answer,
        evaluation,
        xpGained: 0,
        message: 'Answer submission logged. Keep practicing to improve scores!'
      });
    }
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
};

export const acceptAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const answer = await Answer.findById(id).populate('doubtId');

    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    const doubt = answer.doubtId as any;
    if (doubt.askerId.toString() !== req.user?.userId) {
      return res.status(403).json({ message: 'Only the doubt asker can accept answers' });
    }

    answer.isAccepted = true;
    await answer.save();

    doubt.status = 'resolved';
    await doubt.save();

    // Reward the solver for accepted answer
    const gamificationResult = await GamificationService.awardPoints(
      answer.solverId,
      50,
      'bonus_accepted',
      'Answer accepted by peer',
      doubt.subjectId.toString()
    );

    res.status(200).json({
      message: 'Answer accepted successfully',
      answer,
      xpGained: 50,
      levelUp: gamificationResult.levelUp,
      newLevel: gamificationResult.newLevel
    });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({ message: 'Failed to accept answer' });
  }
};

export const verifyAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const answer = await Answer.findById(id).populate('doubtId');

    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    const doubt = answer.doubtId as any;

    answer.isTeacherVerified = true;
    answer.isAccepted = true; // Implicitly accepted
    await answer.save();

    doubt.status = 'resolved';
    await doubt.save();

    // Close any pending escalations for this doubt
    await Escalation.findOneAndUpdate(
      { doubtId: doubt._id, status: 'pending' },
      { status: 'resolved', resolvedAt: new Date() }
    );

    // Award bonus points and custom badge trigger to solver
    const gamificationResult = await GamificationService.awardPoints(
      answer.solverId,
      100,
      'bonus_accepted',
      'Verified as official teacher solution',
      doubt.subjectId.toString()
    );

    // Award special teacher verified badge
    const profile = await StudentProfile.findOne({ userId: answer.solverId });
    if (profile) {
      const badgeIds = profile.badges.map((b: any) => b.badgeId);
      if (!badgeIds.includes('teacher_verified')) {
        profile.badges.push({ badgeId: 'teacher_verified', earnedAt: new Date() });
        await profile.save();
      }
    }

    res.status(200).json({
      message: 'Answer verified by faculty',
      answer,
      xpGained: 100,
      levelUp: gamificationResult.levelUp,
      newLevel: gamificationResult.newLevel
    });
  } catch (error) {
    console.error('Verify answer error:', error);
    res.status(500).json({ message: 'Failed to verify answer' });
  }
};

export const getDoubtAnswers = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId } = req.params;
    const answers = await Answer.find({ doubtId })
      .populate('solverId', 'name email')
      .sort({ isTeacherVerified: -1, isAccepted: -1, 'aiEvaluation.score': -1 });

    res.status(200).json(answers);
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({ message: 'Failed to retrieve answers' });
  }
};
