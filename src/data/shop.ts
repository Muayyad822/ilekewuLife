import { HousingTierId, Outfit } from '@/types/game';

export interface ShopItem {
  id: string;
  kind: 'book' | 'robe' | 'cap' | 'prop';
  name: string;
  icon: string;
  price: number;
  desc: string;
  apply?: Partial<Outfit>;
  gender?: 'male' | 'female';
}

export interface HousingProperty {
  id: HousingTierId;
  name: string;
  arabicName: string;
  icon: string;
  subtitle: string;
  description: string;
  rentPrice: number;       // per 7 days (0 for Ruwaq)
  buyPrice: number | null; // null if boarding only
  energyRecovery: number;  // Energy restored on rest
  ilmBonusPct: number;     // Extra study retention
  dailyPassiveIncome: number; // Passive Naira earned per day (e.g. hosting weekend Madrasah at Villa)
  perks: string[];
}

export interface LifestyleAsset {
  id: string;
  name: string;
  category: 'furnishing' | 'transport' | 'utility' | 'scholarship';
  icon: string;
  price: number;
  description: string;
  benefitLabel: string;
  minHousingTier?: HousingTierId;
  energyBonus?: number;
  ilmBonus?: number;
  barakahBonus?: number;
  fareDiscountPct?: number;
  dailyPassiveNaira?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // ---- Books: each one unlocks real lessons ----
  { id: 'qaidah', kind: 'book', name: "Qa'idah Baghdadiyyah", icon: '📘', price: 0, desc: 'Letters & vowel marks. Unlocks the Huruf drill.' },
  { id: 'juz_amma', kind: 'book', name: "Juz 'Amma", icon: '📗', price: 1000, desc: 'Short surahs: Al-Ikhlas, Al-Falaq, An-Nas. Unlocks more Hifz verses.' },
  { id: 'akhdari', kind: 'book', name: 'Matn Al-Akhdari', icon: '📙', price: 2500, desc: 'Maliki fiqh of worship. Unlocks Fiqh cases (sujood sahw & more).' },
  { id: 'ajurrumiyyah', kind: 'book', name: 'Al-Ajurrumiyyah', icon: '📕', price: 5000, desc: 'Arabic grammar. Unlocks the Nahw sentence class.' },
  { id: 'riyad', kind: 'book', name: 'Riyadus-Salihin', icon: '📚', price: 10000, desc: 'Hadith of the righteous. Needed to deliver the Friday Khutbah.' },

  // ---- Robes ----
  { id: 'robe_white', kind: 'robe', name: 'White Jalabiya', icon: '👘', price: 0, desc: 'Clean and starched.', apply: { robe: 0xffffff, trim: 0xf5b335 } },
  { id: 'robe_sky', kind: 'robe', name: 'Sky Blue Kaftan', icon: '🩵', price: 600, desc: 'Cool like harmattan morning.', apply: { robe: 0x7dd3fc, trim: 0x0284c7 } },
  { id: 'robe_emerald', kind: 'robe', name: 'Emerald Jalabiya', icon: '💚', price: 900, desc: 'Madrasah green.', apply: { robe: 0x1b8a64, trim: 0xffd978 } },
  { id: 'robe_agbada', kind: 'robe', name: 'Gold-Trimmed Agbada', icon: '👑', price: 2500, desc: 'For scholars and big occasions.', apply: { robe: 0x1e3a8a, trim: 0xffd700 } },

  // ---- Caps ----
  { id: 'cap_kofia', kind: 'cap', name: 'White Kofia', icon: '🧢', price: 0, desc: 'The classic prayer cap.', gender: 'male', apply: { cap: 'kofia', capColor: 0xffffff } },
  { id: 'cap_fila', kind: 'cap', name: 'Red Fila', icon: '🎩', price: 400, desc: 'Yoruba fila, worn with swagger.', gender: 'male', apply: { cap: 'fila', capColor: 0xb71c1c } },
  { id: 'cap_turban', kind: 'cap', name: 'White Turban', icon: '🕌', price: 1200, desc: 'The look of a seasoned Alfa.', gender: 'male', apply: { cap: 'turban', capColor: 0xffffff } },
  { id: 'hijab_white', kind: 'cap', name: 'White Hijab', icon: '🧕', price: 0, desc: 'Simple and graceful.', gender: 'female', apply: { cap: 'hijab', capColor: 0xffffff } },
  { id: 'hijab_rose', kind: 'cap', name: 'Rose Hijab', icon: '🌸', price: 300, desc: 'Soft rose khimar.', gender: 'female', apply: { cap: 'hijab', capColor: 0xf8bbd0 } },
  { id: 'hijab_royal', kind: 'cap', name: 'Royal Purple Hijab', icon: '💜', price: 600, desc: 'Deep royal purple.', gender: 'female', apply: { cap: 'hijab', capColor: 0x6a1b9a } },

