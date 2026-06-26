import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as geminiService from '../services/geminiService';
import {
  Doubt,
  Answer,
  AIAnalysis,
  HintHistory,
  AnswerEvaluation,
  Escalation
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
      // Use fallback mock structure
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

    // Save to AIAnalysis collection if doubtId exists
    if (doubtId) {
      const aiAnalysis = new AIAnalysis({
        doubtId,
        topic: result.topic,
        difficulty: result.difficulty,
        isPeerAnswerable: result.confidenceScore > 50,
        explanation: result.conceptExplanation
      });
      await aiAnalysis.save();

      // Update doubt with AI analysis
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
    let { doubtId, doubtText, level, ladderIndex } = req.body;
    const userId = req.user?.userId;

    if (level === undefined && ladderIndex !== undefined) {
      level = ladderIndex + 1;
    }
    if (ladderIndex === undefined && level !== undefined) {
      ladderIndex = level - 1;
    }

    if (level === undefined) {
      level = 1;
      ladderIndex = 0;
    }

    let doubt = null;
    if (doubtId) {
      doubt = await Doubt.findById(doubtId);
      if (doubt && !doubtText) {
        doubtText = `${doubt.title}\n${doubt.description}`;
      }
    }

    const result = await geminiService.generateHints(doubtText || 'Study query', level);

    if (doubtId && userId) {
      // Save hint to HintHistory collection
      const history = new HintHistory({
        doubtId,
        userId,
        ladderIndex: ladderIndex || 0,
        hintContent: result.hint
      });
      await history.save();

      // Increment hintsUsed count on doubt
      await Doubt.findByIdAndUpdate(doubtId, { $inc: { hintsUsed: 1 } });
    }

    res.status(200).json({
      hintContent: result.hint,
      ladderIndex: ladderIndex || 0,
      totalHintsUsed: (ladderIndex || 0) + 1,
      encouragement: result.encouragement
    });
  } catch (error) {
    console.error('Error in generateHint endpoint:', error);
    res.status(200).json({
      hintContent: "AI hint generation is temporarily unavailable. Try analyzing key terms or reviewing the textbook.",
      ladderIndex: 0,
      totalHintsUsed: 1,
      encouragement: "Keep trying! Every step counts."
    });
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
      // Save to AnswerEvaluation collection
      const evalRecord = new AnswerEvaluation({
        answerId: answerId || null,
        doubtId,
        correctness: result.correctness,
        clarity: result.clarity,
        completeness: result.completeness,
        usefulness: result.score,
        score: result.score,
        feedback: result.feedback
      });
      await evalRecord.save();

      // If correct: update doubt status to peer_solved
      if (result.verdict === 'correct' && doubt) {
        doubt.status = 'peer_solved';
        doubt.resolvedAt = new Date();
        doubt.resolvedBy = 'peer';
        const createdTime = new Date(doubt.createdAt).getTime();
        doubt.timeToResolve = Math.round((Date.now() - createdTime) / (1000 * 60));
        await doubt.save();
      }

      // Award XP to student
      const solverId = req.user?.userId;
      if (solverId && doubt && result.xpAwarded > 0) {
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
      score: 50,
      correctness: 50,
      clarity: 50,
      completeness: 50,
      feedback: "Evaluation unavailable. Good effort, review key concepts.",
      missingConcepts: [],
      xpAwarded: 10
    });
  }
};

// POST /api/ai/referee
export const referee = async (req: AuthRequest, res: Response) => {
  try {
    let { doubtId, doubtText, answers } = req.body;

    if (doubtId) {
      const doubt = await Doubt.findById(doubtId);
      if (doubt) {
        if (!doubtText) {
          doubtText = `${doubt.title}\n${doubt.description}`;
        }
        if (!answers) {
          const dbAnswers = await Answer.find({ doubtId });
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
        winner: "Review complete."
      });
    }

    const result = await geminiService.refereeAnswers(doubtText || 'Study query', answers);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in referee endpoint:', error);
    res.status(200).json({
      bestAnswerIndex: 0,
      ranking: [0],
      comparison: "Referee unavailable. Showing default ordering.",
      missingInAll: [],
      winner: "Completed submission review."
    });
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
    res.status(500).json({
      success: false,
      message: "Gemini API connection failed",
      error: error.message || error
    });
  }
};
