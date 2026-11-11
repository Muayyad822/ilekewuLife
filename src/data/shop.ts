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
  { id: 'book_qawaid', kind: 'book', name: "Qawa'id Al-Arba'a & Usool ath-Thalatha", icon: '📜', price: 1800, desc: 'Foundations of Tawheed & Islamic belief. Unlocks street Da\'wah dialogues.' },
  { id: 'book_bayquniyyah', kind: 'book', name: 'Matn Al-Bayquniyyah', icon: '📝', price: 3500, desc: 'Hadith terminology & grading sciences (Sahih, Hasan, Da\'if).' },
  { id: 'book_jazariyyah', kind: 'book', name: 'Matn Al-Jazariyyah', icon: '🎙️', price: 4000, desc: 'Classical Tajweed poems on vocal Makharij and articulation points.' },
  { id: 'book_bulugh', kind: 'book', name: 'Bulugh Al-Maram', icon: '📖', price: 8500, desc: 'Evidences of legal rulings. Unlocks advanced Fiqh arbitration.' },
  { id: 'riyad', kind: 'book', name: 'Riyadus-Salihin', icon: '📚', price: 10000, desc: 'Hadith of the righteous. Needed to deliver the Friday Khutbah.' },

  // ---- Robes ----
  { id: 'robe_white', kind: 'robe', name: 'White Jalabiya', icon: '👘', price: 0, desc: 'Clean and starched.', apply: { robe: 0xffffff, trim: 0xf5b335 } },
  { id: 'robe_sky', kind: 'robe', name: 'Sky Blue Kaftan', icon: '🩵', price: 600, desc: 'Cool like harmattan morning.', apply: { robe: 0x7dd3fc, trim: 0x0284c7 } },
  { id: 'robe_emerald', kind: 'robe', name: 'Emerald Jalabiya', icon: '💚', price: 900, desc: 'Madrasah green.', apply: { robe: 0x1b8a64, trim: 0xffd978 } },
  { id: 'robe_agbada', kind: 'robe', name: 'Gold-Trimmed Agbada', icon: '👑', price: 2500, desc: 'For scholars and big occasions.', apply: { robe: 0x1e3a8a, trim: 0xffd700 } },
  { id: 'robe_aso_oke', kind: 'robe', name: 'Buba & Sokoto with Aso-Oke', icon: '✨', price: 3200, desc: 'Embroidered Yoruba celebratory attire. +5 Barakah during Friday Jumu\'ah.', apply: { robe: 0x581c87, trim: 0xfacc15 } },
  { id: 'robe_djellaba', kind: 'robe', name: 'Moroccan Hooded Djellaba', icon: '🧥', price: 4800, desc: 'Heavy wool winter/harmattan robe favored by senior scholars. Warm and stately.', apply: { robe: 0x3f3f46, trim: 0xe4e4e7 } },
  { id: 'hijab_abaya_gold', kind: 'robe', name: 'Gold-Embroidered Abaya', icon: '🧕', price: 2200, desc: 'Modest black Abaya with shimmering gold cuff trim.', gender: 'female', apply: { robe: 0x18181b, trim: 0xfacc15 } },

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
  { id: 'prop_sandals', kind: 'prop', name: "Leather Na'layn Sandals", icon: '🩴', price: 1800, desc: 'Sunnah-inspired leather sandals with durable rubber soles. Extends sprint endurance by 20%.', apply: { prop: 'sandals' } },
  { id: 'prop_attar', kind: 'prop', name: 'Bottled Oud & Musk Attar', icon: '🧪', price: 750, desc: 'Fragrant non-alcoholic perfume. Applies "Scent of Barakah" (+15% respect, +3 Barakah per prayer).', apply: { prop: 'attar' } },
  { id: 'prop_miswak', kind: 'prop', name: 'Olive Wood Miswak & Case', icon: '🌿', price: 350, desc: 'Sunnah tooth-stick. Use daily for +5 Energy and fresh focus before lessons.', apply: { prop: 'miswak' } },
  { id: 'prop_walaha', kind: 'prop', name: 'Traditional Wooden Slate (Walaha)', icon: '🪵', price: 1200, desc: 'West African wooden board with Tadah ink. Doubles calligraphy writing speed.', apply: { prop: 'walaha' } },
  { id: 'prop_qalam', kind: 'prop', name: 'Calligraphy Qalam Reed Pen', icon: '✒️', price: 900, desc: 'Precision reed pen for illuminating Qur\'anic verses and certificates.', apply: { prop: 'qalam' } },
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
    rentPrice: 35000,
    buyPrice: 350000,
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
  // --- Furnishings & Sleep ---
  {
    id: 'asset_rafia_mat',
    name: 'Handwoven Rafia Mat & Janamaz',
    category: 'furnishing',
    icon: '🪵',
    price: 1200,
    description: 'Traditional Ate Eni woven sleeping mat and clean Janamaz for bedside Tahajjud prayer.',
    benefitLabel: '+6 Nightly Energy & Bedside Salah',
    energyBonus: 6,
    barakahBonus: 2,
  },
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
    id: 'asset_poufs',
    name: 'Kano Leather Poufs & Moroccan Cushions',
    category: 'furnishing',
    icon: '🛋️',
    price: 6500,
    description: 'Hand-stitched leather floor cushions for hosting study peers and Muraja\'ah circles.',
    benefitLabel: '+6 Energy & +6 Barakah on hosting peers',
    energyBonus: 6,
    barakahBonus: 6,
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
    id: 'asset_rehal',
    name: 'Hardwood Folding Quran Stand (Rehal)',
    category: 'scholarship',
    icon: '📖',
    price: 2800,
    description: 'Carved rosewood bookstand that elevates the Mushaf with respect during prolonged Hifz revision.',
    benefitLabel: '+2 Bonus Ilm per lesson & +3 Barakah',
    ilmBonus: 2,
    barakahBonus: 3,
  },
  {
    id: 'asset_whiteboard',
    name: 'Wall-Mounted Whiteboard & Markers',
    category: 'scholarship',
    icon: '📋',
    price: 4000,
    description: 'Dry-erase board for diagramming Nahw sentence trees, Sarf verb tables, and Fiqh inheritance charts.',
    benefitLabel: '+3 Bonus Ilm on classroom drills',
    ilmBonus: 3,
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

  // --- Utilities & Home Appliances ---
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
    id: 'asset_adhan_clock',
    name: 'Rechargeable Bluetooth Adhan Clock',
    category: 'utility',
    icon: '⏰',
    price: 5500,
    description: 'Plays melodic Adhan alarms for all 5 daily prayers with Qur\'anic speaker mode.',
    benefitLabel: '+5 Barakah & guaranteed Fajr prompt',
    barakahBonus: 5,
  },
  {
    id: 'asset_generator',
    name: 'Soundproof Tiger "I-Better-Pass-My-Neighbor"',
    category: 'utility',
    icon: '⚙️',
    price: 28000,
    description: 'Sound-damped mini generator supplying quiet power during extended NEPA blackouts.',
    benefitLabel: '+14 Nightly Energy & steady lighting',
    energyBonus: 14,
  },
  {
    id: 'asset_kitchen_cooker',
    name: 'Deep Freezer & Gas Cooker Set',
    category: 'utility',
    icon: '🍳',
    price: 32000,
    description: 'Enables home batch-cooking of Jollof rice, beans, and ewedu so you never study on an empty stomach.',
    benefitLabel: '+15 Energy on rest & self-cooked meals',
    energyBonus: 15,
  },
  {
    id: 'asset_water_pump',
    name: 'Overhead Water Tank & Booster Pump',
    category: 'utility',
    icon: '🚰',
    price: 38000,
    description: 'Pressurized clean borehole water for instantaneous Wudu, bathing, and laundry right at home.',
    benefitLabel: '+5 Barakah & fresh morning hygiene',
    barakahBonus: 5,
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
    id: 'asset_ac',
    name: 'Dual Inverter 1.5HP Air Conditioner',
    category: 'utility',
    icon: '❄️',
    price: 85000,
    description: 'Whisper-quiet climate control completely negating Lagos heatwaves and humidity.',
    benefitLabel: '+25 Nightly Energy Restoration',
    energyBonus: 25,
  },

  // --- Transportation & Fleet Assets ---
  {
    id: 'asset_ferry_pass',
    name: 'Commuter Ferry & Danfo Monthly Pass',
    category: 'transport',
    icon: '🎫',
    price: 8000,
    description: 'Lagos State transit card unlocking 75% bus discount and priority ferry crossings.',
    benefitLabel: '75% Discount on all public transit fares',
    fareDiscountPct: 75,
  },
  {
    id: 'asset_bicycle',
    name: 'Raleigh Scholar Bicycle (Keke)',
    category: 'transport',
    icon: '🚲',
    price: 15000,
    description: 'Pedal smoothly around Ejigbo and cut your Danfo transport expenses in half.',
    benefitLabel: '50% Discount on Danfo + 10.5 m/s mount',
    fareDiscountPct: 50,
  },
  {
    id: 'asset_scooter',
    name: 'Electric Urban Scooter (E-Bike)',
    category: 'transport',
    icon: '🛴',
    price: 42000,
    description: 'Agile electric glide with zero fuel cost. Silent speed through traffic at 12 m/s.',
    benefitLabel: '100% Free Transit + 12.0 m/s electric mount',
    fareDiscountPct: 100,
  },
  {
    id: 'asset_okada',
    name: 'Bajaj Boxer Motorcycle (Commercial Asset)',
    category: 'transport',
    icon: '🏍️',
    price: 68000,
    description: 'Your own motorcycle! Fast 16.5 m/s speed, free transit, and leased out for daily returns.',
    benefitLabel: '100% Free Transit + ₦800/day Passive Income',
    fareDiscountPct: 100,
    dailyPassiveNaira: 800,
  },
  {
    id: 'asset_keke',
    name: 'Bajaj RE Keke Napep (Auto-Rickshaw)',
    category: 'transport',
    icon: '🛺',
    price: 185000,
    description: 'Iconic yellow three-wheeler with weatherproof canopy. Drive yourself or hire out to commercial drivers.',
    benefitLabel: '13.5 m/s Mount + ₦1,800/day Commercial Return',
    fareDiscountPct: 100,
    dailyPassiveNaira: 1800,
  },
  {
    id: 'asset_car',
    name: 'Toyota Corolla ("Lagos Scholar Sedan")',
    category: 'transport',
    icon: '🚗',
    price: 450000,
    description: 'Reliable air-conditioned personal sedan! Cruise the highway at 24 m/s in complete comfort and prestige.',
    benefitLabel: '24.0 m/s Driveable Car + +20 Barakah Prestige',
    fareDiscountPct: 100,
    barakahBonus: 20,
  },
  {
    id: 'asset_danfo_fleet',
    name: 'Commercial Danfo Bus Fleet Route',
    category: 'transport',
    icon: '🚌',
    price: 850000,
    description: 'A licensed yellow LT35 Danfo bus contracted to a driver along the Oshodi-Ejigbo commercial route.',
    benefitLabel: '₦6,000/day Commercial Passive Income',
    dailyPassiveNaira: 6000,
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