  // ---- Carry items ----
  { id: 'prop_book', kind: 'prop', name: 'Leather-Bound Mushaf', icon: '📖', price: 0, desc: 'Your cherished personal copy of the Quran & notebook.', apply: { prop: 'book' } },
  { id: 'prop_tesbih', kind: 'prop', name: 'Tesbih Beads', icon: '📿', price: 300, desc: 'Count your dhikr as you walk.', apply: { prop: 'tesbih' } },
  { id: 'prop_staff', kind: 'prop', name: "Scholar's Staff", icon: '🦯', price: 1500, desc: 'Walk like a Sheikh.', apply: { prop: 'cane' } },
];

export const HOUSING_TIERS: HousingProperty[] = [
  {
    id: 'ruwaq',
    name: 'Ruwaq (Madrasah Boarding Dorm)',
    arabicName: 'رِوَاقُ الْمَدْرَسَةِ',
    icon: '🛖',
    subtitle: 'Free Student Boarding Quarters · MAHD IQRA Compound',
    description:
      'Where every dedicated student begins. You sleep on a woven mat alongside Moruf, Bilal, and Abdul with your metal trunk box tucked by the wall. Free lodging, close to the mosque for Fajr, though subject to strict curfew and senior monitor inspections.',
    rentPrice: 0,
    buyPrice: null,
    energyRecovery: 28,
    ilmBonusPct: 0,
    dailyPassiveIncome: 0,
    perks: [
      '₦0 Rent — Free Madrasah boarding',
      '+28 Energy restored each night',
      'Wake up right inside the compound for Fajr & morning Hifz',
    ],
  },
  {
    id: 'shared_room',
    name: 'Off-Campus Student Room (Ejigbo)',
    arabicName: 'غُرْفَةُ الطَّالِبِ',
    icon: '🚪',
    subtitle: 'Single Room ("Face-Me-I-Face-You" Tenement) · 3 mins from Madrasah',
    description:
      'Your first taste of independence! A private room off Ejigbo Road with your own padlock, quiet study corner, and space for a proper foam mattress and reading table.',
    rentPrice: 3500,
    buyPrice: 28000,
    energyRecovery: 48,
    ilmBonusPct: 12,
    dailyPassiveIncome: 0,
    perks: [
      '+48 Energy restored each night',
      '+12% bonus Ilm retention from quiet study nights',
      'No dormitory lights-out curfew; can install room furniture',
    ],
  },
  {
    id: 'mini_flat',
    name: 'Self-Contained Mini-Flat (Oke-Afa)',
    arabicName: 'شَقَّةُ الْمُعَلِّمِ',
    icon: '🏢',
    subtitle: 'Modern 1-Bedroom Apartment · Tiled Floor & Private Bathroom',
    description:
      'Befitting a rising Markaziy or senior Ustadh. Features a sitting room to host fellow scholars for Muraaja’ah, an indoor kitchen, and steady borehole water.',
    rentPrice: 12000,
    buyPrice: 95000,
    energyRecovery: 72,
    ilmBonusPct: 25,
    dailyPassiveIncome: 400,
    perks: [
      '+72 Energy restored each night',
      '+25% bonus Ilm retention & +4 Barakah on move-in',
      'Host private evening study circle (+₦400/day stipend)',
    ],
  },
  {
    id: 'personal_villa',
    name: "Sheikh's Personal House (Ile Oniduro)",
    arabicName: 'دَارُ الشَّيْخِ وَالْمَرْكَزُ',
    icon: '🏡',
    subtitle: 'Owned 4-Bedroom Duplex & Private Courtyard · Isolo / Ejigbo',
    description:
      'The pinnacle of hard work and Barakah! Your own permanent family home with a shaded courtyard where neighborhood children attend afternoon Madrasah under your patronage.',
    rentPrice: 0,
    buyPrice: 250000,
    energyRecovery: 100,
    ilmBonusPct: 40,
    dailyPassiveIncome: 2500,
    perks: [
      '100% Full Energy restoration every single night',
      'Permanent ownership — never pay rent again',
      'Earned +₦2,500 passive daily tuition from your courtyard Madrasah',
    ],
  },
];

