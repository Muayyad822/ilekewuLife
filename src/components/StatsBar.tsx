'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { BookOpen, Heart, Zap, ShieldAlert, Banknote, Sparkles } from 'lucide-react';

interface StatItemProps {
  label: string;
  value: number;
  max?: number;
  icon: React.ReactNode;
  colorClass: string;
  isCurrency?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, max = 100, icon, colorClass, isCurrency = false }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-xs">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
          <span className="p-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200">
            {icon}
          </span>
          {label}
        </div>
        <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100">
          {isCurrency ? `₦${value.toLocaleString()}` : `${value}%`}
        </span>
      </div>

      {!isCurrency ? (
        <div className="w-full h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : (
        <div className="text-[10px] text-stone-500 font-medium">Virtual Naira (Sadaka & Gifts)</div>
      )}
    </div>
  );
};

export const StatsBar: React.FC = () => {
  const { player } = useGameStore();
  const { ilm, taqwa, energy, pasanResistance, naira, barakah } = player.stats;

  return (
    <section className="w-full max-w-4xl mx-auto px-4 mt-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatItem
          label="Ilm (Knowledge)"
          value={ilm}
          icon={<BookOpen className="w-3.5 h-3.5 text-blue-600" />}
          colorClass="bg-blue-500"
        />
        <StatItem
          label="Taqwa (Piety)"
          value={taqwa}
          icon={<Heart className="w-3.5 h-3.5 text-emerald-600" />}
          colorClass="bg-emerald-500"
        />
        <StatItem
          label="Energy"
          value={energy}
          icon={<Zap className="w-3.5 h-3.5 text-amber-500" />}
          colorClass="bg-amber-400"
        />
        <StatItem
          label="Pasan Defense"
          value={pasanResistance}
          icon={<ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
          colorClass="bg-red-500"
        />
        <StatItem
          label="Sadaka (Funds)"
          value={naira}
          icon={<Banknote className="w-3.5 h-3.5 text-green-600" />}
          colorClass="bg-green-500"
          isCurrency
        />
        <StatItem
          label="Barakah (Fame)"
          value={barakah}
          icon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
          colorClass="bg-purple-500"
        />
      </div>
    </section>
  );
};
