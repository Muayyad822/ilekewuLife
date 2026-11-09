export type LifeStage = 'omo_kewu' | 'arowo_kewu' | 'markaziy' | 'sheikh_agba';

export type LearnerTier = 'starter' | 'standard' | 'advanced';

export type MountVehicle = 'none' | 'bicycle' | 'okada';

export interface PlayerStats {
  ilm: number;             // Islamic knowledge / Arabic fluency (0 - 100)
  taqwa: number;           // Piety & good character (0 - 100)
  energy: number;          // Daily stamina (0 - 100)
  pasanResistance: number; // Cane endurance & resilience (0 - 100)
  naira: number;           // Virtual Nigerian currency ₦
  barakah: number;         // Spiritual reputation & community fame (0 - 100)
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'tool' | 'clothing' | 'book' | 'relic' | 'asset';
  icon: string;
  description: string;
  effectDescription: string;
  price?: number;
}

export interface EventChoice {
  id: string;
  text: string;
  description?: string;
  consequences: {
    statChanges: Partial<PlayerStats>;
    logMessage: string;
    itemReward?: InventoryItem;
  };
  requiredStats?: Partial<PlayerStats>;
}

export interface GameEvent {
  id: string;
  stage: LifeStage | 'all';
  title: string;
  arabicTitle?: string;
  description: string;
  imageUrl?: string;
  category: 'discipline' | 'learning' | 'street' | 'ramadan' | 'walimah' | 'boko_clash';
  choices: EventChoice[];
}

export interface MinbarComment {
  id: string;
  authorId?: string;
  authorName: string;
  authorStage: LifeStage;
  text: string;
  timestamp: number;
}

export interface MinbarPost {
  id: string;
  authorId?: string;
  authorName: string;
  authorStage: LifeStage;
  text: string;
  audioUrl?: string;
  duration?: number;
  likes: number;
  takbeers: number;
  timestamp: number;
  comments?: MinbarComment[];
}

export type HousingTierId = 'ruwaq' | 'shared_room' | 'mini_flat' | 'personal_villa';

export type HousingOwnership = 'boarding' | 'rented' | 'owned';

export interface FurnitureTransform {
  dx: number;  // Offset along X in meters (-4 to +4)
  dz: number;  // Offset along Z in meters (-4 to +4)
  rot: number; // Rotation in radians (0, Math.PI/2, Math.PI, 1.5*Math.PI)
}

export interface PlayerHousing {
  tier: HousingTierId;
  ownership: HousingOwnership;
  rentDueInDays: number;
  upgrades: string[]; // IDs of acquired home/lifestyle assets
  furnitureLayout?: Record<string, FurnitureTransform>;
}

export type SubjectId = 'nahw' | 'fiqh' | 'tajweed' | 'hadith' | 'seerah' | 'adab';

export interface PlayerEducation {
  completedDailyKeys: string[]; // e.g. "2026-11-05:nahw"
  lastStudyDate: string;        // "YYYY-MM-DD"
  totalLessonsCompleted: number;
  subjectMastery: Record<SubjectId, number>; // 0-100 mastery per subject
  learnerTier?: LearnerTier;
  lessonProgress?: Record<string, { crowns: number; box: number; nextDue: string; lastSeen: string }>;
  bestStreak?: number;
  makeupAvailableUntil?: string; // date string YYYY-MM-DD for 24h grace repair
}

export interface PlayerProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  gender: 'male' | 'female';
  stage: LifeStage;
  age: number;
  yearInMadrasah: number;
  stats: PlayerStats;
  hifzJuz: number;
  inventory: InventoryItem[];
  logHistory: string[];
  streakDays: number;
  madrasahName: string;
}

export type Loc = 'school' | 'east' | 'west';

export type ActivityId =
  | 'alfa' | 'ibtida' | 'well'
  | 'hifz' | 'huruf' | 'tutor' | 'wudu' | 'nahw'
  | 'adhan' | 'khutbah' | 'homelesson'
  | 'shop' | 'wardrobe' | 'bus'
  | 'football' | 'tenten' | 'suwe' | 'ayo' | 'skipping' | 'catcher' | 'throw'
  | 'quiz_duel';

export interface Outfit {
  robe: number;
  trim: number;
  cap: 'kofia' | 'turban' | 'hijab' | 'fila' | 'none';
  capColor: number;
  prop: 'book' | 'cane' | 'kettle' | 'tesbih' | 'none';
}

export interface RideInfo {
  from: Loc;
  to: Loc;
  label: string;
  progress: number; // 0..1
}

export interface ErrandState {
  stage: 'fetch' | 'deliver';
  startedAt: number;
}

export interface OnlinePeer {
  uid: string;
  name: string;
  stage: LifeStage;
  madrasahName: string;
  ilm: number;
  hifzJuz: number;
  housingTier: HousingTierId;
  currentTab: string;
  lastSeen: number;
  outfit?: Outfit;
  isLive?: boolean;
}

export interface MultiplayerMatchRoom {
  id: string;
  gameType: 'ayo' | 'tenten' | 'football' | 'quiz_duel' | 'throw';
  player1Uid: string;
  player1Name: string;
  player2Uid: string;
  player2Name: string;
  turn: 'player1' | 'player2';
  state: Record<string, any>; // Synchronized board/game state
  wager?: number;
  winnerUid?: string;
  status: 'active' | 'completed' | 'abandoned';
  lastMoveAt: number;
}

export interface PeerInteraction {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  type: 'salaam' | 'duel_invite' | 'chat_message';
  gameType?: 'quiz_duel' | 'ayo' | 'football' | 'tenten' | 'throw';
  roomId?: string;
  wager?: number;
  message: string;
  createdAt: number;
}

export interface PrivateChatMessage {
  id: string;
  chatId: string;
  senderUid: string;
  senderName: string;
  recipientUid: string;
  recipientName: string;
  text?: string;
  audioUrl?: string;
  duration?: number;
  createdAt: number;
}

export interface GameChallenge {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  gameType: 'quiz_duel' | 'ayo' | 'football' | 'tenten' | 'throw';
  roomId?: string;
  wager: number;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  winnerUid?: string;
  fromScore?: number;
  toScore?: number;
  createdAt: number;
}
