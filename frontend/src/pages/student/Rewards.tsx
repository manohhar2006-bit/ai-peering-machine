import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Award, ShieldAlert, Sparkles, Flame, CheckCircle, Shield, AwardIcon, Lock } from 'lucide-react';

const badgesMetadata = [
  { id: 'first_solve', name: 'First Solver', description: 'Resolved your first peer doubt!', icon: Award, criteria: 'Solve 1 peer doubt' },
  { id: 'expert_solver', name: 'Expert Solver', description: 'Resolved 5 or more peer doubts!', icon: Sparkles, criteria: 'Solve 5 peer doubts' },
  { id: 'streak_master', name: 'Streak Master', description: 'Maintained a 5-day activity streak!', icon: Flame, criteria: '5-day active streak' },
  { id: 'level_5', name: 'Level 5 Achiever', description: 'Reached level 5!', icon: AwardIcon, criteria: 'Reach level 5' },
  { id: 'teacher_verified', name: 'Teacher Verified Solver', description: 'Had an answer verified by faculty!', icon: CheckCircle, criteria: 'Answer verified by a teacher' }
];

export const Rewards: React.FC = () => {
  const { studentProfile } = useAuth();
  
  const earnedBadgeIds = studentProfile?.badges.map(b => b.badgeId) || [];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center dark:bg-brand-950/20 dark:text-brand-400">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Trophy Room & Rewards</h2>
          <p className="text-sm text-slate-400">Track your milestones, unlocked badges, and point multipliers</p>
        </div>
      </div>

      {/* Point Multiplier explanation */}
      <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6 dark:bg-[#1E293B]/50 dark:border-slate-800">
        <h3 className="font-extrabold text-brand-850 dark:text-brand-400 text-base mb-2">Rules of the Learning Game</h3>
        <div className="grid sm:grid-cols-3 gap-6 mt-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-350 block">Participation Reward</span>
            <p>Post high-quality doubts with clear descriptions to earn <span className="font-bold text-brand-655">+25 XP</span>. Peer routing ensures someone is recommended to solve it.</p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-350 block">Solver Quest Reward</span>
            <p>Solve peer doubts. AI grades your completeness. Earn <span className="font-bold text-emerald-500">+100 XP</span> base and up to <span className="font-bold text-emerald-500">+50 XP</span> bonus for high AI ratings.</p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-350 block">Verification Multiplier</span>
            <p>Get your answer officially verified by a faculty member to earn <span className="font-bold text-orange-555">+100 XP</span> bonus and the Teacher Verified badge.</p>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2">Milestone Badges</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {badgesMetadata.map((badge) => {
            const isEarned = earnedBadgeIds.includes(badge.id);
            const IconComponent = badge.icon;

            return (
              <div
                key={badge.id}
                className={`rounded-2xl p-5 border flex items-start space-x-4 transition-all duration-300 ${
                  isEarned
                    ? 'border-brand-200 bg-white shadow-premium dark:bg-[#1E293B] dark:border-slate-800'
                    : 'border-slate-200 bg-slate-50/50 opacity-60 dark:bg-[#0F172A] dark:border-slate-800'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${
                    isEarned
                      ? 'bg-gradient-to-tr from-brand-600 to-accent-400 text-white'
                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                  }`}
                >
                  {isEarned ? (
                    <IconComponent className="h-7 w-7 animate-float" />
                  ) : (
                    <Lock className="h-6 w-6" />
                  )}
                </div>

                {/* Badge details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-extrabold text-slate-800 text-base dark:text-slate-100">{badge.name}</h4>
                    {isEarned && (
                      <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-extrabold dark:bg-emerald-950/20 dark:text-emerald-400">
                        UNLOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block pt-1">
                    Requirement: {badge.criteria}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
