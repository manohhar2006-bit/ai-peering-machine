import { Response } from 'express';
import { Doubt, HintHistory } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';

export const requestHint = async (req: AuthRequest, res: Response) => {
  // Legacy handler: can redirect or keep backward compatibility
  try {
    const { doubtId } = req.body;
    const userId = req.user?.userId;

    if (!doubtId) {
      return res.status(400).json({ message: 'Doubt ID is required' });
    }

    const doubt = await Doubt.findById(doubtId);
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }

    const hintCount = await HintHistory.countDocuments({ doubtId, userId, ladderIndex: { $gte: 0 } });

    if (hintCount >= 6) {
      return res.status(400).json({ message: 'Maximum of 6 hints already revealed for this doubt.' });
    }

    const queryDescription = doubt.inputType === 'text' || !doubt.inputType ? doubt.description : (doubt.extractedText || doubt.description);
    const hintContent = await AIService.generateHint(doubt.title, queryDescription, hintCount);

    const hint = new HintHistory({
      doubtId,
      userId,
      ladderIndex: hintCount,
      queryText: '',
      hintContent
    });
    await hint.save();

    res.status(200).json({
      hintContent,
      ladderIndex: hintCount,
      totalHintsUsed: hintCount + 1
    });
  } catch (error) {
    console.error('Request hint error:', error);
    res.status(500).json({ message: 'Failed to retrieve hint' });
  }
};

export const getRevealedHints = async (req: AuthRequest, res: Response) => {
  try {
    const { doubtId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    let targetUserId = userId;
    if (role === 'teacher') {
      const doubt = await Doubt.findById(doubtId);
      if (doubt) {
        targetUserId = doubt.askerId as any;
      }
    }

    const history = await HintHistory.find({ doubtId, userId: targetUserId }).sort({ revealedAt: 1 });
    
    const mapped = history.map(h => ({
      _id: h._id,
      doubtId: h.doubtId,
      userId: h.userId,
      hintLadderIndex: h.ladderIndex,
      ladderIndex: h.ladderIndex,
      queryText: h.queryText || '',
      hintContent: h.hintContent,
      revealedAt: h.revealedAt
    }));

    res.status(200).json(mapped);
  } catch (error) {
    console.error('Get revealed hints error:', error);
    res.status(500).json({ message: 'Failed to retrieve revealed hints' });
  }
};