export const LIFESTYLE_ASSETS: LifestyleAsset[] = [
  {
    id: 'asset_mattress',
    name: 'Orthopedic Foam Mattress & Net',
    category: 'furnishing',
    icon: '🛏️',
    price: 2500,
    description: 'Upgrade from a hard woven floor mat to a thick Mouka foam mattress with a treated mosquito net.',
    benefitLabel: '+12 Nightly Energy Recovery',
    energyBonus: 12,
  },
  {
    id: 'asset_desk',
    name: 'Mahogany Study Desk & Lantern',
    category: 'furnishing',
    icon: '🪑',
    price: 4200,
    description: 'A sturdy wooden reading table with a rechargeable LED lantern so NEPA blackouts never stop your night revision.',
    benefitLabel: '+2 Bonus Ilm on Daily Classroom Tests',
    ilmBonus: 2,
  },
  {
    id: 'asset_fan',
    name: 'Standing OX Fan & Stabilizer',
    category: 'utility',
    icon: '🪭',
    price: 7500,
    description: 'High-velocity standing fan that keeps your room cool through Lagos heat.',
    benefitLabel: '+10 Nightly Energy & +4 Barakah',
    energyBonus: 10,
    barakahBonus: 4,
  },
  {
    id: 'asset_bicycle',
    name: 'Raleigh Scholar Bicycle (Keke)',
    category: 'transport',
    icon: '🚲',
    price: 15000,
    description: 'Pedal smoothly around Ejigbo and cut your Danfo transport expenses in half.',
    benefitLabel: '50% Discount on all Danfo Bus Fares',
    fareDiscountPct: 50,
  },
  {
    id: 'asset_maktabah',
    name: 'Private Home Maktabah (Library Shelf)',
    category: 'scholarship',
    icon: '🏛️',
    price: 22000,
    description: 'Floor-to-ceiling wooden bookcase stocked with Tafsirs, Dictionaries (Al-Mu’jam), and Classical Fiqh volumes.',
    benefitLabel: '+4 Bonus Ilm per lesson & +8 Barakah',
    ilmBonus: 4,
    barakahBonus: 8,
  },
  {
    id: 'asset_solar',
    name: 'Solar Panel & Inverter System',
    category: 'utility',
    icon: '☀️',
    price: 45000,
    description: 'Silent 24/7 clean solar electricity — no generator fumes, no darkness during Tahajjud.',
    benefitLabel: '+18 Nightly Energy & +10 Barakah',
    energyBonus: 18,
    barakahBonus: 10,
  },
  {
    id: 'asset_okada',
    name: 'Bajaj Boxer Motorcycle (Commercial Asset)',
    category: 'transport',
    icon: '🏍️',
    price: 68000,
    description: 'Your own motorcycle! Ride free anywhere in Lagos and lease it during morning hours for steady daily income.',
    benefitLabel: '100% Free Transit + ₦800/day Passive Income',
    fareDiscountPct: 100,
    dailyPassiveNaira: 800,
  },
];

export const DEFAULT_OWNED = ['qaidah', 'robe_white', 'cap_kofia', 'hijab_white', 'prop_book'];

export const DEFAULT_OUTFIT: Outfit = {
  robe: 0xffffff,
  trim: 0xf5b335,
  cap: 'kofia',
  capColor: 0xffffff,
  prop: 'book',
};

export const BOOK_NAMES: Record<string, string> = Object.fromEntries(
  SHOP_ITEMS.filter((i) => i.kind === 'book').map((i) => [i.id, i.name]),
);
