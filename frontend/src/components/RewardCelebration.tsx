import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Trophy } from 'lucide-react';

interface Reward {
  xpGained: number;
  coinsGained: number;
  levelUp: boolean;
  newLevel: number;
  streakCount: number;
  streakMessage?: string;
  streakBonusXP?: number;
}

export const RewardCelebration: React.FC = () => {
  const [queue, setQueue] = useState<Reward[]>([]);
  const [current, setCurrent] = useState<Reward | null>(null);
  const [showCoin, setShowCoin] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Listen for the custom trigger-reward event
  useEffect(() => {
    const handleTriggerReward = (e: Event) => {
      const customEvent = e as CustomEvent<Reward>;
      if (customEvent.detail) {
        setQueue((prev) => [...prev, customEvent.detail]);
      }
    };
    window.addEventListener('trigger-reward', handleTriggerReward);
    return () => {
      window.removeEventListener('trigger-reward', handleTriggerReward);
    };
  }, []);

  // Process the queue sequentially
  useEffect(() => {
    if (current || queue.length === 0) return;

    // Pop the next reward
    const nextReward = queue[0];
    setQueue((prev) => prev.slice(1));
    setCurrent(nextReward);

    // Sequence of animations:
    // 1. Play coin animation and play sound
    setShowCoin(true);
    playRewardSound();

    // 2. Play streak animation (if any) after 0.5s
    let streakTimeout: any;
    if (nextReward.streakCount >= 3 || nextReward.streakMessage) {
      streakTimeout = setTimeout(() => {
        setShowStreak(true);
      }, 400);
    }

    // 3. Play level up celebration (if levelUp is true) after 1.5s
    let levelUpTimeout: any;
    if (nextReward.levelUp) {
      levelUpTimeout = setTimeout(() => {
        setShowCoin(false);
        setShowStreak(false);
        setShowLevelUp(true);
        playLevelUpSound();
      }, 1500);
    }

    // 4. End the current reward cycle after appropriate time
    const duration = nextReward.levelUp ? 5500 : 2500;
    const endTimeout = setTimeout(() => {
      setShowCoin(false);
      setShowStreak(false);
      setShowLevelUp(false);
      setCurrent(null);
    }, duration);

    return () => {
      clearTimeout(streakTimeout);
      clearTimeout(levelUpTimeout);
      clearTimeout(endTimeout);
    };
  }, [current, queue]);

  // Audio synthesis using Web Audio API
  const playRewardSound = () => {
    if (localStorage.getItem('gamification_sound_muted') === 'true') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(0.12, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.15); // C5
      playTone(659.25, now + 0.08, 0.20); // E5
      playTone(783.99, now + 0.16, 0.30); // G5
    } catch (err) {
      console.error('Failed to play synthesized reward sound:', err);
    }
  };

  const playLevelUpSound = () => {
    if (localStorage.getItem('gamification_sound_muted') === 'true') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number, vol = 0.08) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gainNode.gain.setValueAtTime(vol, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.2); // C5
      playTone(659.25, now + 0.1, 0.2); // E5
      playTone(783.99, now + 0.2, 0.2); // G5
      playTone(1046.50, now + 0.3, 0.6, 0.12); // C6
    } catch (err) {
      console.error('Failed to play synthesized level up sound:', err);
    }
  };

  // Canvas Confetti Loop for Level-Up Celebration
  useEffect(() => {
    if (!showLevelUp || !canvasRef.current) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height - 20,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let active = false;
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        if (p.y < canvas.height) {
          active = true;
        } else {
          // Recycle
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      });

      if (active) {
        animationFrameId.current = requestAnimationFrame(draw);
      }
    };

    draw();

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [showLevelUp]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* 1. COIN POPUP ANIMATION */}
      {showCoin && (
        <div className="relative flex flex-col items-center animate-coin-pop-float">
          {/* Sparkles */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const delay = i * 50;
              return (
                <div
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-yellow-400 animate-sparkle-burst"
                  style={{
                    ['--angle' as any]: `${angle}deg`,
                    ['--delay' as any]: `${delay}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* Golden Coin */}
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 border-2 border-yellow-250 shadow-lg flex items-center justify-center animate-coin-spin transform-style-3d">
            <div className="flex flex-col items-center text-center">
              <span className="text-[14px] font-black text-amber-955 uppercase tracking-tight leading-none">+{current.coinsGained}</span>
              <span className="text-[8px] font-black text-amber-900 uppercase tracking-wide leading-none mt-0.5">Coins</span>
            </div>
          </div>

          {/* XP Nudge */}
          <div className="mt-2 px-3 py-1 bg-emerald-500/90 border border-emerald-400 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-md animate-bounce">
            +{current.xpGained} XP
          </div>
        </div>
      )}

      {/* 2. STREAK / COMBO BANNER */}
      {showStreak && (current.streakCount >= 3 || current.streakMessage) && (
        <div className="absolute top-[25%] flex flex-col items-center animate-streak-popup">
          <div className="px-6 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-700/50 shadow-premium flex items-center space-x-2 text-white">
            <span className="text-lg animate-bounce">
              {current.streakCount === 3 ? '🔥' : current.streakCount === 5 ? '⚡' : '🌟'}
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest leading-none">STREAK BONUS</p>
              <p className="text-xs font-black uppercase tracking-wide mt-1 animate-pulse">
                {current.streakMessage || `${current.streakCount} Solving Streak!`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. LEVEL-UP CELEBRATION */}
      {showLevelUp && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-50">
          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

          <div className="relative max-w-sm w-full mx-6 p-8 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-slate-800 shadow-premium text-center space-y-6 animate-level-up-modal">
            {/* Triumphant Icon */}
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-brand-600 to-accent-400 flex items-center justify-center text-white shadow-lg animate-float">
              <Trophy className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent dark:from-brand-400 dark:to-accent-400">
                LEVEL UP ACHIEVED!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Your dedication to solving doubts is paying off!
              </p>
            </div>

            {/* Level Badge Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-brand-50/50 to-brand-100/30 dark:from-slate-800/40 dark:to-slate-800/20 border border-brand-200/30 flex flex-col items-center space-y-2">
              <span className="text-[10px] text-brand-600 dark:text-brand-400 uppercase tracking-widest font-black">NEW RANK REACHED</span>
              <span className="text-3xl font-black text-slate-800 dark:text-white">Level {current.newLevel}</span>
              <div className="flex items-center space-x-1 py-1 px-3 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/50 rounded-full text-[10px] font-bold text-amber-600">
                <span>🌟 Explorer Badge Unlocked</span>
              </div>
            </div>

            <button
              onClick={() => setShowLevelUp(false)}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-sm shadow-md transition-all"
            >
              Awesomeness!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
