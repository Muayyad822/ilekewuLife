export interface Mcq {
  prompt: string;
  promptAr?: string;
  sub?: string;
  options: string[];
  optionsAr?: boolean;
  answer: number;
  explain?: string;
}

export interface OrderItem {
  text: string;
  ar?: string;
}

export const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ===================== HURUF (Qa'idah Baghdadiyyah) =====================
const LETTERS: [string, string][] = [
  ['ب', 'b'], ['ت', 't'], ['ث', 'th'], ['ج', 'j'], ['ح', 'h'], ['خ', 'kh'], ['د', 'd'], ['ر', 'r'],
  ['س', 's'], ['ش', 'sh'], ['ف', 'f'], ['ق', 'q'], ['ك', 'k'], ['ل', 'l'], ['م', 'm'], ['ن', 'n'],
];
const MARKS: [string, string, string][] = [
  ['\u064E', 'a', 'Fathah (ere-oke)'],
  ['\u0650', 'i', 'Kasrah (ere-isale)'],
  ['\u064F', 'u', 'Dammah'],
];

export const makeHurufQuestions = (n = 10): Mcq[] =>
  Array.from({ length: n }, () => {
    const [ar, rom] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const [mark, vowel, markName] = MARKS[Math.floor(Math.random() * MARKS.length)];
    const answer = rom + vowel;
    const set = new Set<string>([answer]);
    while (set.size < 4) {
      const [, r2] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const [, v2] = MARKS[Math.floor(Math.random() * MARKS.length)];
      set.add(Math.random() < 0.5 ? r2 + vowel : rom + v2 + (Math.random() < 0.3 ? '' : ''));
      if (set.size < 4) set.add(r2 + v2);
    }
    const options = shuffle(Array.from(set).slice(0, 4));
    if (!options.includes(answer)) options[0] = answer;
    return {
      prompt: '',
      promptAr: ar + mark,
      sub: 'Which sound is this?',
      options,
      answer: options.indexOf(answer),
      explain: `${markName} gives the "${vowel}" sound: ${answer}`,
    };
  });

// ===================== HIFZ (verse builder) =====================
export interface Verse {
  surah: string;
  ayah: number;
  text: string;
  translation: string;
  needs?: string; // book id
}

export const VERSES: Verse[] = [
  { surah: 'Al-Fatihah', ayah: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', translation: 'In the name of Allah, the Most Gracious, the Most Merciful.' },
  { surah: 'Al-Fatihah', ayah: 2, text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', translation: 'All praise is for Allah, Lord of all worlds.' },
  { surah: 'Al-Fatihah', ayah: 3, text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', translation: 'The Most Gracious, the Most Merciful.' },
  { surah: 'Al-Fatihah', ayah: 4, text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', translation: 'Master of the Day of Judgment.' },
  { surah: 'Al-Fatihah', ayah: 5, text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', translation: 'You alone we worship, and You alone we ask for help.' },
  { surah: 'Al-Fatihah', ayah: 6, text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', translation: 'Guide us on the Straight Path.' },
  { surah: 'Al-Ikhlas', ayah: 1, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', translation: 'Say: He is Allah, the One.', needs: 'juz_amma' },
  { surah: 'Al-Ikhlas', ayah: 2, text: 'ٱللَّهُ ٱلصَّمَدُ', translation: 'Allah, the Eternal Refuge.', needs: 'juz_amma' },
  { surah: 'Al-Ikhlas', ayah: 3, text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', translation: 'He neither begets nor is born.', needs: 'juz_amma' },
  { surah: 'Al-Falaq', ayah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ', translation: 'Say: I seek refuge in the Lord of the daybreak.', needs: 'juz_amma' },
  { surah: 'Al-Falaq', ayah: 2, text: 'مِن شَرِّ مَا خَلَقَ', translation: 'From the evil of what He has created.', needs: 'juz_amma' },
  { surah: 'An-Nas', ayah: 1, text: 'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ', translation: 'Say: I seek refuge in the Lord of mankind.', needs: 'juz_amma' },
  { surah: 'An-Nas', ayah: 2, text: 'مَلِكِ ٱلنَّاسِ', translation: 'The King of mankind.', needs: 'juz_amma' },
  { surah: 'An-Nas', ayah: 3, text: 'إِلَٰهِ ٱلنَّاسِ', translation: 'The God of mankind.', needs: 'juz_amma' },
];

// ===================== WUDU & FIQH =====================
export const WUDU_STEPS: OrderItem[] = [
  { text: 'Make the intention (niyyah)' },
  { text: 'Say "Bismillah"' },
  { text: 'Wash both hands' },
  { text: 'Rinse the mouth' },
  { text: 'Sniff water into the nose' },
  { text: 'Wash the face' },
  { text: 'Wash arms up to the elbows' },
  { text: 'Wipe the head' },
  { text: 'Wipe the ears' },
  { text: 'Wash feet up to the ankles' },
];

export const FIQH_CASES: Mcq[] = [
  {
    prompt: 'Baba forgot the middle tashahhud (an omitted sunnah). What does he do?',
    options: ['Sujood sahw BEFORE the salam', 'Sujood sahw AFTER the salam', 'Repeat the whole prayer', 'Nothing at all'],
    answer: 0,
    explain: 'In the Maliki school, omitting a sunnah is repaired with sujood sahw before the salam (qabli).',
  },
  {
    prompt: 'Aunty prayed five rak\'ahs in Dhuhr by mistake (a pure addition). What now?',
    options: ['Sujood sahw BEFORE the salam', 'Sujood sahw AFTER the salam', 'Pray Dhuhr again at once', 'Nothing at all'],
    answer: 1,
    explain: 'A pure addition is repaired with sujood sahw after the salam (ba\'di).',
  },
  {
    prompt: 'Someone both omitted a sunnah AND added something in the same prayer. When is sujood sahw?',
    options: ['Before the salam', 'After the salam', 'Never', 'Next prayer time'],
    answer: 0,
    explain: 'When omission and addition combine, the "before the salam" ruling takes precedence.',
  },
  {
    prompt: 'Which of these BREAKS your wudu?',
    options: ['Passing wind', 'Eating jollof rice', 'Drinking water', 'Walking to the mosque'],
    answer: 0,
    explain: 'Passing wind invalidates wudu. Eating, drinking and walking do not.',
  },
];

// ===================== NAHW (Al-Ajurrumiyyah) =====================
const SENTENCES: { words: [string, string, string]; en: string }[] = [
  { words: ['ضَرَبَ', 'زَيْدٌ', 'عَمْرًا'], en: 'Zayd hit Amr' },
  { words: ['كَتَبَ', 'الطَّالِبُ', 'الدَّرْسَ'], en: 'The student wrote the lesson' },
  { words: ['فَتَحَ', 'الْوَلَدُ', 'الْبَابَ'], en: 'The boy opened the door' },
  { words: ['أَكَلَ', 'مُحَمَّدٌ', 'الْخُبْزَ'], en: 'Muhammad ate the bread' },
  { words: ['قَرَأَ', 'أَحْمَدُ', 'الْقُرْآنَ'], en: 'Ahmad read the Quran' },
  { words: ['شَرِبَ', 'الطِّفْلُ', 'الْمَاءَ'], en: 'The child drank the water' },
];

export const makeNahwQuestions = (n = 6): Mcq[] =>
  shuffle(SENTENCES)
    .slice(0, n)
    .map((s, i) => {
      const fail = i % 2 === 0;
      const options = shuffle([...s.words]);
      const correct = fail ? s.words[1] : s.words[2];
      return {
        prompt: s.en,
        promptAr: s.words.join(' '),
        sub: fail ? "Which word is the Fa'il (the doer)?" : "Which word is the Maf'ul bihi (the receiver)?",
        options,
        optionsAr: true,
        answer: options.indexOf(correct),
        explain: fail ? "The Fa'il is the one who does the action." : "The Maf'ul bihi is the one the action falls upon.",
      };
    });

// ===================== TUTORING (grading junior slates) =====================
const SPELL: { en: string; right: string; wrong: [string, string] }[] = [
  { en: 'book', right: 'كِتَاب', wrong: ['كِتَات', 'كِتَاد'] },
  { en: 'mosque', right: 'مَسْجِد', wrong: ['مَسْجِر', 'مَشْجِد'] },
  { en: 'pen', right: 'قَلَم', wrong: ['قَلَن', 'فَلَم'] },
  { en: 'water', right: 'مَاء', wrong: ['مَاد', 'نَاء'] },
  { en: 'house', right: 'بَيْت', wrong: ['بَيْث', 'بَيْغ'] },
];

export const makeTutorQuestions = (): Mcq[] =>
  shuffle(SPELL).map((s) => {
    const options = shuffle([s.right, ...s.wrong]);
    return {
      prompt: `A junior wrote the word for "${s.en}". Spot the slate with the correct spelling.`,
      options,
      optionsAr: true,
      answer: options.indexOf(s.right),
      explain: `The correct spelling of "${s.en}" is ${s.right}.`,
    };
  });

export const makeHomeLessonQuestions = (): Mcq[] =>
  shuffle([...makeNahwQuestions(3), ...FIQH_CASES.slice(0, 3)]);

// ===================== ADHAN =====================
export const ADHAN_LINES: OrderItem[] = [
  { text: 'Allahu Akbar', ar: 'اللَّهُ أَكْبَرُ' },
  { text: 'Ash-hadu an la ilaha illa Allah', ar: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ' },
  { text: 'Ash-hadu anna Muhammadan Rasulullah', ar: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ' },
  { text: "Hayya 'ala-s-salah", ar: 'حَيَّ عَلَى الصَّلَاةِ' },
  { text: "Hayya 'ala-l-falah", ar: 'حَيَّ عَلَى الْفَلَاحِ' },
  { text: 'Allahu Akbar ', ar: 'اللَّهُ أَكْبَرُ' },
  { text: 'La ilaha illa Allah', ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ' },
];

// ===================== KHUTBAH =====================
export const KHUTBAH_PARTS: OrderItem[] = [
  { text: 'Praise Allah (Hamd)', ar: 'الْحَمْدُ لِلَّهِ' },
  { text: 'Send salawat on the Prophet ﷺ', ar: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ' },
  { text: 'Counsel the people to taqwa', ar: 'أُوصِيكُمْ بِتَقْوَى اللَّهِ' },
  { text: 'Recite an ayah and give the reminder' },
  { text: 'Close with istighfar and dua', ar: 'أَسْتَغْفِرُ اللَّهَ' },
];

export const KHUTBAH_QUESTIONS: Mcq[] = [
  {
    prompt: 'The community is facing hardship. Which theme fits the khutbah best?',
    options: ['Patience (sabr) and trust in Allah', 'Boasting about wealth', 'Mocking the poor', 'Staying silent'],
    answer: 0,
    explain: 'A good khatib comforts the people with sabr, tawakkul and hope.',
  },
  {
    prompt: 'How should the khatib treat the congregation?',
    options: ['With mercy and clear, simple words', 'With harsh shouting only', 'By reading extremely fast', 'By ignoring them'],
    answer: 0,
    explain: 'The Prophet ﷺ taught with gentleness and clarity.',
  },
  {
    prompt: 'During the Friday khutbah the congregation should...',
    options: ['Listen attentively and stay quiet', 'Chat with their neighbour', 'Check their phones', 'Walk around'],
    answer: 0,
    explain: 'Listening in silence is part of the etiquette of Jumu\'ah.',
  },
];

// ===================== WALAAH TRACING LETTERS =====================
export const TRACE_LETTERS = ['ا', 'ب', 'ت', 'ج', 'د', 'س', 'م', 'ن', 'و', 'ه'];

