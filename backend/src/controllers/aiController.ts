import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';
import {
  Doubt,
  Answer,
  AIAnalysis,
  HintHistory,
  AnswerEvaluation,
  Escalation
} from '../models/Schemas';

// POST /api/ai/analyze-doubt
export const analyzeDoubt = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description = '' } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const result = await AIService.analyzeDoubt(title, description);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in analyzeDoubt endpoint:', error);
    res.status(500).json({ message: 'AI doubt analysis failed' });
  }
};

// POST /api/ai/generate-hint
export const generateHint = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId, ladderIndex } = req.body;
    const userId = req.user?.userId;

    if (!doubtId || ladderIndex === undefined) {
      return res.status(400).json({ message: 'Doubt ID and ladderIndex are required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const hintContent = await AIService.generateHint(doubt.title, doubt.description, ladderIndex);

    // Save to HintHistory collection
    const history = new HintHistory({
      doubtId,
      userId,
      ladderIndex,
      hintContent
    });
    await history.save();

    res.status(200).json({
      hintContent,
      ladderIndex,
      totalHintsUsed: ladderIndex + 1
    });
  } catch (error) {
    console.error('Error in generateHint endpoint:', error);
    res.status(500).json({ message: 'Hint generation failed' });
  }
};

// POST /api/ai/evaluate-answer
export const evaluateAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId, answerContent, answerId } = req.body;
    if (!doubtId || !answerContent) {
      return res.status(400).json({ message: 'Doubt ID and answer content are required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const evaluation = await AIService.evaluateAnswer(doubt.title, doubt.description, answerContent);

    // Save to AnswerEvaluation collection
    const evalRecord = new AnswerEvaluation({
      answerId: answerId || null,
      doubtId,
      correctness: evaluation.correctness,
      clarity: evaluation.clarity,
      completeness: evaluation.completeness,
      usefulness: evaluation.usefulness,
      score: evaluation.score,
      feedback: evaluation.feedback
    });
    await evalRecord.save();

    res.status(200).json(evaluation);
  } catch (error) {
    console.error('Error in evaluateAnswer endpoint:', error);
    res.status(500).json({ message: 'Answer evaluation failed' });
  }
};

// POST /api/ai/referee
export const referee = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId } = req.body;
    if (!doubtId) {
      return res.status(400).json({ message: 'Doubt ID is required' });
    }

    const result = await AIService.referee(doubtId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in referee endpoint:', error);
    res.status(500).json({ message: 'AI referee evaluation failed' });
  }
};

// POST /api/ai/escalate
export const escalate = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId, reason } = req.body;
    if (!doubtId) {
      return res.status(400).json({ message: 'Doubt ID is required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    // Determine priority
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (doubt.difficulty === 'hard') {
      priority = 'high';
    } else if (doubt.difficulty === 'easy') {
      priority = 'low';
    }

    doubt.status = 'escalated';
    await doubt.save();

    // Save to Escalation collection
    const escalation = new Escalation({
      doubtId,
      reason: reason || 'low-confidence',
      status: 'pending',
      priority
    });
    await escalation.save();

    res.status(200).json({
      escalated: true,
      reason: reason || 'low-confidence',
      priority
    });
  } catch (error) {
    console.error('Error in escalate endpoint:', error);
    res.status(500).json({ message: 'Doubt escalation failed' });
  }
};
