import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as geminiService from '../services/geminiService';
import {
  Doubt,
  Answer,
  AIAnalysis,
  HintHistory,
  AnswerEvaluation,
  Escalation,
  RefereeEvaluation
} from '../models/Schemas';
import { GamificationService } from '../services/gamificationService';
import { mapEscalationReason } from '../services/aiService';

// POST /api/ai/analyze-doubt
export const analyzeDoubt = async (req: AuthRequest, res: Response) => {
  try {
    let { doubtId, doubtText, subject, title, description } = req.body;

    if (!doubtText && title) {
      doubtText = description ? `${title}\n${description}` : title;
    }

    if (!doubtText && doubtId) {
      const doubt = await Doubt.findById(doubtId).populate('subjectId');
      if (doubt) {
        doubtText = `${doubt.title}\n${doubt.description}`;
        if (!subject) {
          subject = (doubt.subjectId as any)?.name || 'General';
        }
      }
    }

    if (!doubtText) {
      return res.status(200).json({
        topic: "General Concept",
        difficulty: "medium",
        conceptExplanation: "AI analysis temporarily unavailable. Please provide doubtText.",
        keyTerms: [],
        confidenceScore: 0,
        suggestedApproach: "Break the problem into smaller parts"
      });
    }

    const result = await geminiService.analyzeDoubt(doubtText, subject || 'General');

    if (doubtId) {
      const aiAnalysis = new AIAnalysis({
        doubtId,
        topic: result.topic,
        difficulty: result.difficulty,
        isPeerAnswerable: result.confidenceScore > 50,
        explanation: result.conceptExplanation
      });
      await aiAnalysis.save();

      await Doubt.findByIdAndUpdate(doubtId, {
        topic: result.topic,
        difficulty: result.difficulty
      });
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in analyzeDoubt endpoint:', error);
    res.status(200).json({
      topic: "General Concept",
      difficulty: "medium",
      conceptExplanation: "AI analysis temporarily unavailable. Error occurred.",
      keyTerms: [],
      confidenceScore: 0,
      suggestedApproach: "Break the problem into smaller parts"
    });
  }
};

// POST /api/ai/generate-hint
export const generateHint = async (req: AuthRequest, res: Response) => {
  try {
    let { doubtId, doubtText } = req.body;
    const userId = req.user?.userId;

    if (!doubtId) {
      return res.status(400).json({ message: 'Doubt ID is required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    if (!doubtText) {
      doubtText = `${doubt.title}\n${doubt.description}`;
    }

    const progressiveCount = await HintHistory.countDocuments({ doubtId, userId, ladderIndex: { $gte: 0 } });

    if (progressiveCount >= 6) {
      return res.status(400).json({ message: 'All 6 hints have already been revealed. Try asking a follow-up question or submitting your solution!' });
    }

    const nextLevel = progressiveCount + 1;
    const ladderIndex = progressiveCount;

    const result = await geminiService.generateHints(doubtText, nextLevel);

    if (userId) {
      const history = new HintHistory({
        doubtId,
        userId,
        ladderIndex,
        queryText: '',
        hintContent: result.hint
      });
      await history.save();

      await Doubt.findByIdAndUpdate(doubtId, { $inc: { hintsUsed: 1 } });
    }

    res.status(200).json({
      hintContent: result.hint,
      ladderIndex,
      totalHintsUsed: progressiveCount + 1,
      encouragement: result.encouragement
    });
  } catch (error) {
    console.error('Error in generateHint endpoint:', error);
    res.status(500).json({ message: 'Failed to generate progressive hint' });
  }
};

// POST /api/ai/chat-coach
export const chatCoach = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId, query } = req.body;
    const userId = req.user?.userId;

    if (!doubtId || !query) {
      return res.status(400).json({ message: 'Doubt ID and student query are required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const doubtText = `${doubt.title}\n${doubt.description}`;

    const history = await HintHistory.find({ doubtId, userId }).sort({ revealedAt: 1 });

    const reply = await geminiService.generateFollowUpReply(doubtText, history, query);

    const historyEntry = new HintHistory({
      doubtId,
      userId,
      ladderIndex: -1,
      queryText: query,
      hintContent: reply
    });
    await historyEntry.save();

    res.status(200).json({
      queryText: query,
      hintContent: reply,
      revealedAt: historyEntry.revealedAt,
      ladderIndex: -1
    });
  } catch (error) {
    console.error('Error in chatCoach endpoint:', error);
    res.status(500).json({ message: 'Failed to process follow-up query' });
  }
};

// POST /api/ai/evaluate-answer
export const evaluateAnswer = async (req: AuthRequest, res: Response) => {
  try {
    let { doubtId, doubtText, answerContent, answerText, answerId } = req.body;

    if (!answerText) {
      answerText = answerContent || '';
    }

    let doubt = null;
    if (doubtId) {
      doubt = await Doubt.findById(doubtId);
      if (doubt && !doubtText) {
        doubtText = `${doubt.title}\n${doubt.description}`;
      }
    }

    const result = await geminiService.evaluateAnswer(doubtText || 'Study query', answerText);

    if (doubtId) {
      // Save full evaluation record
      const evalRecord = new AnswerEvaluation({
        answerId: answerId || null,
        doubtId,
        correctness: result.correctness ?? 50,
        clarity: result.clarity ?? 50,
        completeness: result.completeness ?? 50,
        logicalThinking: result.logicalThinking ?? 50,
        presentation: result.presentation ?? 50,
        overallScore: result.overallScore ?? result.score ?? 50,
        usefulness: result.overallScore ?? result.score ?? 50,
        score: result.score ?? result.overallScore ?? 50,
        verdict: result.verdict ?? 'partially_correct',
        feedback: result.feedback ?? '',
        strengths: result.strengths ?? [],
        weaknesses: result.weaknesses ?? [],
        suggestions: result.suggestions ?? [],
        missingConcepts: result.missingConcepts ?? [],
        xpAwarded: result.xpAwarded ?? 0
      });
      await evalRecord.save();

      // Patch the Answer doc's inline aiEvaluation field for referee/evaluator display
      if (answerId) {
        await Answer.findByIdAndUpdate(answerId, {
          aiEvaluation: {
            correctness: result.correctness ?? 50,
            clarity: result.clarity ?? 50,
            completeness: result.completeness ?? 50,
            usefulness: result.overallScore ?? result.score ?? 50,
            score: result.score ?? result.overallScore ?? 50,
            feedback: result.feedback ?? ''
          }
        });
      }

      // Mark doubt as peer_solved if correct
      if (result.verdict === 'correct' && doubt) {
        doubt.status = 'peer_solved';
        doubt.resolvedAt = new Date();
        doubt.resolvedBy = 'peer';
        const createdTime = new Date(doubt.createdAt).getTime();
        doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
        await doubt.save();
      }

      // Award XP
      const solverId = req.user?.userId;
      if (solverId && doubt && (result.xpAwarded ?? 0) > 0) {
        await GamificationService.awardPoints(
          solverId,
          result.xpAwarded,
          'solve',
          `AI Answer evaluation: ${result.verdict}`,
          doubt.subjectId.toString()
        );
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in evaluateAnswer endpoint:', error);
    res.status(200).json({
      verdict: "partially_correct",
      overallScore: 50,
      score: 50,
      correctness: 50,
      clarity: 50,
      completeness: 50,
      logicalThinking: 50,
      presentation: 50,
      feedback: "Evaluation unavailable. Good effort, review key concepts.",
      strengths: [],
      weaknesses: [],
      suggestions: [],
      missingConcepts: [],
      xpAwarded: 10
    });
  }
};

// POST /api/ai/referee
// Enhanced: per-answer rubric, confidence score, stores evaluation history
export const referee = async (req: AuthRequest, res: Response) => {
  try {
    const triggeredBy = req.user?.userId;
    let { doubtId, doubtText, answers } = req.body;

    let doubt = null;
    let dbAnswers: any[] = [];

    if (doubtId) {
      doubt = await Doubt.findById(doubtId);
      if (doubt) {
        if (!doubtText) {
          doubtText = `${doubt.title}\n${doubt.description}`;
        }
        if (!answers) {
          dbAnswers = await Answer.find({ doubtId }).populate('solverId', 'name email');
          answers = dbAnswers.map(a => a.content);
        }
      }
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(200).json({
        bestAnswerIndex: 0,
        ranking: [0],
        comparison: "No answers available for referee comparison.",
        missingInAll: [],
        winner: "Review complete.",
        confidenceScore: 0,
        perAnswerScores: []
      });
    }

    const result = await geminiService.refereeAnswers(doubtText || 'Study query', answers);

    // Enrich perAnswerScores with solver info from dbAnswers
    const enrichedScores = (result.perAnswerScores || []).map((s: any, i: number) => {
      const dbAns = dbAnswers[i];
      return {
        ...s,
        answerId: dbAns?._id || undefined,
        solverName: dbAns?.solverId?.name || `Answer ${i + 1}`
      };
    });

    // Determine bestAnswerId from dbAnswers
    const bestAnswerId = dbAnswers[result.bestAnswerIndex]?._id || undefined;

    // Save referee evaluation to history
    if (doubtId && triggeredBy) {
      try {
        const evalDoc = new RefereeEvaluation({
          doubtId,
          triggeredBy,
          perAnswerScores: enrichedScores,
          bestAnswerIndex: result.bestAnswerIndex,
          bestAnswerId,
          ranking: result.ranking || [],
          winner: result.winner || '',
          comparison: result.comparison || '',
          missingInAll: result.missingInAll || [],
          confidenceScore: result.confidenceScore || 0,
          teacherApproved: false
        });
        await evalDoc.save();
      } catch (saveErr) {
        console.warn('Could not save RefereeEvaluation:', saveErr);
      }
    }

    res.status(200).json({
      ...result,
      perAnswerScores: enrichedScores,
      bestAnswerId,
      // Attach bestAnswer info for backward compatibility with FocusRoom UI
      bestAnswer: dbAnswers[result.bestAnswerIndex]
        ? {
            solverName: dbAnswers[result.bestAnswerIndex]?.solverId?.name || 'Student',
            content: dbAnswers[result.bestAnswerIndex]?.content || ''
          }
        : null
    });
  } catch (error) {
    console.error('Error in referee endpoint:', error);
    res.status(200).json({
      bestAnswerIndex: 0,
      ranking: [0],
      comparison: "Referee unavailable. Showing default ordering.",
      missingInAll: [],
      winner: "Completed submission review.",
      confidenceScore: 0,
      perAnswerScores: []
    });
  }
};

// GET /api/ai/referee-history/:doubtId
// Returns all past referee evaluations for a doubt (most recent first)
export const getRefereeHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId } = req.params;

    const history = await RefereeEvaluation.find({ doubtId })
      .populate('triggeredBy', 'name role')
      .populate('overriddenBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ history });
  } catch (error) {
    console.error('Error in getRefereeHistory endpoint:', error);
    res.status(500).json({ message: 'Failed to fetch referee history' });
  }
};

// POST /api/ai/referee-override
// Teacher approves or overrides the AI best-answer selection
export const refereeOverride = async (req: AuthRequest, res: Response) => {
  try {
    const teacherId = req.user?.userId;
    const { evaluationId, action, overriddenBestIndex, teacherNote } = req.body;

    if (!evaluationId || !action) {
      return res.status(400).json({ message: 'evaluationId and action are required' });
    }

    const evalDoc = await RefereeEvaluation.findById(evaluationId);
    if (!evalDoc) {
      return res.status(404).json({ message: 'Referee evaluation not found' });
    }

    if (action === 'approve') {
      evalDoc.teacherApproved = true;
      evalDoc.overriddenBy = teacherId as any;
      evalDoc.overriddenAt = new Date();
      if (teacherNote) evalDoc.teacherNote = teacherNote;
    } else if (action === 'override') {
      if (overriddenBestIndex === undefined || overriddenBestIndex === null) {
        return res.status(400).json({ message: 'overriddenBestIndex is required for override action' });
      }
      evalDoc.teacherApproved = true;
      evalDoc.teacherOverriddenBestIndex = overriddenBestIndex;
      const overriddenScore = evalDoc.perAnswerScores[overriddenBestIndex];
      if (overriddenScore?.answerId) {
        evalDoc.teacherOverriddenBestAnswerId = overriddenScore.answerId as any;
      }
      evalDoc.overriddenBy = teacherId as any;
      evalDoc.overriddenAt = new Date();
      if (teacherNote) evalDoc.teacherNote = teacherNote;
    } else {
      return res.status(400).json({ message: 'action must be "approve" or "override"' });
    }

    await evalDoc.save();
    res.status(200).json({ message: 'Referee decision saved', evaluation: evalDoc });
  } catch (error) {
    console.error('Error in refereeOverride endpoint:', error);
    res.status(500).json({ message: 'Failed to save teacher decision' });
  }
};

// POST /api/ai/escalate
export const escalate = async (req: AuthRequest, res: Response) => {
  try {
    let { doubtId, doubtText, attempts, difficulty, confidenceScore } = req.body;

    let doubt = null;
    if (doubtId) {
      doubt = await Doubt.findById(doubtId);
      if (doubt) {
        if (!doubtText) {
          doubtText = `${doubt.title}\n${doubt.description}`;
        }
        if (attempts === undefined) {
          attempts = await Answer.countDocuments({ doubtId });
        }
        if (!difficulty) {
          difficulty = doubt.difficulty;
        }
      }
    }

    if (confidenceScore === undefined) {
      confidenceScore = 70;
    }

    const result = await geminiService.shouldEscalate(
      doubtText || 'Study query',
      attempts || 0,
      difficulty || 'medium',
      confidenceScore
    );

    if (result.shouldEscalate && doubt) {
      doubt.status = 'escalated';
      doubt.escalatedAt = new Date();
      await doubt.save();

      const escalation = new Escalation({
        doubtId: doubt._id,
        reason: mapEscalationReason(result.reason || 'low-confidence'),
        status: 'pending',
        priority: result.urgencyLevel || 'medium'
      });
      await escalation.save();
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in escalate endpoint:', error);
    res.status(200).json({
      shouldEscalate: false,
      reason: "Escalation check unavailable.",
      urgencyLevel: "low",
      suggestion: "Prompt student for clarification."
    });
  }
};

// GET /api/ai/test
export const testGemini = async (req: AuthRequest, res: Response) => {
  try {
    const text = await geminiService.testConnection();
    res.status(200).json({
      success: true,
      message: "Gemini API is working",
      response: text
    });
  } catch (error: any) {
    console.error("Gemini connection test failed:", error);
    res.status(250).json({
      success: false,
      message: "Gemini API connection failed",
      error: error.message || error
    });
  }
};

// POST /api/ai/chat
export const chatAssistant = async (req: AuthRequest, res: Response) => {
  try {
    const { query, topic, subject } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const reply = await geminiService.getGeneralExplanation(query, subject, topic);
    res.status(200).json({ reply });
  } catch (error: any) {
    console.error('AI assistant chat error:', error);
    res.status(200).json({
      reply: "I am having trouble connecting to my knowledge base right now. Please try asking again in a few moments, or check with your class peers!"
    });
  }
};
