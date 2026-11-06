'use client';

import React, { useEffect, useState } from 'react';
import { useGameStore, TabId } from '@/store/gameStore';
import { prayerFor, formatHour, realHourNow } from '@/lib/time';
import { ClassroomView } from '@/components/ClassroomView';
import { HomeView } from '@/components/HomeView';
import { ProfileView } from '@/components/ProfileView';
import { MinbarFeed } from '@/components/MinbarFeed';
import { HOUSING_TIERS } from '@/data/shop';
import { SUBJECTS, getTodayDateKey } from '@/data/curriculum';
import {
  subscribeToAuth,
  loadCloudState,
  subscribeOnlinePeers,
  subscribeChallenges,
  subscribeMinbarPosts,
} from '@/lib/firebase';
import {
  BookOpen,
  Heart,
  Zap,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Radio,
  X,
  Landmark,
  GraduationCap,
  Home as HomeIcon,
  User,
} from 'lucide-react';

const STAGES: Record<string, { title: string; emoji: string }> = {
  omo_kewu: { title: 'Omo Kewu', emoji: '📘' },
  arowo_kewu: { title: 'Arowo-Kewu', emoji: '📿' },
  markaziy: { title: 'Markaziy', emoji: '📚' },
  sheikh_agba: { title: 'Sheikh Agba', emoji: '👑' },
};

const HOUSING_SHORT: Record<string, string> = {
  ruwaq: 'Ruwaq',
  shared_room: 'Room',
  mini_flat: 'Flat',
  personal_villa: 'Villa',
};

const Meter: React.FC<{ icon: React.ReactNode; value: number; color: string; label: string }> = ({
  icon,
  value,
  color,
  label,
}) => (
  <div className="flex flex-col items-center gap-0.5 min-w-0" title={`${label}: ${value}%`}>
    <span style={{ color }}>{icon}</span>
    <div className="kw-meter w-full">
      <span style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

export const TopLeftHud: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const housing = useGameStore((s) => s.housing);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const s = player.stats;
  const stage = STAGES[player.stage] ?? STAGES.omo_kewu;

  // Connect Firebase Auth, Online Presence, Challenges & Minbar Feed once on mount
  useEffect(() => {
    const unsubAuth = subscribeToAuth(async (user) => {
      const store = useGameStore.getState();
      if (user) {
        store.setAuthUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        const cloudData = await loadCloudState(user.uid);
        if (cloudData) {
          store.hydrateFromCloud(cloudData);
        } else {
          await store.syncToCloud();
        }
      } else {
        store.setAuthUser(null);
      }
    });

    const unsubPeers = subscribeOnlinePeers((peers) => {
      useGameStore.getState().setOnlinePeers(peers);
    });

    const unsubChallenges = subscribeChallenges((challenges) => {
      useGameStore.getState().setChallenges(challenges);
    });

    const unsubMinbar = subscribeMinbarPosts((posts) => {
      useGameStore.getState().setMinbarPosts(posts);
    });

    return () => {
      unsubAuth();
      unsubPeers();
      unsubChallenges();
      unsubMinbar();
    };
  }, []);

  return (
    <div
      onClick={() => setActiveTab('profile')}
      title="Open Scholar Profile & Real Estate"
      className="kw-glass kw-safe-top kw-safe-left absolute px-3 py-2 flex flex-col gap-1.5 w-[min(60vw,310px)] cursor-pointer hover:border-amber-400/40 transition"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-linear-to-b from-kw-gold-soft to-kw-gold flex items-center justify-center text-lg shadow-inner overflow-hidden shrink-0">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            stage.emoji
          )}
        </div>
        <div className="min-w-0 leading-tight">
          <div className="kw-display text-[15px] font-extrabold truncate">{player.name}</div>
          <div className="text-[10.5px] text-kw-gold-soft font-semibold truncate">
            {stage.title} · {HOUSING_SHORT[housing.tier] ?? 'Ruwaq'} · Juz {player.hifzJuz}/30
          </div>
        </div>
        <div className="ml-auto pl-2 text-right">
          <div className="kw-label">Naira</div>
          <div className="text-[13px] font-extrabold font-mono text-emerald-300">
            ₦{s.naira.toLocaleString()}
          </div>
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
  const hour = useGameStore((s) => s.hour);
  const setHour = useGameStore((s) => s.setHour);
  const weather = useGameStore((s) => s.weather);
  const solatTimings = useGameStore((s) => s.solatTimings);
  const isMuted = useGameStore((s) => s.isMuted);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const resetGame = useGameStore((s) => s.resetGame);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => {
      setMounted(true);
      setHour(realHourNow());
    }, 0);
    const id = setInterval(() => {
      setHour(realHourNow());
    }, 10000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [setHour]);

  const displayHour = mounted ? hour : 7;
  const prayer = prayerFor(displayHour, solatTimings);
  return (
    <div className="kw-glass kw-safe-top kw-safe-right absolute px-2.5 sm:px-3 py-2 flex items-center gap-2 sm:gap-3">
      <div className="text-right leading-tight">
        <div className="kw-display text-[14px] sm:text-[15px] font-extrabold flex items-center justify-end gap-1.5">
          <span>{prayer.icon}</span>
          <span>{prayer.name}</span>
          <span dir="rtl" className="font-serif text-kw-gold-soft text-sm hidden sm:inline">
            {prayer.arabic}
          </span>
        </div>
        <div className="text-[10.5px] text-kw-cream-dim font-mono flex items-center justify-end gap-1.5">
          <span className="text-white font-bold">{mounted ? formatHour(displayHour) : '--:--'}</span>
          <span className="hidden md:inline text-kw-gold-soft">
            · Next {prayer.nextName} {prayer.nextTimeStr}
          </span>
        </div>
        <div className="text-[10px] text-sky-300 font-semibold flex items-center justify-end gap-1 mt-0.5">
          <span>{weather.icon}</span>
          <span className="font-mono font-bold">{weather.tempC}°C</span>
          <span className="hidden sm:inline">· {weather.label}</span>
        </div>
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
            if (confirm('Start a new life journey in Ile-Kewu? Your local stats will reset.')) resetGame();
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
  { id: 'compound', label: 'School', icon: Landmark },
  { id: 'classroom', label: 'Classroom', icon: GraduationCap },
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'minbar', label: 'Minbar', icon: Radio },
];

