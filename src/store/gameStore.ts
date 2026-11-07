import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  PlayerProfile,
  PlayerStats,
  LifeStage,
  GameEvent,
  EventChoice,
  MinbarPost,
  MinbarComment,
  Loc,
  ActivityId,
  Outfit,
  RideInfo,
  ErrandState,
  PlayerHousing,
  PlayerEducation,
  HousingTierId,
  SubjectId,
  OnlinePeer,
  GameChallenge,
  MountVehicle,
  FurnitureTransform,
  LearnerTier,
  MultiplayerMatchRoom,
} from '@/types/game';
import { GAME_EVENTS } from '@/data/events';
import {
  SHOP_ITEMS,
  DEFAULT_OWNED,
  DEFAULT_OUTFIT,
  HOUSING_TIERS,
  LIFESTYLE_ASSETS,
} from '@/data/shop';
import { getTodayDateKey } from '@/data/curriculum';
import { sound } from '@/lib/audio';
import {
  WeatherInfo,
  DEFAULT_WEATHER,
  SolatTimings,
  DEFAULT_LAGOS_TIMINGS,
} from '@/lib/time';
import {
  saveCloudState,
  CloudSavePayload,
  publishMinbarPostToCloud,
  updateMinbarPostInCloud,
  deleteMinbarPostFromCloud,
  incrementMinbarReaction,
  addCommentToMinbarPost,
  sendGameChallengeToCloud,
  updateGameChallengeInCloud,
  sendPeerInteractionToCloud,
  updatePresenceStatus,
  createOrJoinMatchRoom,
} from '@/lib/firebase';

export type TabId = 'compound' | 'classroom' | 'home' | 'profile' | 'minbar';

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

export interface AuthUserSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface GameState {
  player: PlayerProfile;
  housing: PlayerHousing;
  education: PlayerEducation;
  currentEvent: GameEvent | null;
  minbarPosts: MinbarPost[];
  isMuted: boolean;
  /** 'compound' = School 3D world is visible */
  activeTab: TabId;
  /** Real-world hour of day (0-24) */
  hour: number;
  /** Live Lagos weather state */
  weather: WeatherInfo;
  /** Daily Lagos Solat timings */
  solatTimings: SolatTimings;

  // Firebase & Multiplayer state
  authUser: AuthUserSummary | null;
  authChecked: boolean;
  isGuest: boolean;
  cloudSynced: boolean;
  lastSyncedAt: number | null;
  onlinePeers: OnlinePeer[];
  challenges: GameChallenge[];
  greetedPeerIds: string[];
  activeMatchRoom: MultiplayerMatchRoom | null;

  // Interactive systems
  owned: string[];
  outfit: Outfit;
  outfitRevision: number;
  activity: ActivityId | null;
  location: Loc;
  ride: RideInfo | null;
  errand: ErrandState | null;
  lastAdhanPrayer: string;
  rally: number;
  roomOverlay: 'none' | 'home_dashboard' | 'classroom_lesson' | 'arrange_furniture';
  activeClassroomSubject: SubjectId;
  mount: MountVehicle;
  selectedFurniture: string;
  lastWorldTab: 'compound' | 'classroom' | 'home';

  // Actions
  setMount: (mount: MountVehicle) => void;
  setSelectedFurniture: (id: string) => void;
  updateFurnitureTransform: (itemId: string, transform: Partial<FurnitureTransform>) => void;
  resetFurnitureLayout: () => void;
  chooseOption: (choice: EventChoice) => void;
  nextDay: () => void;
  restAtHome: () => { ok: boolean; msg: string };
  prayInRoom: () => string;
  studyAtDesk: () => string;
  setRoomOverlay: (overlay: 'none' | 'home_dashboard' | 'classroom_lesson' | 'arrange_furniture') => void;
  openClassroomSubject: (subject: SubjectId) => void;
  toggleMute: () => void;
  setActiveTab: (tab: TabId) => void;
  setHour: (hour: number) => void;
  setWeather: (weather: WeatherInfo) => void;
  setSolatTimings: (timings: SolatTimings) => void;
  setActivity: (activity: ActivityId | null) => void;
  spend: (cost: number, changes: Partial<PlayerStats>, log: string) => boolean;
  reward: (changes: Partial<PlayerStats>, log: string, hifzGain?: number) => void;
  buyOrEquip: (itemId: string) => { ok: boolean; msg: string };
  rentOrBuyHousing: (tierId: HousingTierId, mode: 'rent' | 'buy') => { ok: boolean; msg: string };
  payRent: () => { ok: boolean; msg: string };
  buyLifestyleAsset: (assetId: string) => { ok: boolean; msg: string };
  completeDailyClassroomLesson: (
    subject: SubjectId,
    topicTitle: string,
    correct: number,
    total: number,
  ) => { stipend: number; ilmGain: number; alreadyDoneToday: boolean };
  setLearnerTier: (tier: LearnerTier) => void;
  updateProfileInfo: (updates: {
    name?: string;
    gender?: 'male' | 'female';
    madrasahName?: string;
    avatarUrl?: string;
  }) => void;
  setAuthUser: (user: AuthUserSummary | null) => void;
  setAuthChecked: (checked: boolean) => void;
  setIsGuest: (isGuest: boolean) => void;
  setOnlinePeers: (peers: OnlinePeer[]) => void;
  setChallenges: (challenges: GameChallenge[]) => void;
  setMinbarPosts: (posts: MinbarPost[]) => void;
  hydrateFromCloud: (payload: CloudSavePayload) => void;
  syncToCloud: () => Promise<boolean>;
  sendSalaamToPeer: (peer: OnlinePeer) => { ok: boolean; msg: string };
  organizeGameWithPeer: (
    peer: OnlinePeer,
    gameType: GameChallenge['gameType'],
    wager: number,
  ) => { ok: boolean; msg: string };
  setActiveMatchRoom: (room: MultiplayerMatchRoom | null) => void;
  acceptIncomingChallenge: (alert: {
    id: string;
    type: string;
    gameType?: string;
    roomId?: string;
    fromUid?: string;
    fromName?: string;
  }) => void;
  submitDuelResult: (challengeId: string, score: number) => void;
  startRide: (to: Loc) => { ok: boolean; msg: string };
  updateRide: (progress: number) => void;
  finishRide: () => void;
  startErrand: () => string;
  pickUpErrand: () => string;
  completeErrand: () => string;
  performSunnahWudu: () => void;
  triggerRally: (prayerName: string) => void;
  quizAnswerSuccess: (points: number) => void;
  addMinbarPost: (text: string, audioUrl?: string, authorName?: string) => void;
  editMinbarPost: (postId: string, text: string) => void;
  deleteMinbarPost: (postId: string) => void;
  reactToMinbarPost: (postId: string, reaction: 'takbeer' | 'like') => void;
  commentOnMinbarPost: (postId: string, text: string) => void;
  getBusFare: (to: Loc) => number;
  resetGame: () => void;
}

