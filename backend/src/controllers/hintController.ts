import { Response } from 'express';
import { Doubt, Hint } from '../models/Schemas';
import { AuthRequest } from '../middleware/auth';
import { AIService } from '../services/aiService';

export const requestHint = async (req: AuthRequest, res: Response) => {
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

    // Determine how many hints this user has already requested for this doubt
    const hintCount = await Hint.countDocuments({ doubtId, userId });

    if (hintCount >= 3) {
      return res.status(400).json({ message: 'Maximum of 3 hints already revealed for this doubt.' });
    }

    // Generate the progressive hint
    const hintContent = await AIService.generateHint(doubt.title, doubt.description, hintCount);

    // Save the revealed hint
    const hint = new Hint({
      doubtId,
      userId,
      hintLadderIndex: hintCount,
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

    const hints = await Hint.find({ doubtId, userId }).sort({ hintLadderIndex: 1 });
    res.status(200).json(hints);
  } catch (error) {
    console.error('Get revealed hints error:', error);
    res.status(500).json({ message: 'Failed to retrieve revealed hints' });
  }
};
