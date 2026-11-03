import { create } from 'zustand';
import {
  PlayerProfile, PlayerStats, LifeStage, GameEvent, EventChoice, MinbarPost,
  Loc, ActivityId, Outfit, RideInfo, ErrandState,
} from '@/types/game';
import { GAME_EVENTS } from '@/data/events';
import { SHOP_ITEMS, DEFAULT_OWNED, DEFAULT_OUTFIT } from '@/data/shop';
import { sound } from '@/lib/audio';

export type TabId = 'compound' | 'life' | 'walaah' | 'quiz' | 'minbar' | 'rankings';

export const LOC_META: Record<Loc, { name: string; fare: number }> = {
  school: { name: 'MAHD IQRA, Ejigbo', fare: 200 },
  east: { name: 'Isolo Estate (Home Lesson)', fare: 300 },
  west: { name: 'Idimu Central Mosque', fare: 300 },
};

const stageFor = (age: number, ilm: number): LifeStage => {
  if (age >= 25 || ilm >= 85) return 'sheikh_agba';
  if (age >= 18 || ilm >= 60) return 'markaziy';
  if (age >= 12 || ilm >= 35) return 'arowo_kewu';
  return 'omo_kewu';
};

interface GameState {
  player: PlayerProfile;
  currentEvent: GameEvent | null;
  minbarPosts: MinbarPost[];
  isMuted: boolean;
  /** 'compound' = no panel open, the 3D world is fully visible */
  activeTab: TabId;
  /** In-game hour of day (0-24) */
  hour: number;

  // Interactive systems
  owned: string[];
  outfit: Outfit;
  outfitRevision: number;
  activity: ActivityId | null;
  location: Loc;
  ride: RideInfo | null;
  errand: ErrandState | null;
  slateTraced: boolean;
  lastAdhanPrayer: string;
  rally: number;

  // Actions
  chooseOption: (choice: EventChoice) => void;
  nextDay: () => void;
  toggleMute: () => void;
  setActiveTab: (tab: TabId) => void;
  setHour: (hour: number) => void;
  setActivity: (activity: ActivityId | null) => void;
  /** Pay naira (if affordable) and apply stat changes. Returns false if too poor. */
  spend: (cost: number, changes: Partial<PlayerStats>, log: string) => boolean;
  reward: (changes: Partial<PlayerStats>, log: string, hifzGain?: number) => void;
  buyOrEquip: (itemId: string) => { ok: boolean; msg: string };
  startRide: (to: Loc) => { ok: boolean; msg: string };
  updateRide: (progress: number) => void;
  finishRide: () => void;
  startErrand: () => string;
  pickUpErrand: () => string;
  completeErrand: () => string;
  markSlateTraced: () => void;
  triggerRally: (prayerName: string) => void;
  washWalaahSuccess: () => void;
  quizAnswerSuccess: (points: number) => void;
  addMinbarPost: (text: string, authorName?: string) => void;
  resetGame: () => void;
}

const INITIAL_STATS: PlayerStats = {
  ilm: 15,
  taqwa: 40,
  energy: 85,
  pasanResistance: 20,
  naira: 1200,
  barakah: 10,
};

const INITIAL_PLAYER: PlayerProfile = {
  id: 'guest_player_' + Math.random().toString(36).substring(7),
  name: 'Ahmad Al-Mukhtar',
  gender: 'male',
  stage: 'omo_kewu',
  age: 8,
  yearInMadrasah: 1,
  stats: INITIAL_STATS,
  hifzJuz: 1,
  inventory: [
    {
      id: 'walaah_board',
      name: 'Polished Wooden Slate (Walaah)',
      category: 'tool',
      icon: '🪵',
      description: 'Your trusted wooden board for Quranic calligraphy.',
      effectDescription: '+10% Ilm retention',
    },
    {
      id: 'tadaa_ink',
      name: 'Traditional Soot Ink (Tadaa)',
      category: 'tool',
      icon: '🖋️',
      description: 'Homemade rich black ink made from pot bottom soot.',
      effectDescription: 'Essential for writing verses',
    },
    {
      id: 'white_kofia',
      name: 'White Prayer Cap (Kofia)',
      category: 'clothing',
      icon: '🧢',
      description: 'Clean starched cap for attending class and prayers.',
      effectDescription: '+5 Taqwa',
    },
  ],
  logHistory: [
    'Enrolled at MAHD IQRA, Ejigbo in Lagos. Given your first wooden Walaah board!',
  ],
  streakDays: 1,
  madrasahName: 'MAHD IQRA, Ejigbo, Lagos',
};

