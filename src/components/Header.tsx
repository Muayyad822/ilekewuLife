'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Volume2, VolumeX, RotateCcw, Sparkles } from 'lucide-react';

const STAGE_LABELS: Record<string, { title: string; badgeColor: string; role: string }> = {
  omo_kewu: {
    title: 'Omo Kewu (Slate Novice)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200',
    role: 'Writing on Wooden Slate with Pot Ink',
  },
  arowo_kewu: {
    title: 'Arowo-Kewu (Class Monitor)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
    role: 'Leading Recitation & Helping Alfa',
  },
  markaziy: {
    title: 'Markaziy (Institute Scholar)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200',
    role: 'Studying Grammar, Fiqh & Preparing Walimah',
  },
  sheikh_agba: {
    title: 'Sheikh Agba (Revered Preacher)',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200',
    role: 'Delivering Sermons, Aqiqah & Tafseer',
  },
};

export const Header: React.FC = () => {
  const { player, isMuted, toggleMute, resetGame } = useGameStore();
  const stageInfo = STAGE_LABELS[player.stage] || STAGE_LABELS.omo_kewu;

  return (
    <header className="w-full bg-emerald-900 text-white shadow-lg border-b-4 border-amber-500">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner font-bold border-2 border-amber-300">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-amber-300">
                ILE-KEWU LIFE
              </h1>
              <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700">
                إيلى كيو لايف
              </span>
            </div>
            <p className="text-xs text-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {player.madrasahName} • Year {player.yearInMadrasah}
            </p>
          </div>
        </div>

        {/* Player Status Badge & Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-bold text-amber-200">{player.name}</span>
              <span className="text-xs bg-emerald-800 px-2 py-0.5 rounded text-emerald-100 font-mono">
                Age {player.age}
              </span>
            </div>
            <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 mt-0.5 rounded-md border ${stageInfo.badgeColor}`}>
              {stageInfo.title}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-emerald-950/60 p-1.5 rounded-xl border border-emerald-800">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            </button>
            <button
              onClick={() => {
                if (confirm('Start a new life journey in Ile-Kewu? Your stats will reset.')) {
                  resetGame();
                }
              }}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800/80 transition"
              title="Restart Life"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
