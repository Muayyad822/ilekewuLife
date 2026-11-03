'use client';

import React from 'react';
import { useGameStore, TabId } from '@/store/gameStore';
import { prayerFor, formatHour } from '@/lib/time';
import { EventCard } from '@/components/EventCard';
import { WalaahMinigame } from '@/components/WalaahMinigame';
import { QuizMinigame } from '@/components/QuizMinigame';
import { MinbarFeed } from '@/components/MinbarFeed';
import { Leaderboard } from '@/components/Leaderboard';
import {
  BookOpen, Heart, Zap, ShieldAlert, Sparkles, Volume2, VolumeX, RotateCcw,
  ScrollText, PenLine, Trophy, Radio, Medal, X, Map as MapIcon,
} from 'lucide-react';

const STAGES: Record<string, { title: string; emoji: string }> = {
  omo_kewu: { title: 'Omo Kewu', emoji: '🪵' },
  arowo_kewu: { title: 'Arowo-Kewu', emoji: '📿' },
  markaziy: { title: 'Markaziy', emoji: '📚' },
  sheikh_agba: { title: 'Sheikh Agba', emoji: '👑' },
};

const Meter: React.FC<{ icon: React.ReactNode; value: number; color: string; label: string }> = ({ icon, value, color, label }) => (
  <div className="flex flex-col items-center gap-0.5 min-w-0" title={`${label}: ${value}%`}>
    <span style={{ color }}>{icon}</span>
    <div className="kw-meter w-full">
      <span style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

export const TopLeftHud: React.FC = () => {
  const { player } = useGameStore();
  const s = player.stats;
  const stage = STAGES[player.stage] ?? STAGES.omo_kewu;
  return (
    <div className="kw-glass kw-safe-top kw-safe-left absolute px-3 py-2 flex flex-col gap-1.5 w-[min(58vw,300px)]">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-linear-to-b from-kw-gold-soft to-kw-gold flex items-center justify-center text-lg shadow-inner">
          {stage.emoji}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="kw-display text-[15px] font-extrabold truncate">{player.name}</div>
          <div className="text-[10.5px] text-kw-gold-soft font-semibold">
            {stage.title} · Age {player.age} · Juz {player.hifzJuz}/30
          </div>
        </div>
        <div className="ml-auto pl-2 text-right">
          <div className="kw-label">Naira</div>
          <div className="text-[13px] font-extrabold font-mono text-emerald-300">₦{s.naira.toLocaleString()}</div>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        <Meter icon={<BookOpen className="w-3 h-3" />} value={s.ilm} color="#60a5fa" label="Ilm" />
        <Meter icon={<Heart className="w-3 h-3" />} value={s.taqwa} color="#34d399" label="Taqwa" />
        <Meter icon={<Zap className="w-3 h-3" />} value={s.energy} color="#fbbf24" label="Energy" />
        <Meter icon={<ShieldAlert className="w-3 h-3" />} value={s.pasanResistance} color="#fb7185" label="Pasan defense" />
        <Meter icon={<Sparkles className="w-3 h-3" />} value={s.barakah} color="#a78bfa" label="Barakah" />
      </div>
    </div>
  );
};

export const TopRightHud: React.FC = () => {
  const { hour, isMuted, toggleMute, resetGame } = useGameStore();
  const prayer = prayerFor(hour);
  return (
    <div className="kw-glass kw-safe-top kw-safe-right absolute px-2.5 sm:px-3 py-2 flex items-center gap-2 sm:gap-3">
      <div className="text-right leading-tight">
        <div className="kw-display text-[15px] font-extrabold flex items-center justify-end gap-1.5">
          <span>{prayer.icon}</span>
          {prayer.name}
          <span dir="rtl" className="font-serif text-kw-gold-soft text-sm hidden sm:inline">{prayer.arabic}</span>
        </div>
        <div className="text-[10.5px] text-kw-cream-dim font-mono">{formatHour(hour)}</div>
      </div>
      <div className="flex items-center gap-1 border-l border-white/10 pl-2">
        <button
          onClick={toggleMute}
          className="p-2 sm:p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={() => {
            if (confirm('Start a new life journey in Ile-Kewu? Your stats will reset.')) resetGame();
          }}
          className="hidden sm:block p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
          title="Restart life"
          aria-label="Restart life"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const DOCK: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'compound', label: 'World', icon: MapIcon },
  { id: 'life', label: 'Life', icon: ScrollText },
  { id: 'walaah', label: 'Walaah', icon: PenLine },
  { id: 'quiz', label: 'Quiz', icon: Trophy },
  { id: 'minbar', label: 'Minbar', icon: Radio },
  { id: 'rankings', label: 'Ranks', icon: Medal },
];

export const Dock: React.FC = () => {
  const { activeTab, setActiveTab } = useGameStore();
  return (
    <nav className="kw-glass-strong kw-safe-bottom absolute left-1/2 -translate-x-1/2 px-1 sm:px-1.5 py-1 flex items-center gap-0 sm:gap-0.5 max-w-[98vw]">
      {DOCK.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className="kw-dock-btn"
          data-active={activeTab === id}
          onClick={() => setActiveTab(id)}
          aria-label={label}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </nav>
  );
};

const PANEL_TITLES: Record<Exclude<TabId, 'compound'>, string> = {
  life: 'Life Chronicle',
  walaah: 'Walaah Board',
  quiz: 'Musabaqah Quiz',
  minbar: 'Minbar Radio',
  rankings: 'Rankings',
};

export const PanelDrawer: React.FC = () => {
  const { activeTab, setActiveTab, resetGame } = useGameStore();
  if (activeTab === 'compound') return null;
  return (
    <div
      className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-2 sm:p-3 bg-black/50 backdrop-blur-[2px]"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setActiveTab('compound');
      }}
    >
      <div className="kw-glass-strong kw-pop w-full max-w-3xl max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
          <h2 className="kw-display text-lg font-extrabold text-kw-gold-soft">{PANEL_TITLES[activeTab]}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (confirm('Start a new life journey in Ile-Kewu? Your stats will reset.')) {
                  resetGame();
                }
              }}
              className="sm:hidden p-2 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Restart life"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTab('compound')}
              className="p-2 sm:p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        <div className="kw-scroll overflow-y-auto flex-1 bg-kw-cream text-stone-900 pb-6">
          {activeTab === 'life' && <EventCard />}
          {activeTab === 'walaah' && <WalaahMinigame />}
          {activeTab === 'quiz' && <QuizMinigame />}
          {activeTab === 'minbar' && <MinbarFeed />}
          {activeTab === 'rankings' && <Leaderboard />}
        </div>
      </div>
    </div>
  );
};

