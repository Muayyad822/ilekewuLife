'use client';

import React from 'react';
import { Flame, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { SubjectId } from '@/types/game';
import { SUBJECTS } from '@/data/curriculum';

interface TodayCardProps {
  streakDays: number;
  completedCount: number;
  totalCount: number;
  featuredSubject: SubjectId;
  dueReviewsCount: number;
  onContinue: () => void;
  onReviewDue: () => void;
}

export const TodayCard: React.FC<TodayCardProps> = ({
  streakDays,
  completedCount,
  totalCount,
  featuredSubject,
  dueReviewsCount,
  onContinue,
  onReviewDue,
}) => {
  const featured = SUBJECTS.find((s) => s.id === featuredSubject) ?? SUBJECTS[0];
  const allDone = completedCount >= totalCount;

  return (
    <div className="rounded-3xl bg-linear-to-br from-emerald-950 via-stone-900 to-emerald-900 border border-emerald-500/30 p-5 sm:p-6 text-white shadow-xl space-y-4">
      {/* Top Banner: Goal Status & Streaks */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-amber-300" /> Today at Madrasah
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Daily Learning Goal</h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-stone-950/60 border border-amber-400/30 rounded-2xl px-3 py-1.5 text-center shadow-inner">
            <div className="flex items-center justify-center gap-1 text-amber-300 font-extrabold text-sm sm:text-base">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" /> {streakDays}d
            </div>
            <div className="text-[9px] text-amber-200/80 font-bold uppercase tracking-wider">Streak</div>
          </div>
          <div className="bg-stone-950/60 border border-emerald-400/30 rounded-2xl px-3 py-1.5 text-center shadow-inner">
            <div className="text-emerald-300 font-extrabold text-sm sm:text-base">
              {completedCount}/{totalCount}
            </div>
            <div className="text-[9px] text-emerald-200/80 font-bold uppercase tracking-wider">Completed</div>
          </div>
        </div>
      </div>

      {/* Main Focus: Featured Topic or Done Celebration */}
      <div className="bg-black/30 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
            <span>{featured.icon}</span> Today&apos;s Core Lesson: {featured.name}
          </div>
          <div className="text-xs text-stone-300 line-clamp-1">
            {featured.description}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dueReviewsCount > 0 && (
            <button
              onClick={onReviewDue}
              className="px-3.5 py-2.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 text-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
              <span>Review ({dueReviewsCount})</span>
            </button>
          )}

          <button
            onClick={onContinue}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md ${
              allDone
                ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
            }`}
          >
            {allDone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All Done (Practice More)
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Start Today&apos;s Lesson
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