const INITIAL_MINBAR_POSTS: MinbarPost[] = [
  {
    id: '1',
    authorName: 'Ustadh Luqman',
    authorStage: 'sheikh_agba',
    text: 'May Allah bless every parent who wakes up early to prepare their children for Saturday and Sunday Ile-Kewu. Your reward is with Allah! 🤲',
    likes: 124,
    takbeers: 340,
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: '2',
    authorName: 'Brother Faruq (Agege)',
    authorStage: 'markaziy',
    text: 'Who remembers when Alfa shouted "Ta la\'a! Read it out loud!" and the whole courtyard shook? 😭 Never sleep in Asr class!',
    likes: 88,
    takbeers: 45,
    timestamp: Date.now() - 3600000 * 5,
  },
  {
    id: '3',
    authorName: 'Sister Maryam (Ikorodu)',
    authorStage: 'arowo_kewu',
    text: 'Alhamdulillah! Just completed Juz \'Amma today. Waiting for my small Walimah celebration this weekend 🧕🎉',
    likes: 210,
    takbeers: 512,
    timestamp: Date.now() - 3600000 * 12,
  },
];

const clamp = (v: number) => Math.min(100, Math.max(0, v));

export const useGameStore = create<GameState>((set, get) => ({
  player: INITIAL_PLAYER,
  currentEvent: GAME_EVENTS[0],
  minbarPosts: INITIAL_MINBAR_POSTS,
  isMuted: false,
  activeTab: 'compound',
  hour: 7,

  owned: [...DEFAULT_OWNED],
  outfit: { ...DEFAULT_OUTFIT },
  outfitRevision: 0,
  activity: null,
  location: 'school',
  ride: null,
  errand: null,
  slateTraced: false,
  lastAdhanPrayer: '',
  rally: 0,

  setHour: (hour) => set({ hour }),
  setActivity: (activity) => set({ activity, activeTab: 'compound' }),

  spend: (cost, changes, log) => {
    const { player } = get();
    if (player.stats.naira < cost) {
      sound.playPasan();
      return false;
    }
    if (cost > 0) sound.playCoin();
    else sound.playWalaahTap();
    const updatedStats: PlayerStats = {
      ilm: clamp(player.stats.ilm + (changes.ilm || 0)),
      taqwa: clamp(player.stats.taqwa + (changes.taqwa || 0)),
      energy: clamp(player.stats.energy + (changes.energy || 0)),
      pasanResistance: clamp(player.stats.pasanResistance + (changes.pasanResistance || 0)),
      naira: Math.max(0, player.stats.naira - cost + (changes.naira || 0)),
      barakah: clamp(player.stats.barakah + (changes.barakah || 0)),
    };
    set({
      player: {
        ...player,
        stage: stageFor(player.age, updatedStats.ilm),
        stats: updatedStats,
        logHistory: [log, ...player.logHistory.slice(0, 19)],
      },
    });
    return true;
  },

  reward: (changes, log, hifzGain = 0) => {
    const { player } = get();
    if (changes.naira && changes.naira > 0) sound.playCoin();
    else sound.playTakbeer();
    const updatedStats: PlayerStats = {
      ilm: clamp(player.stats.ilm + (changes.ilm || 0)),
      taqwa: clamp(player.stats.taqwa + (changes.taqwa || 0)),
      energy: clamp(player.stats.energy + (changes.energy || 0)),
      pasanResistance: clamp(player.stats.pasanResistance + (changes.pasanResistance || 0)),
      naira: Math.max(0, player.stats.naira + (changes.naira || 0)),
      barakah: clamp(player.stats.barakah + (changes.barakah || 0)),
    };
    set({
      player: {
        ...player,
        stage: stageFor(player.age, updatedStats.ilm),
        hifzJuz: Math.min(30, player.hifzJuz + hifzGain),
        stats: updatedStats,
        logHistory: [log, ...player.logHistory.slice(0, 19)],
      },
    });
  },

  buyOrEquip: (itemId) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return { ok: false, msg: 'Item not found.' };
    const { owned, outfit, outfitRevision, player } = get();
    const already = owned.includes(item.id);
    if (!already) {
      if (player.stats.naira < item.price) {
        sound.playPasan();
        return { ok: false, msg: `You need ₦${item.price.toLocaleString()} for ${item.name}.` };
      }
      sound.playCoin();
      const nextOwned = [...owned, item.id];
      const nextOutfit = item.apply ? { ...outfit, ...item.apply } : outfit;
      set({
        owned: nextOwned,
        outfit: nextOutfit,
        outfitRevision: item.apply ? outfitRevision + 1 : outfitRevision,
        player: {
          ...player,
          stats: {
            ...player.stats,
            naira: player.stats.naira - item.price,
            barakah: clamp(player.stats.barakah + 2),
          },
          logHistory: [`Bought ${item.name} from Mallam Idris for ₦${item.price.toLocaleString()}.`, ...player.logHistory.slice(0, 19)],
        },
      });
      return { ok: true, msg: item.apply ? `Purchased & equipped ${item.name}!` : `Unlocked ${item.name}!` };
    }
    if (item.apply) {
      sound.playWalaahTap();
      set({
        outfit: { ...outfit, ...item.apply },
        outfitRevision: outfitRevision + 1,
      });
      return { ok: true, msg: `Equipped ${item.name}.` };
    }
    return { ok: true, msg: `You already own ${item.name}.` };
  },

  startRide: (to) => {
    const { location, player, ride } = get();
    if (ride) return { ok: false, msg: 'Already on a Danfo!' };
    if (to === location) return { ok: false, msg: 'You are already here.' };
    const meta = LOC_META[to];
    if (player.stats.naira < meta.fare) {
      sound.playPasan();
      return { ok: false, msg: `Conductor: "Enter with your change o! Fare is ₦${meta.fare}."` };
    }
    sound.playCoin();
    set({
      activity: null,
      activeTab: 'compound',
      ride: { from: location, to, label: meta.name, progress: 0 },
      player: {
        ...player,
        stats: { ...player.stats, naira: player.stats.naira - meta.fare },
        logHistory: [`Boarded a yellow Danfo heading to ${meta.name} (-₦${meta.fare}).`, ...player.logHistory.slice(0, 19)],
      },
    });
    return { ok: true, msg: `Oya enter! Danfo moving to ${meta.name}...` };
  },

  updateRide: (progress) => {
    const { ride } = get();
    if (!ride) return;
    set({ ride: { ...ride, progress: Math.min(1, Math.max(0, progress)) } });
  },

  finishRide: () => {
    const { ride } = get();
    if (!ride) return;
    set({ location: ride.to, ride: null });
  },

  startErrand: () => {
    const { errand } = get();
    if (errand) {
      return errand.stage === 'fetch'
        ? 'Ustadh Hamza: "Hurry to Iya Basira’s Buka across the road and bring my hot amala!"'
        : 'Ustadh Hamza: "You have the amala! Hand it over quickly!"';
    }
    sound.playWalaahTap();
    set({ errand: { stage: 'fetch', startedAt: Date.now() } });
    return 'Ustadh Hamza: "Go to Iya Basira’s Buka across the street and collect my hot amala! Don’t let it get cold!"';
  },

  pickUpErrand: () => {
    const { errand } = get();
    if (!errand || errand.stage !== 'fetch') return '';
    sound.playWalaahTap();
    set({ errand: { stage: 'deliver', startedAt: Date.now() } });
    return 'Iya Basira wrapped the steaming amala & ewedu! Deliver it to Ustadh Hamza within 45s for a big tip!';
  },

  completeErrand: () => {
    const { errand } = get();
    if (!errand || errand.stage !== 'deliver') return '';
    const elapsed = (Date.now() - errand.startedAt) / 1000;
    const hot = elapsed <= 45;
    const tip = hot ? 400 : 150;
    set({ errand: null });
    get().reward(
      { naira: tip, barakah: hot ? 4 : 2, taqwa: 2 },
      hot
        ? `Delivered steaming hot amala to Ustadh Hamza in ${Math.round(elapsed)}s! Received ₦${tip} tip & dua.`
        : `Delivered the amala to Ustadh Hamza (a bit cool). Received ₦${tip} tip.`,
    );
    return hot
      ? `Ustadh Hamza: "Masha'Allah, still steaming hot! Take this ₦${tip} and may Allah bless your ilm!"`
      : `Ustadh Hamza: "Jazakallahu khayran, though it cooled down a bit. Take ₦${tip}."`;
  },

  markSlateTraced: () => {
    sound.playWalaahTap();
    const { player, slateTraced } = get();
    if (slateTraced) return;
    set({
      slateTraced: true,
      player: {
        ...player,
        stats: {
          ...player.stats,
          ilm: clamp(player.stats.ilm + 4),
        },
        logHistory: ['Inked Arabic letters onto your wooden Walaah slate with Tadaa ink (+4 Ilm). Now wash it at the well!', ...player.logHistory.slice(0, 19)],
      },
    });
  },

  triggerRally: (prayerName) => {
    set({ lastAdhanPrayer: prayerName, rally: Date.now() });
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    sound.setMuted(nextMuted);
    set({ isMuted: nextMuted });
  },

  setActiveTab: (tab) => set({ activeTab: tab, activity: null }),

  chooseOption: (choice: EventChoice) => {
    const { player } = get();
    const changes = choice.consequences.statChanges;

    if (changes.naira && changes.naira > 0) {
      sound.playCoin();
    } else if (changes.pasanResistance && changes.pasanResistance > 0) {
      sound.playPasan();
    } else if (changes.taqwa && changes.taqwa > 10) {
      sound.playTakbeer();
    } else {
      sound.playWalaahTap();
    }

    const updatedStats: PlayerStats = {
      ilm: clamp(player.stats.ilm + (changes.ilm || 0)),
      taqwa: clamp(player.stats.taqwa + (changes.taqwa || 0)),
      energy: clamp(player.stats.energy + (changes.energy || 0)),
      pasanResistance: clamp(player.stats.pasanResistance + (changes.pasanResistance || 0)),
      naira: Math.max(0, player.stats.naira + (changes.naira || 0)),
      barakah: clamp(player.stats.barakah + (changes.barakah || 0)),
    };

    const newAge = player.age + 1;
    const updatedStage = stageFor(newAge, updatedStats.ilm);
    const newLogs = [choice.consequences.logMessage, ...player.logHistory.slice(0, 19)];

    set({
      player: {
        ...player,
        age: newAge,
        yearInMadrasah: player.yearInMadrasah + 1,
        stats: updatedStats,
        stage: updatedStage,
        logHistory: newLogs,
      },
      currentEvent: null,
    });
  },

  nextDay: () => {
    const { player } = get();
    const updatedStats = {
      ...player.stats,
      energy: Math.min(100, player.stats.energy + 25),
    };

    const availableEvents = GAME_EVENTS.filter(
      (ev) => ev.stage === 'all' || ev.stage === player.stage,
    );

    const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)] || GAME_EVENTS[0];

    sound.playWalaahTap();

    set({
      player: {
        ...player,
        stats: updatedStats,
        streakDays: player.streakDays + 1,
      },
      currentEvent: randomEvent,
    });
  },

  washWalaahSuccess: () => {
    sound.playWaterWash();
    const { player, slateTraced } = get();
    const bonusIlm = slateTraced ? 8 : 5;
    const bonusNaira = slateTraced ? 150 : 0;
    set({
      slateTraced: false,
      player: {
        ...player,
        stage: stageFor(player.age, clamp(player.stats.ilm + bonusIlm)),
        stats: {
          ...player.stats,
          ilm: clamp(player.stats.ilm + bonusIlm),
          taqwa: clamp(player.stats.taqwa + 3),
          naira: player.stats.naira + bonusNaira,
        },
        logHistory: [
          slateTraced
            ? 'Washed your inked Walaah slate at the well! Memorized the verse by heart (+8 Ilm, +₦150).'
            : 'Washed and cleaned your wooden Walaah board sparkling clean in the sun (+5 Ilm).',
          ...player.logHistory.slice(0, 19),
        ],
      },
    });
  },

  quizAnswerSuccess: (points: number) => {
    sound.playTakbeer();
    const { player } = get();
    const nextIlm = clamp(player.stats.ilm + points);
    set({
      player: {
        ...player,
        stage: stageFor(player.age, nextIlm),
        stats: {
          ...player.stats,
          ilm: nextIlm,
          barakah: clamp(player.stats.barakah + 5),
          naira: player.stats.naira + 1000,
        },
        logHistory: [`Answered the Quran recitation quiz correctly! Received ₦1,000 and +${points} Ilm!`, ...player.logHistory.slice(0, 19)],
      },
    });
  },

  addMinbarPost: (text: string, authorName?: string) => {
    const { minbarPosts, player } = get();
    const newPost: MinbarPost = {
      id: Date.now().toString(),
      authorName: authorName || player.name,
      authorStage: player.stage,
      text,
      likes: 1,
      takbeers: 1,
      timestamp: Date.now(),
    };
    sound.playTakbeer();
    set({ minbarPosts: [newPost, ...minbarPosts] });
  },

  resetGame: () => {
    set({
      player: {
        ...INITIAL_PLAYER,
        id: 'guest_player_' + Math.random().toString(36).substring(7),
      },
      currentEvent: GAME_EVENTS[0],
      activeTab: 'compound',
      activity: null,
      location: 'school',
      ride: null,
      errand: null,
      slateTraced: false,
      owned: [...DEFAULT_OWNED],
      outfit: { ...DEFAULT_OUTFIT },
      outfitRevision: get().outfitRevision + 1,
    });
  },
}));
