import { Outfit } from '@/types/game';

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

export const SHOP_ITEMS: ShopItem[] = [
  // ---- Books: each one unlocks real lessons ----
  { id: 'qaidah', kind: 'book', name: "Qa'idah Baghdadiyyah", icon: '📘', price: 0, desc: 'Letters & vowel marks. Unlocks the Huruf drill.' },
  { id: 'juz_amma', kind: 'book', name: "Juz 'Amma", icon: '📗', price: 1000, desc: 'Short surahs: Al-Ikhlas, Al-Falaq, An-Nas. Unlocks more Hifz verses.' },
  { id: 'akhdari', kind: 'book', name: 'Matn Al-Akhdari', icon: '📙', price: 2500, desc: 'Maliki fiqh of worship. Unlocks Fiqh cases (sujood sahw & more).' },
  { id: 'ajurrumiyyah', kind: 'book', name: 'Al-Ajurrumiyyah', icon: '📕', price: 5000, desc: "Arabic grammar. Unlocks the Nahw sentence class." },
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
  { id: 'prop_slate', kind: 'prop', name: 'Wooden Walaah Slate', icon: '🪵', price: 0, desc: 'Your trusty slate.', apply: { prop: 'slate' } },
  { id: 'prop_tesbih', kind: 'prop', name: 'Tesbih Beads', icon: '📿', price: 300, desc: 'Count your dhikr as you walk.', apply: { prop: 'tesbih' } },
  { id: 'prop_staff', kind: 'prop', name: "Scholar's Staff", icon: '🦯', price: 1500, desc: 'Walk like a Sheikh.', apply: { prop: 'cane' } },
];

export const DEFAULT_OWNED = ['qaidah', 'robe_white', 'cap_kofia', 'hijab_white', 'prop_slate'];

export const DEFAULT_OUTFIT: Outfit = {
  robe: 0xffffff,
  trim: 0xf5b335,
  cap: 'kofia',
  capColor: 0xffffff,
  prop: 'slate',
};

export const BOOK_NAMES: Record<string, string> = Object.fromEntries(
  SHOP_ITEMS.filter((i) => i.kind === 'book').map((i) => [i.id, i.name]),
);

