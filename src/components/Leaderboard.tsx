'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Trophy, Medal, Crown } from 'lucide-react';

interface ScholarRanking {
  rank: number;
  name: string;
  stage: string;
  madrasah: string;
  score: string;
  badge: string;
}

const TOP_SCHOLARS: ScholarRanking[] = [
  {
    rank: 1,
    name: 'Sheikh Ridwanullahi (Agege)',
    stage: 'Grand Mufti',
    madrasah: 'Markaz Ta\'leem, Agege',
    score: '30 Juz Complete • 99% Ilm',
    badge: '👑',
  },
  {
    rank: 2,
    name: 'Ustadhah Khadijah (Ilorin)',
    stage: 'Senior Mufassirah',
    madrasah: 'Adabiyyah Arabic College',
    score: '30 Juz Complete • 97% Ilm',
    badge: '🥈',
  },
  {
    rank: 3,
    name: 'Alfa Qasim Al-Bukhari (Ibadan)',
    stage: 'Hadith Master',
    madrasah: 'Darul Uloom, Ibadan',
    score: '28 Juz Complete • 94% Ilm',
    badge: '🥉',
  },
  {
    rank: 4,
    name: 'Brother Abdul-Basit (Oshodi)',
    stage: 'Markaziy',
    madrasah: 'Mahad Arabic Academy',
    score: '18 Juz Complete • 82% Ilm',
    badge: '🎖️',
  },
];

export const Leaderboard: React.FC = () => {
  const { player } = useGameStore();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                National Ile-Kewu Roll of Honour
              </h3>
              <p className="text-xs text-stone-500">
                Recognizing the highest achieving Huffaz and Islamic scholars across Nigeria.
              </p>
            </div>
          </div>
          <span className="text-xs bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold px-3 py-1 rounded-full border border-amber-300">
            Season 1
          </span>
        </div>

        {/* Player's Current Standings Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              #{player.stage === 'sheikh_agba' ? '5' : '42'}
            </div>
            <div>
              <div className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                {player.name} <span className="text-xs text-emerald-600">(You)</span>
              </div>
              <div className="text-xs text-stone-500">
                {player.madrasahName} • {player.stats.ilm}% Ilm • ₦{player.stats.naira.toLocaleString()}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-md">
            Active Scholar
          </span>
        </div>

        {/* Top Rankings Table */}
        <div className="space-y-3">
          {TOP_SCHOLARS.map((scholar) => (
            <div
              key={scholar.rank}
              className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{scholar.badge}</span>
                <div>
                  <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {scholar.name}
                  </div>
                  <div className="text-xs text-stone-500">
                    {scholar.madrasah} • <span className="text-emerald-600 font-medium">{scholar.stage}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                  {scholar.score}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
