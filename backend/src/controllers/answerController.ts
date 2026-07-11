import { Response } from 'express';
import { Doubt, Answer, Subject, Escalation, StudentProfile } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import { GamificationService } from '../services/gamificationService';

export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      doubtId, 
      content, 
      hintsUsedCount,
      inputType = 'text',
      originalUploadUrl,
      extractedText
    } = req.body;
    const solverId = req.user?.userId;

    if (!doubtId || !content) {
      return res.status(400).json({ message: 'Doubt ID and answer content are required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // Check attempt limits (Teacher settings)
    const currentAttemptsCount = await Answer.countDocuments({ doubtId, solverId });
    if (!doubt.allowUnlimitedAttempts && doubt.maxAttempts && currentAttemptsCount >= doubt.maxAttempts) {
      return res.status(400).json({ message: `You have reached the maximum number of attempts (${doubt.maxAttempts}) allowed for this question.` });
    }

    // Find all previous attempts to compute attemptNumber, highestPreviousScore, and points history
    const previousSubmissions = await Answer.find({ doubtId, solverId });
    let highestPreviousScore = 0;
    for (const prev of previousSubmissions) {
      const s = prev.aiScore ?? prev.aiEvaluation?.score ?? 0;
      if (s > highestPreviousScore) {
        highestPreviousScore = s;
      }
    }

    // Set any previous latest answers for this student and question to not latest
    const previousLatest = await Answer.findOne({ doubtId, solverId, isLatest: true });
    if (previousLatest) {
      previousLatest.isLatest = false;
      await previousLatest.save();
    }

    const attemptNumber = previousSubmissions.length + 1;

    // Generate stable anonymous ID for the solver
    const anonNum = parseInt(solverId!.toString().slice(-4), 16) % 1000;
    const anonymousId = `Student #${anonNum}`;
    
    // Check if solver is the asker
    const isOwnerAnswer = doubt.askerId.toString() === solverId!.toString();

    // Create the versions history for the new answer
    const versions = previousSubmissions.sort((a, b) => a.attemptNumber - b.attemptNumber).map(att => ({
      content: att.content,
      inputType: att.inputType || 'text',
      originalUploadUrl: att.originalUploadUrl,
      extractedText: att.extractedText,
      aiScore: att.aiScore,
      aiEvaluation: att.aiEvaluation,
      pointsAwarded: att.pointsAwarded,
      createdAt: att.createdAt
    }));

    // Create preliminary answer document
    const answer = new Answer({
      doubtId,
      solverId,
      content,
      hintsUsedCount: hintsUsedCount || 0,
      inputType,
      originalUploadUrl,
      extractedText,
      anonymousId,
      isOwnerAnswer,
      attemptNumber,
      isLatest: true,
      versions: []
    });

    if (doubt.status === 'escalated') {
      answer.isPublished = true;
      versions.push({
        content,
        inputType,
        originalUploadUrl,
        extractedText,
        pointsAwarded: 0,
        createdAt: new Date(),
        aiScore: undefined,
        aiEvaluation: undefined
      });
      answer.versions = versions;
      await answer.save();

      return res.status(201).json({
        answer,
        xpGained: 0,
        coinsGained: 0,
        levelUp: false,
        newLevel: 1,
        streakCount: 0,
        published: true,
        message: 'Your answer has been submitted for faculty review.'
      });
    }

    // Real-time AI grading evaluation follows.
    try {
      // Invoke AI evaluation
      const evaluation = await AIService.evaluateAnswer(doubt.title, doubt.description, content);
      const aiEvaluation = {
        correctness: evaluation.correctness,
        clarity: evaluation.clarity,
        completeness: evaluation.completeness,
        usefulness: evaluation.usefulness,
        score: evaluation.score,
        feedback: evaluation.feedback,
        logicalThinking: (evaluation as any).logicalThinking,
        presentation: (evaluation as any).presentation,
        strengths: (evaluation as any).strengths,
        weaknesses: (evaluation as any).weaknesses,
        suggestions: (evaluation as any).suggestions,
        missingConcepts: (evaluation as any).missingConcepts,
        bestConceptsCovered: (evaluation as any).bestConceptsCovered,
        whyStrong: (evaluation as any).whyStrong
      };

      answer.aiEvaluation = aiEvaluation;
      answer.aiScore = evaluation.score;
      answer.feedback = evaluation.feedback;
      answer.confidence = (evaluation as any).confidence || 80;
      
      // Feature 9: KB status rule
      answer.knowledgeBaseStatus = evaluation.score >= 90 ? 'saved' : 'pending';

      // Feature 2: Publishing rules
      const isScorePassing = evaluation.score >= 50;
      answer.isPublished = isScorePassing;

      // Mark 100% correct answers as verified automatically (Verified Solution)
      if (evaluation.correctness === 100 || evaluation.score === 100) {
        answer.isTeacherVerified = true;
      }

      // Gamification scoring logic
      let points = 0;
      let coins = 0;
      let reason = '';
      let gamificationResult = { xpGained: 0, coinsGained: 0, levelUp: false, newLevel: 1 };
      let streakMessage = '';
      let streakBonusXP = 0;
      let currentStreak = 0;

      // Find or create profile
      const profile = await StudentProfile.findOne({ userId: solverId }) || new StudentProfile({ userId: solverId });

      if (isScorePassing) {
        const isCorrect = evaluation.verdict === 'correct' || evaluation.correctness === 100 || evaluation.score === 100;

        if (isCorrect) {
          // Increment solves streak
          profile.consecutiveSolves = (profile.consecutiveSolves || 0) + 1;
          currentStreak = profile.consecutiveSolves;
        } else {
          profile.consecutiveSolves = 0;
        }

        // Only award points/XP if score improved
        if (evaluation.score > highestPreviousScore) {
          const diff = (doubt.difficulty || 'medium').toLowerCase();
          const DIFFICULTY_POINTS: Record<string, number> = {
            easy: 10,
            medium: 20,
            hard: 35,
            expert: 50
          };
          const basePoints = DIFFICULTY_POINTS[diff] || 20;

          let targetTotalPoints = 0;
          let targetTotalCoins = 0;

          if (isCorrect) {
            targetTotalPoints = basePoints;
            targetTotalCoins = basePoints;

            if (evaluation.score >= 85) {
              targetTotalPoints += 15;
            }

            if (currentStreak === 3) {
              streakBonusXP = 10;
              streakMessage = "🔥 3 Question Streak";
            } else if (currentStreak === 5) {
              streakBonusXP = 20;
              streakMessage = "⚡ Combo ×5";
            } else if (currentStreak === 10) {
              streakBonusXP = 40;
              streakMessage = "🌟 Excellent Work!";
            } else if (currentStreak > 5 && currentStreak % 5 === 0) {
              streakBonusXP = 30;
              streakMessage = `⚡ Combo ×${currentStreak}`;
            } else if (currentStreak >= 3) {
              streakMessage = "🌟 Excellent Work!";
            }

            if (streakBonusXP > 0) {
              targetTotalPoints += streakBonusXP;
            }

            reason = isOwnerAnswer ? `Self-resolved own doubt (${diff})` : `Solved a peer doubt (${diff})`;
            if (streakBonusXP > 0) {
              reason += ` + Streak Bonus (${streakMessage})`;
            }
            if (evaluation.score >= 85) {
              reason += ' + High-Quality Bonus';
            }
          } else {
            targetTotalPoints = Math.floor(basePoints * (evaluation.score / 100));
            targetTotalCoins = Math.floor(basePoints * (evaluation.score / 100));
            if (targetTotalPoints < 5) targetTotalPoints = 5;
            reason = isOwnerAnswer ? 'Self-resolved own doubt (partial)' : 'Solved a peer doubt (partial)';
          }

          // Calculate point net gains (deduct previously awarded points for this doubt)
          const prevPointsAwarded = previousSubmissions.reduce((sum, p) => sum + (p.pointsAwarded || 0), 0);
          points = Math.max(0, targetTotalPoints - prevPointsAwarded);
          coins = Math.max(0, targetTotalCoins - prevPointsAwarded);

          if (points > 0) {
            const resG = await GamificationService.awardPoints(
              solverId!,
              points,
              'solve',
              reason,
              doubt.subjectId?.toString(),
              coins
            );

            gamificationResult = {
              xpGained: points,
              coinsGained: coins,
              levelUp: resG.levelUp,
              newLevel: resG.newLevel
            };
          }
        }

        // Save consecutiveSolves back to database
        profile.consecutiveSolves = currentStreak;
        await profile.save();

        doubt.status = isOwnerAnswer ? 'teacher_solved' : 'peer_solved';
        doubt.resolvedAt = new Date();
        doubt.resolvedBy = isOwnerAnswer ? 'teacher' : 'peer';
        const createdTime = new Date(doubt.createdAt).getTime();
        doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
        await doubt.save();

        answer.pointsAwarded = points;

        // Trigger automatic escalation check if not self-solved
        if (!isOwnerAnswer) {
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
        }
      } else {
        // Substandard answer, no points awarded
        profile.consecutiveSolves = 0;
        await profile.save();

        answer.pointsAwarded = 0;

        // Trigger escalation immediately if low score and no other answers and not self-solved
        if (!isOwnerAnswer) {
          const otherAnswers = await Answer.find({ doubtId });
          if (otherAnswers.length === 0 || (otherAnswers.length === 1 && otherAnswers[0]._id.toString() === answer._id.toString())) {
            doubt.status = 'escalated';
            await doubt.save();

            const escalation = new Escalation({
              doubtId: doubt._id,
              reason: 'low-confidence',
              status: 'pending'
            });
            await escalation.save();
          }
        }
      }

      // Push current attempt into version history
      versions.push({
        content,
        inputType,
        originalUploadUrl,
        extractedText,
        aiScore: evaluation.score,
        aiEvaluation,
        pointsAwarded: answer.pointsAwarded,
        createdAt: new Date()
      });
      answer.versions = versions;

      await answer.save();

      return res.status(201).json({
        answer,
        evaluation,
        xpGained: gamificationResult.xpGained,
        coinsGained: gamificationResult.coinsGained,
        levelUp: gamificationResult.levelUp,
        newLevel: gamificationResult.newLevel,
        streakCount: currentStreak,
        streakMessage,
        streakBonusXP,
        published: isScorePassing,
        message: isScorePassing
          ? 'Your answer has been successfully published.'
          : 'Your answer needs improvement before it can be shared with other students.'
      });
    } catch (aiError: any) {
      console.error('AI Evaluation failed inside submitAnswer:', aiError);
      
      // Fallback Mechanism (Requirement 6): Check if similar verified answers exist in KB
      const similarKbAnswer = await Answer.findOne({ 
        knowledgeBaseStatus: 'saved',
        doubtId: { $ne: doubtId } 
      }).populate('doubtId');

      // Append current attempt to versions in fallback case
      versions.push({
        content,
        inputType,
        originalUploadUrl,
        extractedText,
        pointsAwarded: 0,
        createdAt: new Date(),
        aiScore: undefined,
        aiEvaluation: undefined
      });
      answer.versions = versions;
      await answer.save();

      if (similarKbAnswer) {
        return res.status(201).json({
          success: false,
          status: "AI_FALLBACK",
          message: "AI is temporarily unavailable. Showing the best verified community answer.",
          fallbackAnswer: {
            question: (similarKbAnswer.doubtId as any)?.title || "Similar Question",
            answer: similarKbAnswer.content,
            score: similarKbAnswer.aiScore || 90
          },
          answer
        });
      }

      // No fallback answer: return standard busy payload
      return res.status(201).json({
        success: false,
        status: "AI_BUSY",
        message: "The AI service is currently experiencing high demand. Please try again in a few moments.",
        answer
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

    doubt.status = 'peer_solved';
    doubt.resolvedAt = new Date();
    doubt.resolvedBy = 'peer';
    const createdTime = new Date(doubt.createdAt).getTime();
    doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
    await doubt.save();

    // Reward the solver for accepted answer
    const gamificationResult = await GamificationService.awardPoints(
      answer.solverId,
      50,
      'bonus_accepted',
      'Answer accepted by peer',
      doubt.subjectId.toString(),
      50
    );

    res.status(200).json({
      message: 'Answer accepted successfully',
      answer,
      xpGained: 50,
      coinsGained: 50,
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
    answer.teacherApproved = true;
    answer.knowledgeBaseStatus = 'saved'; // Add to Knowledge Base
    await answer.save();

    doubt.status = 'teacher_solved';
    doubt.resolvedAt = new Date();
    doubt.resolvedBy = 'teacher';
    const createdTime = new Date(doubt.createdAt).getTime();
    doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
    await doubt.save();

    // Close any pending escalations for this doubt
    await Escalation.findOneAndUpdate(
      { doubtId: doubt._id, status: 'pending' },
      { status: 'resolved', resolvedAt: new Date() }
    );

    // Award bonus points and custom badge trigger to solver
    const gamificationResult = await GamificationService.awardPoints(
      answer.solverId,
      105, // 100 XP + 5 bonus
      'bonus_accepted',
      'Verified as official teacher solution',
      doubt.subjectId.toString(),
      100 // 100 coins
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
      xpGained: 105,
      coinsGained: 100,
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
    const userId = req.user?.userId;
    const isTeacher = req.user?.role === 'teacher';

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const answers = await Answer.find({ 
      doubtId,
      $or: [
        { isLatest: true },
        { solverId: userId }
      ]
    })
      .populate('solverId', 'name email rollNumber branch section department')
      .sort({ isTeacherVerified: -1, isAccepted: -1, 'aiEvaluation.score': -1 });

    if (isTeacher) {
      // Teachers see everything without limits
      return res.status(200).json(answers);
    }

    // Students Flow:
    const isAsker = doubt.askerId.toString() === userId;
    const hasAttempted = answers.some(ans => ans.solverId?._id?.toString() === userId && ans.isLatest);
    const isPermitted = doubt.permittedStudentIds?.some(id => id.toString() === userId) || false;

    // Check if community solutions are allowed and visible
    let canSeeCommunitySolutions = false;
    if (isAsker) {
      canSeeCommunitySolutions = true;
    } else if (doubt.allowCommunitySolutions) {
      if (!doubt.hideCommunitySolutionsUntilFirstAttempt) {
        canSeeCommunitySolutions = true;
      } else {
        canSeeCommunitySolutions = hasAttempted || isPermitted;
      }
    }

    // 1. If not asker/teacher and not allowed to see community solutions yet
    if (!canSeeCommunitySolutions) {
      const ownAnswers = answers.filter(ans => ans.solverId?._id?.toString() === userId);
      const ownLatest = ownAnswers.find(ans => ans.isLatest);
      
      let responseAnswers: any[] = [];
      if (ownLatest) {
        const ownLatestObj = ownLatest.toObject() as any;
        ownLatestObj.versions = ownAnswers.sort((a, b) => a.attemptNumber - b.attemptNumber).map(att => ({
          content: att.content,
          inputType: att.inputType || 'text',
          originalUploadUrl: att.originalUploadUrl,
          extractedText: att.extractedText,
          aiScore: att.aiScore,
          aiEvaluation: att.aiEvaluation,
          pointsAwarded: att.pointsAwarded,
          createdAt: att.createdAt
        }));
        
        const solverNum = parseInt((ownLatestObj.solverId?._id || userId).toString().slice(-4), 16) % 1000;
        const anonSolverId = ownLatestObj.anonymousId || `Student #${solverNum}`;
        ownLatestObj.solverName = `${anonSolverId} (You)`;
        ownLatestObj.solverId = {
          _id: ownLatestObj.solverId?._id || userId,
          name: `${anonSolverId} (You)`
        };
        responseAnswers.push(ownLatestObj);
      }

      return res.status(200).json({
        unlocked: false,
        message: 'Attempt this question first to unlock community solutions.',
        answers: responseAnswers
      });
    }

    // 2. Unlocked: Anonymize and filter
    const filteredAnswers = answers.filter(ans => {
      const isOwnAnswer = ans.solverId?._id?.toString() === userId;
      if (isOwnAnswer) return true; // Own answers are always visible to owner

      // Asker sees all published answers (score >= 50% or teacherApproved)
      if (isAsker) {
        return ans.isLatest && (ans.isPublished || ans.teacherApproved || (ans.aiScore ?? 0) >= 50);
      }

      // Peer students see only "Verified Solutions" (100% correctness or teacher verified)
      const isVerified = ans.isTeacherVerified || (ans.aiScore === 100) || (ans.aiEvaluation?.correctness === 100);
      return ans.isLatest && isVerified;
    });

    const anonymizedAnswers = filteredAnswers.map(ans => {
      const ansObj = ans.toObject() as any;
      const solver = ansObj.solverId as any;

      // Populate versions for own answer
      if (solver && solver._id.toString() === userId) {
        const ownAttempts = answers.filter(a => a.solverId?._id?.toString() === userId);
        ansObj.versions = ownAttempts.sort((a, b) => a.attemptNumber - b.attemptNumber).map(att => ({
          content: att.content,
          inputType: att.inputType || 'text',
          originalUploadUrl: att.originalUploadUrl,
          extractedText: att.extractedText,
          aiScore: att.aiScore,
          aiEvaluation: att.aiEvaluation,
          pointsAwarded: att.pointsAwarded,
          createdAt: att.createdAt
        }));
      }

      if (solver) {
        const solverNum = parseInt(solver._id.toString().slice(-4), 16) % 1000;
        const anonSolverId = ansObj.anonymousId || `Student #${solverNum}`;
        
        if (solver._id.toString() === userId) {
          ansObj.solverName = `${anonSolverId} (You)`;
          ansObj.solverId = {
            _id: solver._id,
            name: `${anonSolverId} (You)`
          };
        } else {
          // Display actual student name for verified community solutions
          ansObj.solverName = solver.name;
          ansObj.solverId = {
            _id: solver._id,
            name: solver.name
          };
        }
      } else {
        ansObj.solverName = ansObj.anonymousId || 'Anonymous Contributor';
        ansObj.solverId = {
          _id: null,
          name: ansObj.anonymousId || 'Anonymous Contributor'
        };
      }
      return ansObj;
    });

    res.status(200).json({
      unlocked: true,
      answers: anonymizedAnswers
    });
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({ message: 'Failed to retrieve answers' });
  }
};

export const getMySolutions = async (req: AuthRequest, res: Response) => {
  try {
    const solverId = req.user?.userId;
    const answers = await Answer.find({ solverId })
      .populate({
        path: 'doubtId',
        populate: { path: 'subjectId', select: 'name code' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json(answers);
  } catch (error) {
    console.error('Fetch my solutions error:', error);
    res.status(500).json({ message: 'Failed to retrieve solutions' });
  }
};

export const teacherDecision = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const answer = await Answer.findById(id).populate('doubtId');
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (action === 'approve') {
      answer.teacherApproved = true;
      answer.isTeacherVerified = true;
      answer.isPublished = true;
      answer.knowledgeBaseStatus = 'saved';
      await answer.save();

      // Update doubt status
      const doubt = answer.doubtId as any;
      doubt.status = 'teacher_solved';
      doubt.resolvedAt = new Date();
      doubt.resolvedBy = 'teacher';
      await doubt.save();

      // Resolve escalations
      await Escalation.findOneAndUpdate(
        { doubtId: doubt._id, status: 'pending' },
        { status: 'resolved', resolvedAt: new Date() }
      );
    } else if (action === 'reject') {
      answer.teacherApproved = false;
      answer.isTeacherVerified = false;
      answer.isPublished = false;
      answer.knowledgeBaseStatus = 'excluded';
      await answer.save();

      // Update doubt status back to open if no other published answers
      const otherPublished = await Answer.countDocuments({ 
        doubtId: answer.doubtId, 
        _id: { $ne: answer._id },
        isPublished: true 
      });
      if (otherPublished === 0) {
        const doubt = answer.doubtId as any;
        doubt.status = 'open';
        await doubt.save();
      }
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    res.status(200).json({ message: `Answer successfully ${action}ed by teacher`, answer });
  } catch (error) {
    console.error('Teacher decision error:', error);
    res.status(500).json({ message: 'Failed to process teacher decision' });
  }
};

export const upvoteAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const answer = await Answer.findById(id);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (!answer.upvotes) {
      answer.upvotes = [];
    }

    const index = answer.upvotes.indexOf(userId as any);
    if (index === -1) {
      // Add upvote
      answer.upvotes.push(userId as any);
      await answer.save();

      // Award 5 XP to solver for helpful answer upvote
      await GamificationService.awardPoints(
        answer.solverId,
        5,
        'solve',
        'Your answer was marked helpful!',
        undefined,
        5
      );

      return res.status(200).json({ message: 'Answer marked as helpful', upvotes: answer.upvotes });
    } else {
      // Remove upvote
      answer.upvotes.splice(index, 1);
      await answer.save();

      return res.status(200).json({ message: 'Removed helpful mark', upvotes: answer.upvotes });
    }
  } catch (err) {
    console.error('Upvote answer error:', err);
    res.status(500).json({ message: 'Failed to upvote answer' });
  }
};

