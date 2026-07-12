import * as geminiService from './geminiService';
import { Doubt, Answer } from '../models/Schemas';

export interface AIAnalysisResult {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPeerAnswerable: boolean;
  explanation: string;
}

export interface AIEvaluationResult {
  correctness: number;
  clarity: number;
  completeness: number;
  usefulness: number;
  score: number;
  feedback: string;
  verdict?: 'correct' | 'partially_correct' | 'incorrect';
  missingConcepts?: string[];
  xpAwarded?: number;
}

export function mapEscalationReason(reason: string): 'timeout' | 'low-confidence' | 'contradictory' {
  const r = reason.toLowerCase();
  if (r.includes('timeout') || r.includes('time') || r.includes('no answer') || r.includes('delay') || r.includes('long')) {
    return 'timeout';
  }
  if (r.includes('contradict') || r.includes('conflict') || r.includes('disagree') || r.includes('different') || r.includes('mismatch') || r.includes('referee')) {
    return 'contradictory';
  }
  return 'low-confidence';
}

export class AIService {
  static async analyzeDoubt(title: string, description: string): Promise<AIAnalysisResult> {
    try {
      const doubtText = `${title}\n${description}`;
      const result = await geminiService.analyzeDoubt(doubtText, 'General');
      return {
        subject: 'General',
        topic: result.topic || 'General',
        difficulty: result.difficulty || 'medium',
        isPeerAnswerable: result.confidenceScore > 50,
        explanation: result.conceptExplanation || ''
      };
    } catch (error) {
      console.error('AIService analyzeDoubt error:', error);
      return {
        subject: 'General',
        topic: 'General Concept',
        difficulty: 'medium',
        isPeerAnswerable: true,
        explanation: 'AI analysis temporarily unavailable. Please try again.'
      };
    }
  }

  static async generateHint(doubtTitle: string, doubtDesc: string, ladderIndex: number): Promise<string> {
    try {
      const doubtText = `${doubtTitle}\n${doubtDesc}`;
      const result = await geminiService.generateHints(doubtText, ladderIndex + 1);
      return result.hint || '';
    } catch (error) {
      console.error('AIService generateHint error:', error);
      return 'AI hint generation is temporarily unavailable. Try analyzing key terms or reviewing the textbook.';
    }
  }

  static async evaluateAnswer(doubtTitle: string, doubtDesc: string, answerContent: string): Promise<AIEvaluationResult> {
    try {
      const doubtText = `${doubtTitle}\n${doubtDesc}`;
      const result = await geminiService.evaluateAnswer(doubtText, answerContent);
      return {
        correctness: result.correctness || 50,
        clarity: result.clarity || 50,
        completeness: result.completeness || 50,
        usefulness: result.score || 50,
        score: result.score || 50,
        feedback: result.feedback || '',
        verdict: result.verdict || 'partially_correct',
        missingConcepts: result.missingConcepts || [],
        xpAwarded: result.xpAwarded || 10
      };
    } catch (error) {
      console.error('AIService evaluateAnswer error:', error);
      return {
        correctness: 50,
        clarity: 50,
        completeness: 50,
        usefulness: 50,
        score: 50,
        feedback: 'Evaluation unavailable. Good effort, review key concepts.',
        verdict: 'partially_correct',
        missingConcepts: [],
        xpAwarded: 10
      };
    }
  }

  static async suggestPeerResponders(subjectId: string, askerId: string): Promise<any[]> {
    return [];
  }

  static async decideEscalation(doubtId: string): Promise<{ escalate: boolean; reason: 'timeout' | 'low-confidence' | 'contradictory' | null }> {
    try {
      const doubt = await Doubt.findById(doubtId);
      if (!doubt) return { escalate: false, reason: null };

      const answers = await Answer.find({ doubtId });
      const attempts = answers.length;
      const doubtText = doubt.inputType === 'text' || !doubt.inputType ? `${doubt.title}\n${doubt.description}` : (doubt.extractedText || doubt.title);

      const result = await geminiService.shouldEscalate(doubtText, attempts, doubt.difficulty, 70);
      return {
        escalate: result.shouldEscalate,
        reason: mapEscalationReason(result.reason || 'low-confidence')
      };
    } catch (error) {
      console.error('AIService decideEscalation error:', error);
      return { escalate: false, reason: null };
    }
  }

  static async referee(doubtId: string): Promise<{
    bestAnswer: { solverName: string; score: number } | null;
    confidenceScore: number;
    reasoning: string;
    missingConcept: string;
  }> {
    try {
      const doubt = await Doubt.findById(doubtId);
      if (!doubt) {
        return { bestAnswer: null, confidenceScore: 0, reasoning: 'Doubt not found', missingConcept: 'N/A' };
      }

      const answers = await Answer.find({ doubtId }).populate('solverId', 'name');
      if (answers.length === 0) {
        return { bestAnswer: null, confidenceScore: 0, reasoning: 'No answers submitted yet.', missingConcept: 'None' };
      }

      const answersText = answers.map(a => a.content);
      const doubtText = doubt.inputType === 'text' || !doubt.inputType ? `${doubt.title}\n${doubt.description}` : (doubt.extractedText || doubt.title);
      const result = await geminiService.refereeAnswers(doubtText, answersText);

      const bestAns = answers[result.bestAnswerIndex] || answers[0];
      return {
        bestAnswer: bestAns ? {
          solverName: (bestAns.solverId as any)?.name || 'Anonymous',
          score: bestAns.aiEvaluation?.score || 80
        } : null,
        confidenceScore: 80,
        reasoning: result.comparison || result.winner,
        missingConcept: result.missingInAll?.join(', ') || 'None'
      };
    } catch (error) {
      console.error('AIService referee error:', error);
      return { bestAnswer: null, confidenceScore: 0, reasoning: 'Referee failed', missingConcept: 'None' };
    }
  }
}
