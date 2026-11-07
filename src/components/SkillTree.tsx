'use client';

import React from 'react';
import { SubjectId } from '@/types/game';
import { SUBJECTS } from '@/data/curriculum';
import { Award, BookOpen, Crown } from 'lucide-react';

interface SkillTreeProps {
  subjectMastery: Record<SubjectId, number>;
  onSelectTrack?: (sub: SubjectId) => void;
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  subjectMastery,
  onSelectTrack,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-extrabold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Academic Subject Skill Tree
        </h4>
        <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Crown className="w-3 h-3 text-amber-400" />
          Arabic-Led Mastery
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUBJECTS.map((sub) => {
          const mastery = subjectMastery[sub.id] ?? 15;
          const level = Math.max(1, Math.floor(mastery / 20));
          return (
            <div
              key={sub.id}
              onClick={() => onSelectTrack?.(sub.id)}
              className="p-3.5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-500/40 transition cursor-pointer space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl p-2 rounded-xl bg-stone-950 border border-stone-800">
                    {sub.icon}
                  </span>
                  <div>
                    <div className="font-extrabold text-sm text-stone-100">{sub.name}</div>
                    <div dir="rtl" className="text-xs font-serif text-stone-400">
                      {sub.arabicName}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-extrabold">
                  Lvl {level}
                </span>
              </div>

              {/* Progress Bar & Badges */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-400">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Mastery Level
                  </span>
                  <span className="font-mono text-emerald-400">{mastery}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-950 border border-stone-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${mastery}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

