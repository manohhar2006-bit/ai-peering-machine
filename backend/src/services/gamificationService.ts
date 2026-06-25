import mongoose from 'mongoose';
import { StudentProfile, PointTransaction, Badge, User } from '../models/Schemas';

export class GamificationService {
  /**
   * Awards points to a student, updates their XP, level, and logs the transaction.
   */
  static async awardPoints(
    userId: string | mongoose.Types.ObjectId,
    points: number,
    type: 'ask' | 'solve' | 'bonus_accepted' | 'bonus_first_correct' | 'streak',
    reason: string,
    subjectId?: string
  ): Promise<{ xpGained: number; levelUp: boolean; newLevel: number }> {
    try {
      // Create the transaction
      const transaction = new PointTransaction({
        userId,
        points,
        type,
        reason
      });
      await transaction.save();

      // Find or create Student Profile
      let profile = await StudentProfile.findOne({ userId });
      if (!profile) {
        profile = new StudentProfile({ userId });
      }

      const oldLevel = profile.level;
      profile.xp += points;
      
      // Calculate new level: level = floor(xp / 500) + 1
      const newLevel = Math.floor(profile.xp / 500) + 1;
      let levelUp = false;
      if (newLevel > oldLevel) {
        profile.level = newLevel;
        levelUp = true;
      }

      // If subjectId is provided, award subject-specific reputation
      if (subjectId) {
        const subIdStr = subjectId.toString();
        const currentRep = profile.subjectReputation.get(subIdStr) || 0;
        profile.subjectReputation.set(subIdStr, currentRep + points);
      }

      if (type === 'ask') {
        profile.participationCount += 1;
      } else if (type === 'solve' || type === 'bonus_accepted') {
        profile.resolvedDoubtsCount += 1;
      }

      await profile.save();

      // Check badges trigger async
      await this.checkAndAwardBadges(userId.toString(), profile);

      return {
        xpGained: points,
        levelUp,
        newLevel
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { xpGained: 0, levelUp: false, newLevel: 1 };
    }
  }

  /**
   * Updates student's streak based on active dates.
   */
  static async updateStreak(userId: string): Promise<number> {
    try {
      let profile = await StudentProfile.findOne({ userId });
      if (!profile) {
        profile = new StudentProfile({ userId });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActive = new Date(profile.lastActive);
      lastActive.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(today.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Active yesterday, increment streak
        profile.streak += 1;
        
        // Award streak points
        if (profile.streak % 3 === 0) {
          await this.awardPoints(userId, 50, 'streak', `${profile.streak}-day login streak bonus!`);
        }
      } else if (diffDays > 1) {
        // Missed days, reset streak to 1
        profile.streak = 1;
      } else {
        // Same day, keep streak as is
      }

      profile.lastActive = new Date();
      await profile.save();

      return profile.streak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return 0;
    }
  }

  /**
   * Checks conditions and awards badges to a student.
   */
  static async checkAndAwardBadges(userId: string, profileInput?: any): Promise<string[]> {
    try {
      const profile = profileInput || await StudentProfile.findOne({ userId });
      if (!profile) return [];

      const newlyAwardedBadges: string[] = [];
      const currentBadgeIds = profile.badges.map((b: any) => b.badgeId);

      // Rule 1: First Solver Badge
      if (!currentBadgeIds.includes('first_solve') && profile.resolvedDoubtsCount >= 1) {
        profile.badges.push({ badgeId: 'first_solve', earnedAt: new Date() });
        newlyAwardedBadges.push('first_solve');
      }

      // Rule 2: Expert Solver Badge
      if (!currentBadgeIds.includes('expert_solver') && profile.resolvedDoubtsCount >= 5) {
        profile.badges.push({ badgeId: 'expert_solver', earnedAt: new Date() });
        newlyAwardedBadges.push('expert_solver');
      }

      // Rule 3: Streak Master Badge
      if (!currentBadgeIds.includes('streak_master') && profile.streak >= 5) {
        profile.badges.push({ badgeId: 'streak_master', earnedAt: new Date() });
        newlyAwardedBadges.push('streak_master');
      }

      // Rule 4: Level 5 Achiever
      if (!currentBadgeIds.includes('level_5') && profile.level >= 5) {
        profile.badges.push({ badgeId: 'level_5', earnedAt: new Date() });
        newlyAwardedBadges.push('level_5');
      }

      if (newlyAwardedBadges.length > 0) {
        await profile.save();
      }

      return newlyAwardedBadges;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  /**
   * Retrieves the ranking leaderboard.
   */
  static async getLeaderboard(): Promise<any[]> {
    try {
      const profiles = await StudentProfile.find()
        .sort({ xp: -1 })
        .limit(10)
        .populate({ path: 'userId', select: 'name email' });

      return profiles.map((p, idx) => ({
        rank: idx + 1,
        name: (p.userId as any)?.name || 'Anonymous Student',
        email: (p.userId as any)?.email || '',
        xp: p.xp,
        level: p.level,
        streak: p.streak,
        solved: p.resolvedDoubtsCount
      }));
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      return [];
    }
  }
}
