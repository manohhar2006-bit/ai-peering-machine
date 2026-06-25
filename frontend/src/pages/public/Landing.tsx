import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Users, Trophy, ShieldAlert, ArrowRight, Star, Flame, Sparkles } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:px-12 md:py-32 lg:px-24">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 -z-10 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-accent-400/15 blur-3xl" />

        <div className="mx-auto max-w-5xl text-center space-y-8">
          <div className="inline-flex items-center space-x-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            <Sparkles className="h-4 w-4 text-accent-500 animate-pulse" />
            <span>AI-Guided Peer Doubt Resolution</span>
          </div>

          <h1 className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl md:text-7xl">
            Learn Together. <br />
            Level Up Faster.
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Shift doubts from overwhelmed teachers to excited peers. Earn points, build streaks, unlock exclusive badges, and master subjects through collaborative questing, guided by advanced AI.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/register"
              className="group inline-flex items-center space-x-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-premium hover:bg-brand-700 hover:shadow-premium-hover transition-all"
            >
              <span>Join the Quest</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-all dark:bg-[#1E293B] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Gamification Showcases */}
      <section className="px-6 py-16 md:px-12 bg-white dark:bg-[#1E293B] border-y border-slate-150 dark:border-slate-800 transition-colors duration-300">
        <div className="mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              Not a typical forum. It's a game.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto dark:text-slate-400">
              We replace static question boards with dynamic quest rooms where teaching is rewarded.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-100 p-6 hover:shadow-premium transition-all dark:border-slate-800/60 dark:bg-[#0F172A]">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-950/20">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Streaks & Level Ups</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Post or solve doubts daily to build streaks. Gain levels as your XP accumulates and display your ranks on the leaderboard.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 p-6 hover:shadow-premium transition-all dark:border-slate-800/60 dark:bg-[#0F172A]">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20">
                <Star className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Subject Reputation</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Gain reputation score in specific subjects like Physics, Math, or CS. Higher reputation marks you as a verified subject master.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 p-6 hover:shadow-premium transition-all dark:border-slate-800/60 dark:bg-[#0F172A]">
              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-teal-50 text-teal-500 dark:bg-teal-950/20">
                <Trophy className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">Collect Badges</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Collect badges for accomplishments like first-solve, streak milestones, high AI ratings, or teacher verification tags.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Orchestration Workflow */}
      <section className="px-6 py-20 md:px-12 bg-[#F8FAFC] dark:bg-[#0F172A] transition-colors duration-300">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
              How AI Orchestration Reduces Workload
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto dark:text-slate-400">
              Teachers intervene only when necessary. The system automates routine loops:
            </p>
          </div>

          <div className="space-y-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400">
                  <Brain className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">1. Instant AI Analysis & Routing</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  AI scans the doubt to classify subject, topic, and difficulty. It automatically routes the question to top-scoring peer students best equipped to respond, bypassing teachers.
                </p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-6 rounded-2xl border border-slate-150 shadow-premium dark:bg-[#1E293B] dark:border-slate-800">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-200">AI Routing Radar</span>
                  <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full dark:bg-brand-950/30 dark:text-brand-400">Match Found</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Subject:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Computer Science</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Topic:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Database Indexing</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Recommended Peer:</span>
                    <span className="font-semibold text-teal-500">Alex Johnson (Level 3)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
              <div className="w-full md:w-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-100 text-accent-600 dark:bg-accent-950/30 dark:text-accent-400">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">2. Hint Ladders & AI Evaluation</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  Askers can request progressive hint ladders so they solve problems themselves. Solvers submit answers, which the AI immediately grades for correctness and assigns points.
                </p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-6 rounded-2xl border border-slate-150 shadow-premium dark:bg-[#1E293B] dark:border-slate-800">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-200">AI Evaluation Report</span>
                  <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full dark:bg-emerald-950/30 dark:text-emerald-400">Approved</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Correctness:</span>
                    <span className="font-semibold text-emerald-500">95%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Clarity:</span>
                    <span className="font-semibold text-brand-500">90%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">XP Awarded:</span>
                    <span className="font-bold text-brand-600">+150 XP</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">3. Smart Teacher Escalation</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                  If peers cannot answer, if answers clash, or if AI confidence is low, the doubt escalates to the teacher's queue. Teachers save hours of time and address only critical roadblocks.
                </p>
              </div>
              <div className="w-full md:w-1/2 bg-white p-6 rounded-2xl border border-slate-150 shadow-premium dark:bg-[#1E293B] dark:border-slate-800">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Escalation Center</span>
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full dark:bg-red-950/30 dark:text-red-400">Escalated</span>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Reason:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Contradictory peer answers</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Priority:</span>
                    <span className="font-semibold text-amber-500">Medium</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Status:</span>
                    <span className="font-semibold text-red-500">Awaiting Teacher</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