export const Dock: React.FC = () => {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  return (
    <nav className="kw-glass-strong kw-safe-bottom absolute left-1/2 -translate-x-1/2 px-1.5 sm:px-2 py-1 flex items-center gap-0.5 sm:gap-1 max-w-[98vw]">
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
  classroom: 'Classroom',
  home: 'Home & Real Estate',
  profile: 'Profile',
  minbar: 'Minbar & Online Scholars',
};

export const PanelDrawer: React.FC = () => {
  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const roomOverlay = useGameStore((s) => s.roomOverlay);
  const setRoomOverlay = useGameStore((s) => s.setRoomOverlay);
  const openClassroomSubject = useGameStore((s) => s.openClassroomSubject);
  const housing = useGameStore((s) => s.housing);
  const education = useGameStore((s) => s.education);
  const currentEvent = useGameStore((s) => s.currentEvent);
  const restAtHome = useGameStore((s) => s.restAtHome);
  const prayInRoom = useGameStore((s) => s.prayInRoom);
  const studyAtDesk = useGameStore((s) => s.studyAtDesk);
  const setActivity = useGameStore((s) => s.setActivity);
  const resetGame = useGameStore((s) => s.resetGame);

  const [quickMsg, setQuickMsg] = useState<string | null>(null);
  const showQuick = (m: string) => {
    setQuickMsg(m);
    setTimeout(() => setQuickMsg(null), 3500);
  };

  if ((activeTab === 'compound' || activeTab === 'home') && roomOverlay === 'none') return null;

  // Compact 3D Classroom Bar
  if (activeTab === 'classroom' && roomOverlay === 'none') {
    const todayKey = getTodayDateKey();
    return (
      <div
        className="kw-glass-strong kw-pop absolute left-1/2 -translate-x-1/2 z-10 px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 w-[min(95vw,600px)]"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 82px)' }}
      >
        {SUBJECTS.map((sub) => {
          const done = education.completedDailyKeys.includes(`${todayKey}:${sub.id}`);
          return (
            <button
              key={sub.id}
              onClick={() => openClassroomSubject(sub.id)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                done
                  ? 'bg-emerald-700/70 text-emerald-100 border border-emerald-400/40'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
              }`}
            >
              <span>{sub.icon}</span>
              <span>{sub.name.split(' ')[0]}</span>
              {done && <span className="text-emerald-300">✓</span>}
            </button>
          );
        })}
      </div>
    );
  }

  const effectiveTab: Exclude<TabId, 'compound'> =
    roomOverlay === 'home_dashboard'
      ? 'home'
      : roomOverlay === 'classroom_lesson'
      ? 'classroom'
      : activeTab === 'compound'
      ? 'profile'
      : activeTab;

  const closeDrawer = () => {
    if (roomOverlay !== 'none') {
      setRoomOverlay('none');
    } else {
      setActiveTab('compound');
    }
  };

  return (
    <div
      className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-2 sm:p-3 bg-black/50 backdrop-blur-[2px]"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeDrawer();
      }}
    >
      <div className="kw-glass-strong kw-pop w-full max-w-3xl max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
          <h2 className="kw-display text-base sm:text-lg font-extrabold text-kw-gold-soft">
            {PANEL_TITLES[effectiveTab]}
          </h2>
          <div className="flex items-center gap-1">
            {(effectiveTab === 'home' || effectiveTab === 'classroom') && (
              <button
                onClick={() => setRoomOverlay('none')}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer mr-1"
              >
                Back to 3D {effectiveTab === 'home' ? 'Room' : 'Classroom'}
              </button>
            )}
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
              onClick={closeDrawer}
              className="p-2 sm:p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close panel"
            >
              <X className="w-6 h-6 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        <div className="kw-scroll overflow-y-auto flex-1 bg-kw-cream text-stone-900 pb-6">
          {effectiveTab === 'classroom' && <ClassroomView />}
          {effectiveTab === 'home' && <HomeView />}
          {effectiveTab === 'profile' && <ProfileView />}
          {effectiveTab === 'minbar' && <MinbarFeed />}
        </div>
      </div>
    </div>
  );
};
