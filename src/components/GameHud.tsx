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

const LEARNER_TIERS: Record<string, { title: string; emoji: string }> = {
  starter: { title: 'Starter Student', emoji: '🌱' },
  standard: { title: 'Madrasah Scholar', emoji: '📖' },
  advanced: { title: 'Senior Faqih', emoji: '✨' },
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
  const education = useGameStore((s) => s.education);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const s = player.stats;
  const tier = LEARNER_TIERS[education.learnerTier ?? 'starter'] ?? LEARNER_TIERS.starter;

  // Connect Firebase Auth, Online Presence, Challenges & Minbar Feed once on mount
  useEffect(() => {
    const unsubAuth = subscribeToAuth(async (user) => {
      const store = useGameStore.getState();
      store.setAuthChecked(true);
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

    const onBeforeUnload = () => {
      useGameStore.getState().syncToCloud();
    };
    window.addEventListener('beforeunload', onBeforeUnload);

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
      window.removeEventListener('beforeunload', onBeforeUnload);
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
      className="kw-glass pointer-events-auto px-2 sm:px-3 py-1.5 sm:py-2 flex flex-col gap-1 sm:gap-1.5 min-w-0 shrink-0 max-w-[42%] sm:max-w-[270px] cursor-pointer hover:border-amber-400/40 transition"
    >
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-linear-to-b from-kw-gold-soft to-kw-gold flex items-center justify-center text-xs sm:text-base shadow-inner overflow-hidden shrink-0">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            tier.emoji
          )}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="kw-display text-[11.5px] sm:text-[14px] font-extrabold truncate">{player.name}</div>
          <div className="text-[9px] sm:text-[10px] text-kw-gold-soft font-semibold truncate">
            {tier.title}
          </div>
        </div>
        <div className="pl-0.5 sm:pl-1 text-right shrink-0">
          <div className="text-[11px] sm:text-[13px] font-extrabold font-mono text-emerald-300 leading-tight">
            ₦{s.naira.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 sm:gap-2 pt-0.5">
        <Meter icon={<BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />} value={s.ilm} color="#60a5fa" label="Ilm" />
        <Meter icon={<Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3" />} value={s.taqwa} color="#34d399" label="Taqwa" />
        <Meter icon={<Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />} value={s.energy} color="#fbbf24" label="Energy" />
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
    <div className="kw-glass pointer-events-auto px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2.5 min-w-0 flex-1 sm:flex-initial sm:max-w-fit ml-auto">
      <div className="text-right leading-tight min-w-0 flex-1">
        <div className="kw-display text-[11px] sm:text-[14px] font-extrabold flex items-center justify-end gap-1 truncate">
          <span>{prayer.icon}</span>
          <span className="truncate">{prayer.name}</span>
          <span dir="rtl" className="font-serif text-kw-gold-soft text-xs sm:text-sm shrink-0">
            {prayer.arabic}
          </span>
        </div>
        <div className="text-[8.5px] sm:text-[10.5px] text-kw-cream-dim font-mono flex items-center justify-end gap-1 mt-0.5 truncate">
          <span className="text-white font-bold shrink-0">{mounted ? formatHour(displayHour) : '--:--'}</span>
          <span className="text-kw-gold-soft truncate">
            · Next {prayer.nextName} {prayer.nextTimeStr}
          </span>
        </div>
        <div className="text-[8px] sm:text-[9.5px] text-sky-300 font-semibold flex items-center justify-end gap-1 mt-0.5 truncate">
          <span className="shrink-0">{weather.icon}</span>
          <span className="font-mono font-bold shrink-0">{weather.tempC}°C</span>
          <span className="truncate">· {weather.label}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 sm:gap-1 border-l border-white/10 pl-1 sm:pl-1.5 shrink-0">
        <button
          onClick={toggleMute}
          className="p-1 sm:p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => {
            if (confirm('Start a new life journey in Ile-Kewu? Your local stats will reset.')) resetGame();
          }}
          className="hidden sm:block p-1 sm:p-1.5 rounded-lg text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
          title="Restart life"
          aria-label="Restart life"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const TopHud: React.FC = () => {
  return (
    <header className="kw-safe-top absolute inset-x-2 sm:inset-x-3.5 flex items-start justify-between gap-1.5 sm:gap-3 pointer-events-none z-10">
      <TopLeftHud />
      <TopRightHud />
    </header>
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
  const housing = useGameStore((s) => s.housing);
  const mount = useGameStore((s) => s.mount);
  const setMount = useGameStore((s) => s.setMount);
  const roomOverlay = useGameStore((s) => s.roomOverlay);

  // Hide Dock during live 3D room arrangement so the arrange controls sit at the bottom with maximum 3D view
  if (roomOverlay === 'arrange_furniture') return null;

  const hasOkada = housing.upgrades.includes('asset_okada');
  const hasBike = housing.upgrades.includes('asset_bicycle');

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

      {/* Quick Vehicle Transportation Button on Mobile & Desktop */}
      {mount !== 'none' ? (
        <button
          onClick={() => setMount('none')}
          className="kw-dock-btn bg-amber-400 text-stone-950 font-extrabold animate-pulse shadow-md"
          title="Dismount Vehicle (F)"
          aria-label="Dismount Vehicle"
        >
          <span className="text-base">{mount === 'okada' ? '🏍️' : '🚲'}</span>
          <span className="text-[10px] leading-tight font-extrabold">Dismount</span>
        </button>
      ) : hasOkada ? (
        <button
          onClick={() => setMount('okada')}
          className="kw-dock-btn text-amber-300 hover:text-white"
          title="Ride Okada (F)"
          aria-label="Ride Okada"
        >
          <span className="text-base">🏍️</span>
          <span className="text-[10px] leading-tight font-bold">Okada</span>
        </button>
      ) : hasBike ? (
        <button
          onClick={() => setMount('bicycle')}
          className="kw-dock-btn text-emerald-300 hover:text-white"
          title="Ride Bicycle (F)"
          aria-label="Ride Bicycle"
        >
          <span className="text-base">🚲</span>
          <span className="text-[10px] leading-tight font-bold">Bike</span>
        </button>
      ) : null}
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
  const lastWorldTab = useGameStore((s) => s.lastWorldTab || 'compound');

  const [quickMsg, setQuickMsg] = useState<string | null>(null);
  const showQuick = (m: string) => {
    setQuickMsg(m);
    setTimeout(() => setQuickMsg(null), 3500);
  };

  if ((activeTab === 'compound' || activeTab === 'home') && (roomOverlay === 'none' || roomOverlay === 'arrange_furniture')) return null;

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
      setActiveTab(lastWorldTab);
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