const INITIAL_STATS: PlayerStats = {
  ilm: 15,
  taqwa: 40,
  energy: 85,
  pasanResistance: 20,
  naira: 2000, // Recommended ₦2,000 starter pocket money in Ruwaq
  barakah: 12,
};

const INITIAL_HOUSING: PlayerHousing = {
  tier: 'ruwaq',
  ownership: 'boarding',
  rentDueInDays: 0,
  upgrades: [],
  furnitureLayout: {},
};

const INITIAL_EDUCATION: PlayerEducation = {
  completedDailyKeys: [],
  lastStudyDate: '',
  totalLessonsCompleted: 0,
  subjectMastery: {
    nahw: 15,
    fiqh: 20,
    tajweed: 25,
    hadith: 15,
    seerah: 15,
    adab: 30,
  },
};

const INITIAL_PLAYER: PlayerProfile = {
  id: 'scholar_' + Math.random().toString(36).substring(2, 9),
  name: 'Ahmad Al-Mukhtar',
  gender: 'male',
  stage: 'omo_kewu',
  age: 9,
  yearInMadrasah: 1,
  stats: INITIAL_STATS,
  hifzJuz: 1,
  inventory: [
    {
      id: 'qaidah_book',
      name: "Qa'idah Baghdadiyyah",
      category: 'book',
      icon: '📘',
      description: 'Foundational Arabic alphabet and vowel manual.',
      effectDescription: 'Unlocks Huruf & Tajweed drills',
    },
    {
      id: 'daftar_notebook',
      name: 'Arabic Exercise Notebook & Pen',
      category: 'tool',
      icon: '📓',
      description: 'Ruled exercise book for copying daily classroom lessons and grammar notes.',
      effectDescription: '+10% Classroom Ilm retention',
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
    'Arrived at Ruwaq Boarding House in MAHD IQRA, Ejigbo with ₦2,000 pocket money and your Qa’idah!',
  ],
  streakDays: 1,
  madrasahName: 'MAHD IQRA, Ejigbo, Lagos',
};

const INITIAL_MINBAR_POSTS: MinbarPost[] = [];

const clamp = (v: number) => Math.min(100, Math.max(0, v));

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
export function triggerAutoSave() {
  if (typeof window === 'undefined') return;
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    useGameStore.getState().syncToCloud();
  }, 1200);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: INITIAL_PLAYER,
      housing: INITIAL_HOUSING,
      education: INITIAL_EDUCATION,
      currentEvent: null,
      minbarPosts: INITIAL_MINBAR_POSTS,
      isMuted: false,
      activeTab: 'compound',
      hour: 7,
      weather: DEFAULT_WEATHER,
      solatTimings: DEFAULT_LAGOS_TIMINGS,

      authUser: null,
      authChecked: false,
      isGuest: false,
      cloudSynced: false,
      lastSyncedAt: null,
      onlinePeers: [],
      challenges: [],
      greetedPeerIds: [],
      activeMatchRoom: null,

      setAuthChecked: (authChecked) => set({ authChecked }),
      setIsGuest: (isGuest) => set({ isGuest }),

      mount: 'none' as MountVehicle,
      setMount: (mount) => set({ mount }),

      updateFurnitureTransform: (itemId, transform) => {
        const { housing } = get();
        const curLayout = housing.furnitureLayout ?? {};
        const curItem = curLayout[itemId] ?? { dx: 0, dz: 0, rot: 0 };
        const nextItem: FurnitureTransform = {
          dx: transform.dx !== undefined ? Math.min(4.5, Math.max(-4.5, transform.dx)) : curItem.dx,
          dz: transform.dz !== undefined ? Math.min(4.5, Math.max(-4.5, transform.dz)) : curItem.dz,
          rot: transform.rot !== undefined ? transform.rot : curItem.rot,
        };
        set({
          housing: {
            ...housing,
            furnitureLayout: {
              ...curLayout,
              [itemId]: nextItem,
            },
          },
        });
        triggerAutoSave();
      },

      resetFurnitureLayout: () => {
        const { housing } = get();
        set({
          housing: {
            ...housing,
            furnitureLayout: {},
          },
        });
        triggerAutoSave();
      },

  owned: [...DEFAULT_OWNED],
  outfit: { ...DEFAULT_OUTFIT },
  outfitRevision: 0,
  activity: null,
  location: 'school',
  ride: null,
  errand: null,
  lastAdhanPrayer: '',
  rally: 0,
  roomOverlay: 'none',
  activeClassroomSubject: 'nahw',
  selectedFurniture: 'desk',
  lastWorldTab: 'compound',

  setSelectedFurniture: (selectedFurniture) => set({ selectedFurniture }),
  setHour: (hour) => set({ hour }),
  setWeather: (weather) => set({ weather }),
  setSolatTimings: (solatTimings) => set({ solatTimings }),
  setActivity: (activity) => set({ activity, roomOverlay: 'none' }),
  setRoomOverlay: (roomOverlay) => set({ roomOverlay }),
  openClassroomSubject: (subject) => set({ activeClassroomSubject: subject, roomOverlay: 'classroom_lesson' }),

  setActiveTab: (tab) => {
    const isWorldTab = tab === 'compound' || tab === 'classroom' || tab === 'home';
    set((state) => ({
      activeTab: tab,
      lastWorldTab: isWorldTab ? tab : state.lastWorldTab || 'compound',
      activity: null,
      roomOverlay: 'none',
    }));
    const { authUser, player, housing, outfit } = get();
    if (authUser) {
      updatePresenceStatus({
        uid: authUser.uid,
        name: player.name,
        stage: player.stage,
        madrasahName: player.madrasahName,
        ilm: player.stats.ilm,
        hifzJuz: player.hifzJuz,
        housingTier: housing.tier,
        currentTab: tab,
        lastSeen: Date.now(),
        outfit,
        isLive: true,
      });
    }
  },

  setAuthUser: (authUser) => set({ authUser }),

  setOnlinePeers: (cloudPeers) => {
    const { authUser } = get();
    // Only display genuine authenticated users from the cloud presence node
    const realPeers = cloudPeers.filter((p) => p.uid !== authUser?.uid);
    set({ onlinePeers: realPeers });
  },

  setChallenges: (challenges) => set({ challenges }),
  setMinbarPosts: (posts) => set({ minbarPosts: posts }),

  hydrateFromCloud: (payload) => {
    set({
      player: payload.player ?? get().player,
      housing: payload.housing ?? get().housing,
      education: payload.education ?? get().education,
      owned: payload.owned ?? get().owned,
      outfit: payload.outfit ?? get().outfit,
      outfitRevision: get().outfitRevision + 1,
      cloudSynced: true,
      lastSyncedAt: payload.updatedAt ?? Date.now(),
    });
  },

  syncToCloud: async () => {
    const { authUser, player, housing, education, owned, outfit } = get();
    if (!authUser) return false;
    const ok = await saveCloudState(authUser.uid, {
      player,
      housing,
      education,
      owned,
      outfit,
      updatedAt: Date.now(),
    });
    if (ok) {
      set({ cloudSynced: true, lastSyncedAt: Date.now() });
    }
    return ok;
  },

  updateProfileInfo: (updates) => {
    const { player, outfit } = get();
    const nextGender = updates.gender ?? player.gender;
    const nextOutfit =
      updates.gender && updates.gender !== player.gender
        ? {
            ...outfit,
            cap: nextGender === 'female' ? ('hijab' as const) : ('kofia' as const),
            capColor: 0xffffff,
          }
        : outfit;
    set({
      player: {
        ...player,
        name: updates.name?.trim() ? updates.name.trim() : player.name,
        gender: nextGender,
        madrasahName: updates.madrasahName?.trim() ? updates.madrasahName.trim() : player.madrasahName,
        avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : player.avatarUrl,
      },
      outfit: nextOutfit,
      outfitRevision: get().outfitRevision + 1,
    });
    triggerAutoSave();
  },

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
        logHistory: [log, ...player.logHistory.slice(0, 24)],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
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
        logHistory: [log, ...player.logHistory.slice(0, 24)],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
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
          logHistory: [
            `Bought ${item.name} from Mallam Idris for ₦${item.price.toLocaleString()}.`,
            ...player.logHistory.slice(0, 24),
          ],
        },
      });
      setTimeout(() => get().syncToCloud(), 200);
      return {
        ok: true,
        msg: item.apply ? `Purchased & equipped ${item.name}!` : `Unlocked ${item.name}!`,
      };
    }
    if (item.apply) {
      sound.playWalaahTap();
      set({
        outfit: { ...outfit, ...item.apply },
        outfitRevision: outfitRevision + 1,
      });
      setTimeout(() => get().syncToCloud(), 200);
      return { ok: true, msg: `Equipped ${item.name}.` };
    }
    return { ok: true, msg: `You already own ${item.name}.` };
  },

  rentOrBuyHousing: (tierId, mode) => {
    const prop = HOUSING_TIERS.find((h) => h.id === tierId);
    if (!prop) return { ok: false, msg: 'Housing property not found.' };
    const { player, housing } = get();

    if (tierId === 'ruwaq') {
      set({
        housing: { ...housing, tier: 'ruwaq', ownership: 'boarding', rentDueInDays: 0 },
        player: {
          ...player,
          logHistory: ['Moved back into Ruwaq Madrasah Boarding House.', ...player.logHistory.slice(0, 24)],
        },
      });
      setTimeout(() => get().syncToCloud(), 200);
      return { ok: true, msg: 'Moved into Ruwaq Boarding House (Free lodging).' };
    }

    const cost = mode === 'buy' ? (prop.buyPrice ?? 0) : prop.rentPrice;
    if (mode === 'buy' && !prop.buyPrice) {
      return { ok: false, msg: 'This property cannot be purchased outright.' };
    }
    if (player.stats.naira < cost) {
      sound.playPasan();
      return {
        ok: false,
        msg: `Insufficient funds! You need ₦${cost.toLocaleString()} to ${mode} ${prop.name}.`,
      };
    }

    sound.playCoin();
    const barakahGain = mode === 'buy' ? 12 : 5;
    set({
      housing: {
        ...housing,
        tier: tierId,
        ownership: mode === 'buy' ? 'owned' : 'rented',
        rentDueInDays: mode === 'buy' ? 0 : 7,
      },
      player: {
        ...player,
        stats: {
          ...player.stats,
          naira: player.stats.naira - cost,
          barakah: clamp(player.stats.barakah + barakahGain),
          energy: 100,
        },
        logHistory: [
          mode === 'buy'
            ? `Alhamdulillah! Purchased ${prop.name} outright for ₦${cost.toLocaleString()} (+${barakahGain} Barakah)!`
            : `Rented ${prop.name} for ₦${cost.toLocaleString()} (7-day lease, +${barakahGain} Barakah).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return {
      ok: true,
      msg:
        mode === 'buy'
          ? `Masha'Allah! You are now the proud owner of ${prop.name}!`
          : `Keys collected! You moved into ${prop.name}.`,
    };
  },

  payRent: () => {
    const { housing, player } = get();
    if (housing.ownership !== 'rented') {
      return { ok: false, msg: 'You do not have an active rental lease to renew.' };
    }
    const prop = HOUSING_TIERS.find((h) => h.id === housing.tier);
    if (!prop) return { ok: false, msg: 'Property not found.' };
    if (player.stats.naira < prop.rentPrice) {
      sound.playPasan();
      return {
        ok: false,
        msg: `You need ₦${prop.rentPrice.toLocaleString()} to extend your rent for ${prop.name}.`,
      };
    }
    sound.playCoin();
    set({
      housing: {
        ...housing,
        rentDueInDays: housing.rentDueInDays + 7,
      },
      player: {
        ...player,
        stats: {
          ...player.stats,
          naira: player.stats.naira - prop.rentPrice,
          barakah: clamp(player.stats.barakah + 2),
        },
        logHistory: [
          `Paid ₦${prop.rentPrice.toLocaleString()} rent renewal for ${prop.name} (+7 days).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return { ok: true, msg: `Rent renewed! Lease extended to ${housing.rentDueInDays + 7} days.` };
  },

  buyLifestyleAsset: (assetId) => {
    const asset = LIFESTYLE_ASSETS.find((a) => a.id === assetId);
    if (!asset) return { ok: false, msg: 'Asset not found.' };
    const { housing, player } = get();
    if (housing.upgrades.includes(assetId)) {
      return { ok: false, msg: `You already own ${asset.name}.` };
    }
    if (player.stats.naira < asset.price) {
      sound.playPasan();
      return {
        ok: false,
        msg: `You need ₦${asset.price.toLocaleString()} to acquire ${asset.name}.`,
      };
    }
    sound.playCoin();
    const nextUpgrades = [...housing.upgrades, assetId];
    set({
      housing: {
        ...housing,
        upgrades: nextUpgrades,
      },
      player: {
        ...player,
        stats: {
          ...player.stats,
          naira: player.stats.naira - asset.price,
          energy: clamp(player.stats.energy + (asset.energyBonus || 0)),
          ilm: clamp(player.stats.ilm + (asset.ilmBonus || 0)),
          barakah: clamp(player.stats.barakah + (asset.barakahBonus || 3)),
        },
         inventory: [
          ...player.inventory,
          {
            id: asset.id,
            name: asset.name,
            category: 'asset',
            icon: asset.icon,
            description: asset.description,
            effectDescription: asset.benefitLabel,
            price: asset.price,
          },
        ],
        logHistory: [
          `Acquired ${asset.name} for ₦${asset.price.toLocaleString()} (${asset.benefitLabel}).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return { ok: true, msg: `Acquired ${asset.name}! ${asset.benefitLabel}` };
  },

  completeDailyClassroomLesson: (subject, topicTitle, correct, total) => {
    const { player, education, housing } = get();
    const today = getTodayDateKey();
    const key = `${today}:${subject}`;
    const alreadyDoneToday = education.completedDailyKeys.includes(key);

    // Calculate bonuses from housing & study assets
    const prop = HOUSING_TIERS.find((h) => h.id === housing.tier) ?? HOUSING_TIERS[0];
    const hasDesk = housing.upgrades.includes('asset_desk');
    const hasMaktabah = housing.upgrades.includes('asset_maktabah');
    const extraIlm = (hasDesk ? 2 : 0) + (hasMaktabah ? 4 : 0);

    const baseIlm = Math.max(2, correct * 3 + extraIlm);
    const ilmGain = alreadyDoneToday
      ? Math.max(1, Math.round(correct * 1.5))
      : Math.round(baseIlm * (1 + prop.ilmBonusPct / 100));

    const stipend = alreadyDoneToday ? correct * 100 : 400 + correct * 250;
    const isNewStudyDay = education.lastStudyDate !== today;
    const nextStreak = isNewStudyDay ? player.streakDays + 1 : player.streakDays;

    const currentMastery = education.subjectMastery[subject] ?? 15;
    const nextMastery = Math.min(100, currentMastery + (alreadyDoneToday ? 3 : 8 + correct * 2));

    sound.playTakbeer();
    const nextIlmStat = clamp(player.stats.ilm + ilmGain);

    set({
      education: {
        completedDailyKeys: alreadyDoneToday
          ? education.completedDailyKeys
          : [...education.completedDailyKeys, key],
        lastStudyDate: today,
        totalLessonsCompleted: education.totalLessonsCompleted + 1,
        subjectMastery: {
          ...education.subjectMastery,
          [subject]: nextMastery,
        },
      },
      player: {
        ...player,
        stage: stageFor(player.age, nextIlmStat),
        streakDays: nextStreak,
        stats: {
          ...player.stats,
          ilm: nextIlmStat,
          taqwa: clamp(player.stats.taqwa + 4),
          barakah: clamp(player.stats.barakah + (correct === total ? 6 : 3)),
          naira: player.stats.naira + stipend,
        },
        logHistory: [
          `Completed Classroom Lesson "${topicTitle}" (${correct}/${total}) — Earned +${ilmGain} Ilm & ₦${stipend.toLocaleString()} scholarship stipend!`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return { stipend, ilmGain, alreadyDoneToday };
  },

  setLearnerTier: (tier) => {
    const { education } = get();
    set({
      education: {
        ...education,
        learnerTier: tier,
      },
    });
    triggerAutoSave();
  },

  getBusFare: (to) => {
    const base = LOC_META[to].fare;
    const { housing } = get();
    if (housing.upgrades.includes('asset_okada')) return 0;
    if (housing.upgrades.includes('asset_bicycle')) return Math.round(base * 0.5);
    return base;
  },

  startRide: (to) => {
    const { location, player, ride } = get();
    if (ride) return { ok: false, msg: 'Already in transit!' };
    if (to === location) return { ok: false, msg: 'You are already here.' };
    const meta = LOC_META[to];
    const fare = get().getBusFare(to);
    if (player.stats.naira < fare) {
      sound.playPasan();
      return { ok: false, msg: `Conductor: "Enter with your change o! Fare is ₦${fare}."` };
    }
    if (fare > 0) sound.playCoin();
    else sound.playWalaahTap();
    set({
      activity: null,
      activeTab: 'compound',
      ride: { from: location, to, label: meta.name, progress: 0 },
      player: {
        ...player,
        stats: { ...player.stats, naira: player.stats.naira - fare },
        logHistory: [
          fare === 0
            ? `Rode your personal Boxer Motorcycle to ${meta.name} (₦0 fare!).`
            : `Boarded transit heading to ${meta.name} (-₦${fare}).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    return { ok: true, msg: `Heading to ${meta.name}...` };
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
    const tip = hot ? 500 : 200;
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

  performSunnahWudu: () => {
    sound.playWaterWash();
    const { player } = get();
    set({
      player: {
        ...player,
        stats: {
          ...player.stats,
          energy: clamp(player.stats.energy + 12),
          taqwa: clamp(player.stats.taqwa + 5),
          barakah: clamp(player.stats.barakah + 3),
        },
        logHistory: [
          'Performed fresh Sunnah Wudu at the compound well (+12 Energy, +5 Taqwa, +3 Barakah).',
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
  },

  triggerRally: (prayerName) => {
    set({ lastAdhanPrayer: prayerName, rally: Date.now() });
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    sound.setMuted(nextMuted);
    if (!nextMuted) sound.startBgNasheed();
    set({ isMuted: nextMuted });
  },

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
    const newLogs = [choice.consequences.logMessage, ...player.logHistory.slice(0, 24)];

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
    setTimeout(() => get().syncToCloud(), 200);
  },

  restAtHome: () => {
    const { player, housing } = get();
    const prop = HOUSING_TIERS.find((h) => h.id === housing.tier) ?? HOUSING_TIERS[0];

    // Calculate bonus energy & passive income from lifestyle upgrades
    let bonusEnergy = 0;
    let passiveIncome = prop.dailyPassiveIncome;
    housing.upgrades.forEach((id) => {
      const a = LIFESTYLE_ASSETS.find((x) => x.id === id);
      if (a?.energyBonus) bonusEnergy += a.energyBonus;
      if (a?.dailyPassiveNaira) passiveIncome += a.dailyPassiveNaira;
    });

    const totalEnergyRestored = Math.min(100, prop.energyRecovery + bonusEnergy);
    const nextEnergy = clamp(player.stats.energy + totalEnergyRestored);

    // Handle rental countdown
    let nextHousing = { ...housing };
    let rentWarning = '';
    if (housing.ownership === 'rented') {
      if (housing.rentDueInDays <= 1) {
        // Auto-renew if affordable, else move back to Ruwaq
        if (player.stats.naira + passiveIncome >= prop.rentPrice) {
          passiveIncome -= prop.rentPrice;
          nextHousing.rentDueInDays = 7;
          rentWarning = ` Auto-renewed ${prop.name} rent (-₦${prop.rentPrice.toLocaleString()}).`;
        } else {
          nextHousing = {
            ...housing,
            tier: 'ruwaq',
            ownership: 'boarding',
            rentDueInDays: 0,
          };
          rentWarning = ' Rent expired and wallet was low — returned to Ruwaq Boarding Dorm.';
        }
      } else {
        nextHousing.rentDueInDays = housing.rentDueInDays - 1;
      }
    }

    sound.playTakbeer();
    const incomeNote =
      passiveIncome > 0
        ? ` +₦${passiveIncome.toLocaleString()} passive income.`
        : '';

    set({
      housing: nextHousing,
      player: {
        ...player,
        stats: {
          ...player.stats,
          energy: nextEnergy,
          naira: Math.max(0, player.stats.naira + passiveIncome),
        },
        streakDays: player.streakDays + 1,
        logHistory: [
          `Rested at ${prop.name} (+${totalEnergyRestored} Energy).${incomeNote}${rentWarning}`,
          ...player.logHistory.slice(0, 24),
        ],
      },
      currentEvent: null,
    });
    setTimeout(() => get().syncToCloud(), 200);
    return {
      ok: true,
      msg: `Rested at ${prop.name} (+${totalEnergyRestored} Energy).${incomeNote}${rentWarning}`,
    };
  },

  nextDay: () => {
    get().restAtHome();
  },

  prayInRoom: () => {
    sound.playTakbeer();
    const { player, housing } = get();
    const prop = HOUSING_TIERS.find((h) => h.id === housing.tier) ?? HOUSING_TIERS[0];
    const taqwaGain = housing.tier === 'personal_villa' ? 12 : housing.tier === 'mini_flat' ? 10 : 8;
    const barakahGain = housing.tier === 'personal_villa' ? 8 : 5;
    set({
      player: {
        ...player,
        stats: {
          ...player.stats,
          taqwa: clamp(player.stats.taqwa + taqwaGain),
          barakah: clamp(player.stats.barakah + barakahGain),
          energy: clamp(player.stats.energy + 8),
        },
        logHistory: [
          `Prayed 2 Raka'at Nafl & made heartfelt Dua on the Sajjadah in ${prop.name} (+${taqwaGain} Taqwa, +${barakahGain} Barakah, +8 Energy).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return `Masha'Allah! You prayed 2 Raka'at Nafl on your Sajjadah in ${prop.name} (+${taqwaGain} Taqwa, +${barakahGain} Barakah, +8 Energy).`;
  },

  studyAtDesk: () => {
    sound.playWalaahTap();
    const { player, housing } = get();
    if (player.stats.energy < 8) {
      sound.playPasan();
      return 'You are too tired to revise! Sleep on your bed/mat first to restore Energy.';
    }
    const hasDesk = housing.upgrades.includes('asset_desk');
    const hasMaktabah = housing.upgrades.includes('asset_maktabah');
    const hasSolar = housing.upgrades.includes('asset_solar');
    const ilmGain = 4 + (hasDesk ? 2 : 0) + (hasMaktabah ? 4 : 0) + (hasSolar ? 2 : 0);
    const nextIlm = clamp(player.stats.ilm + ilmGain);
    set({
      player: {
        ...player,
        stage: stageFor(player.age, nextIlm),
        stats: {
          ...player.stats,
          ilm: nextIlm,
          taqwa: clamp(player.stats.taqwa + 3),
          energy: clamp(player.stats.energy - 6),
        },
        logHistory: [
          `Revised Arabic & Fiqh notes at your personal study desk (+${ilmGain} Ilm, +3 Taqwa, -6 Energy).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
    return `Revised your books at the study desk! Earned +${ilmGain} Ilm & +3 Taqwa (-6 Energy).`;
  },

  sendSalaamToPeer: (peer) => {
    const { greetedPeerIds, player, authUser } = get();
    if (greetedPeerIds.includes(peer.uid)) {
      return { ok: false, msg: `You already exchanged Salaam with ${peer.name} recently!` };
    }
    sound.playTakbeer();

    // Broadcast live salaam interaction to Firestore for the recipient
    sendPeerInteractionToCloud({
      fromUid: authUser?.uid || player.id,
      fromName: player.name,
      toUid: peer.uid,
      type: 'salaam',
      message: `Assalamu Alaykum! ${player.name} sent you a warm greeting and Dua of Barakah! 🤲`,
      createdAt: Date.now(),
    });

    set({
      greetedPeerIds: [...greetedPeerIds, peer.uid],
      player: {
        ...player,
        stats: {
          ...player.stats,
          taqwa: clamp(player.stats.taqwa + 3),
          barakah: clamp(player.stats.barakah + 4),
        },
        logHistory: [
          `Sent Salaam & Dua of Barakah to online scholar ${peer.name} (+3 Taqwa, +4 Barakah).`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    return {
      ok: true,
      msg: `Wa alaykumus-salam! ${peer.name} received your greeting with a warm Dua (+3 Taqwa, +4 Barakah)!`,
    };
  },

  setActiveMatchRoom: (activeMatchRoom) => set({ activeMatchRoom }),

  acceptIncomingChallenge: (alert) => {
    const { player, authUser } = get();
    const myUid = authUser?.uid || player.id;
    if (alert.roomId) {
      const room: MultiplayerMatchRoom = {
        id: alert.roomId,
        gameType: (alert.gameType as any) || 'ayo',
        player1Uid: alert.fromUid || 'opponent',
        player1Name: alert.fromName || 'Classmate',
        player2Uid: myUid,
        player2Name: player.name,
        turn: 'player1',
        state: {},
        wager: 1000,
        status: 'active',
        lastMoveAt: Date.now(),
      };
      set({ activeMatchRoom: room });
    }
    if (alert.gameType === 'ayo') {
      set({ activity: 'ayo', activeTab: 'compound' });
    } else if (alert.gameType === 'tenten') {
      set({ activity: 'tenten', activeTab: 'compound' });
    } else if (alert.gameType === 'football') {
      set({ activity: 'football', activeTab: 'compound' });
    } else {
      set({ activeTab: 'classroom' });
    }
  },

  organizeGameWithPeer: (peer, gameType, wager) => {
    const { player, authUser, challenges } = get();
    const matchWager = wager || 1000;
    if (player.stats.naira < matchWager) {
      sound.playPasan();
      return { ok: false, msg: `You need at least ₦${matchWager.toLocaleString()} to put up this match prize.` };
    }
    sound.playCoin();

    const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const initialAyoState = {
      board: Array(12).fill(4),
      you: 0,
      ai: 0,
      turn: 'player1',
      moves: 0,
      msg: `Match started! ${player.name} goes first.`,
      over: null,
    };

    const initialTenTenState = {
      you: 0,
      her: 0,
      roundNo: 0,
      p1Pick: null,
      p2Pick: null,
      history: [],
      msg: `Match started! First to 5 points wins.`,
      over: null,
    };

    const matchRoom: MultiplayerMatchRoom = {
      id: roomId,
      gameType,
      player1Uid: authUser?.uid || player.id,
      player1Name: player.name,
      player2Uid: peer.uid,
      player2Name: peer.name,
      turn: 'player1',
      state: gameType === 'ayo' ? initialAyoState : initialTenTenState,
      wager: matchWager,
      status: 'active',
      lastMoveAt: Date.now(),
    };

    createOrJoinMatchRoom(matchRoom);
    set({ activeMatchRoom: matchRoom });

    const newChallenge: Omit<GameChallenge, 'id'> = {
      fromUid: authUser?.uid || player.id,
      fromName: player.name,
      toUid: peer.uid,
      toName: peer.name,
      gameType,
      wager: matchWager,
      status: 'accepted',
      createdAt: Date.now(),
    };

    sendGameChallengeToCloud(newChallenge);
    sendPeerInteractionToCloud({
      fromUid: authUser?.uid || player.id,
      fromName: player.name,
      toUid: peer.uid,
      type: 'duel_invite',
      gameType,
      roomId,
      wager: matchWager,
      message: `⚔️ ${player.name} challenged you to a ${gameType.replace('_', ' ')} (Prize: ₦${matchWager.toLocaleString()})!`,
      createdAt: Date.now(),
    });

    const localChallenge: GameChallenge = {
      ...newChallenge,
      id: 'match_' + Date.now(),
    };
    set({ challenges: [localChallenge, ...challenges] });

    // Launch the selected interactive match immediately so players can play right away!
    if (gameType === 'ayo') {
      set({ activity: 'ayo', activeTab: 'compound' });
    } else if (gameType === 'football') {
      set({ activity: 'football', activeTab: 'compound' });
    } else if (gameType === 'tenten') {
      set({ activity: 'tenten', activeTab: 'compound' });
    } else {
      set({ activeTab: 'classroom' });
    }

    return {
      ok: true,
      msg: `Match organized against ${peer.name}! Entering ${gameType.replace('_', ' ')} arena...`,
    };
  },

  submitDuelResult: (challengeId, score) => {
    const { player, authUser, challenges } = get();
    const myUid = authUser?.uid || player.id;
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    const isChallenger = challenge.fromUid === myUid;
    const updates: Partial<GameChallenge> = isChallenger
      ? { fromScore: score }
      : { toScore: score };

    const opponentScore = isChallenger ? challenge.toScore : challenge.fromScore;

    if (opponentScore !== undefined) {
      // Both completed their tests! Determine winner
      const iWon = score > opponentScore;
      const tie = score === opponentScore;
      const winnerUid = tie ? undefined : iWon ? myUid : (isChallenger ? challenge.toUid : challenge.fromUid);

      updates.status = 'completed';
      updates.winnerUid = winnerUid;

      const payout = 1000; // Payout set to ₦1,000 as configured

      if (iWon) {
        sound.playCoin();
        const nextNaira = player.stats.naira + payout;
        set({
          player: {
            ...player,
            stats: {
              ...player.stats,
              naira: nextNaira,
              ilm: clamp(player.stats.ilm + 10),
              barakah: clamp(player.stats.barakah + 8),
            },
            logHistory: [
              `🏆 Won Classroom Duel against ${isChallenger ? challenge.toName : challenge.fromName}! Scored ${score} vs ${opponentScore}. Claimed ₦${payout.toLocaleString()} prize pot!`,
              ...player.logHistory.slice(0, 24),
            ],
          },
        });
        publishMinbarPostToCloud({
          authorName: player.name,
          authorStage: player.stage,
          text: `🏆 Alhamdulillah! Just won a fierce classroom speed-duel against ${isChallenger ? challenge.toName : challenge.fromName} (${score} vs ${opponentScore}) and claimed the ₦${payout.toLocaleString()} prize pot! 📿✨`,
          likes: 2,
          takbeers: 5,
          timestamp: Date.now(),
        });
      } else if (!tie) {
        sound.playPasan();
        set({
          player: {
            ...player,
            logHistory: [
              `Lost Classroom Duel against ${isChallenger ? challenge.toName : challenge.fromName} (${score} vs ${opponentScore}). Keep studying!`,
              ...player.logHistory.slice(0, 24),
            ],
          },
        });
      }
    }

    updateGameChallengeInCloud(challengeId, updates);
    triggerAutoSave();
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
          naira: player.stats.naira + 600,
        },
        logHistory: [
          `Answered the Musabaqah question correctly! Received ₦600 and +${points} Ilm!`,
          ...player.logHistory.slice(0, 24),
        ],
      },
    });
    setTimeout(() => get().syncToCloud(), 200);
  },

  addMinbarPost: (text: string, audioUrl?: string, authorName?: string) => {
    const { minbarPosts, player, authUser } = get();
    const newPost: MinbarPost = {
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      authorId: authUser?.uid || player.id,
      authorName: authorName || player.name,
      authorStage: player.stage,
      text,
      audioUrl,
      likes: 1,
      takbeers: 1,
      timestamp: Date.now(),
      comments: [],
    };
    sound.playTakbeer();
    set({ minbarPosts: [newPost, ...minbarPosts] });
    publishMinbarPostToCloud({
      authorId: newPost.authorId,
      authorName: newPost.authorName,
      authorStage: newPost.authorStage,
      text: newPost.text,
      audioUrl: newPost.audioUrl,
      likes: 1,
      takbeers: 1,
      timestamp: newPost.timestamp,
      comments: [],
    });
  },

  editMinbarPost: (postId: string, text: string) => {
    const { minbarPosts } = get();
    const updated = minbarPosts.map((p) => (p.id === postId ? { ...p, text } : p));
    set({ minbarPosts: updated });
    updateMinbarPostInCloud(postId, { text });
  },

  deleteMinbarPost: (postId: string) => {
    const { minbarPosts } = get();
    const updated = minbarPosts.filter((p) => p.id !== postId);
    set({ minbarPosts: updated });
    deleteMinbarPostFromCloud(postId);
  },

  reactToMinbarPost: (postId: string, reaction: 'takbeer' | 'like') => {
    const { minbarPosts } = get();
    if (reaction === 'takbeer') sound.playTakbeer();
    else sound.playCoin();

    const updated = minbarPosts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          takbeers: reaction === 'takbeer' ? p.takbeers + 1 : p.takbeers,
          likes: reaction === 'like' ? p.likes + 1 : p.likes,
        };
      }
      return p;
    });
    set({ minbarPosts: updated });
    incrementMinbarReaction(postId, reaction === 'takbeer' ? 'takbeers' : 'likes');
  },

  commentOnMinbarPost: (postId: string, text: string) => {
    const { minbarPosts, player, authUser } = get();
    sound.playWalaahTap();
    const comment: MinbarComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      authorId: authUser?.uid || player.id,
      authorName: player.name,
      authorStage: player.stage,
      text,
      timestamp: Date.now(),
    };
    const updated = minbarPosts.map((p) => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), comment],
        };
      }
      return p;
    });
    set({ minbarPosts: updated });
    addCommentToMinbarPost(postId, comment);
  },

  resetGame: () => {
    set({
      player: {
        ...INITIAL_PLAYER,
        id: 'scholar_' + Math.random().toString(36).substring(2, 9),
        stats: { ...INITIAL_STATS, naira: 2000 },
      },
      housing: { ...INITIAL_HOUSING },
      education: { ...INITIAL_EDUCATION },
      currentEvent: null,
      activeTab: 'compound',
      activity: null,
      location: 'school',
      ride: null,
      errand: null,
      owned: [...DEFAULT_OWNED],
      outfit: { ...DEFAULT_OUTFIT },
      outfitRevision: get().outfitRevision + 1,
    });
  },
}),
    {
      name: 'ilekewu_scholar_save_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        player: state.player,
        housing: state.housing,
        education: state.education,
        owned: state.owned,
        outfit: state.outfit,
        outfitRevision: state.outfitRevision,
        authUser: state.authUser,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
