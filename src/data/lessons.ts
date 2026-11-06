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

/**
 * Shuffles the options of an MCQ and updates `answer` to track the new index
 * of the correct option so the right answer is never predictably in slot 0 or 1.
 */
export const shuffleMcqOptions = (q: Mcq): Mcq => {
  const tagged = q.options.map((opt, idx) => ({
    opt,
    isCorrect: idx === q.answer,
  }));
  const mixed = shuffle(tagged);
  const newAnswer = mixed.findIndex((item) => item.isCorrect);
  return {
    ...q,
    options: mixed.map((item) => item.opt),
    answer: newAnswer >= 0 ? newAnswer : 0,
  };
};

export const prepareMcqSet = (bank: Mcq[], count?: number): Mcq[] => {
  const picked = shuffle(bank).slice(0, count ?? bank.length);
  return picked.map(shuffleMcqOptions);
};

// ===================== HURUF (Qa'idah Baghdadiyyah) =====================
const LETTERS: [string, string, string][] = [
  ['ب', 'b', 'Baa'],
  ['ت', 't', 'Taa'],
  ['ث', 'th', 'Thaa'],
  ['ج', 'j', 'Jeem'],
  ['ح', 'h', 'Haa'],
  ['خ', 'kh', 'Khaa'],
  ['د', 'd', 'Daal'],
  ['ذ', 'dh', 'Dhaal'],
  ['ر', 'r', 'Raa'],
  ['ز', 'z', 'Zay'],
  ['س', 's', 'Seen'],
  ['ش', 'sh', 'Sheen'],
  ['ص', 's', 'Saad'],
  ['ض', 'd', 'Daad'],
  ['ط', 't', 'Taa (heavy)'],
  ['ف', 'f', 'Faa'],
  ['ق', 'q', 'Qaaf'],
  ['ك', 'k', 'Kaaf'],
  ['ل', 'l', 'Laam'],
  ['م', 'm', 'Meem'],
  ['ن', 'n', 'Noon'],
];

const MARKS: [string, string, string][] = [
  ['\u064E', 'a', 'Fathah (ere-oke)'],
  ['\u0650', 'i', 'Kasrah (ere-isale)'],
  ['\u064F', 'u', 'Dammah (ere-otun)'],
];

export const makeHurufQuestions = (n = 8): Mcq[] => {
  const usedCombos = new Set<string>();
  const out: Mcq[] = [];

  while (out.length < n) {
    const [ar, rom, letterName] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const [mark, vowel, markName] = MARKS[Math.floor(Math.random() * MARKS.length)];
    const comboKey = `${ar}-${vowel}`;
    if (usedCombos.has(comboKey) && usedCombos.size < LETTERS.length * MARKS.length) continue;
    usedCombos.add(comboKey);

    const correctSound = `${rom}${vowel}`;
    const distractors = new Set<string>();
    // Add same consonant with different vowels
    MARKS.forEach(([, v2]) => {
      if (v2 !== vowel) distractors.add(`${rom}${v2}`);
    });
    // Add different consonants with same or different vowel
    while (distractors.size < 6) {
      const [, r2] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      const [, v2] = MARKS[Math.floor(Math.random() * MARKS.length)];
      const cand = `${r2}${v2}`;
      if (cand !== correctSound) distractors.add(cand);
    }

    const wrongThree = shuffle(Array.from(distractors)).slice(0, 3);
    out.push(
      shuffleMcqOptions({
        prompt: `How do you pronounce ${letterName} with ${markName.split(' ')[0]}?`,
        promptAr: ar + mark,
        sub: 'Qa’idah Baghdadiyyah Sound Drill',
        options: [correctSound, ...wrongThree],
        answer: 0,
        explain: `${letterName} (${ar}) with ${markName} produces the "${correctSound}" sound.`,
      }),
    );
  }
  return out;
};

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

// ===================== WUDU & FIQH (Matn Al-Akhdari) =====================
export const WUDU_STEPS: OrderItem[] = [
  { text: 'Make the intention (niyyah) in the heart' },
  { text: 'Say "Bismillah"' },
  { text: 'Wash both hands three times' },
  { text: 'Rinse the mouth (Madmadah)' },
  { text: 'Sniff water into the nose (Istinshaq)' },
  { text: 'Wash the entire face' },
  { text: 'Wash both arms up to and including the elbows' },
  { text: 'Wipe the whole head (Mas-h)' },
  { text: 'Wipe the inner and outer ears' },
  { text: 'Wash both feet up to the ankles' },
];

export const FIQH_CASES: Mcq[] = [
  {
    prompt: 'Baba forgot the middle tashahhud (an omitted sunnah) in Dhuhr. How does he repair the prayer in Maliki Fiqh?',
    options: [
      'Perform Sujood as-Sahw BEFORE the Salam (Qabli)',
      'Perform Sujood as-Sahw AFTER the Salam (Ba’di)',
      'Cancel and restart the entire prayer immediately',
      'Clap his hands twice and continue without Sujood',
    ],
    answer: 0,
    explain: 'In Matn Al-Akhdari (Maliki school), omitting a confirmed sunnah is repaired with Sujood as-Sahw before the Salam (Sujood Qabli).',
  },
  {
    prompt: "Aunty mistakenly stood up for a fifth rak'ah in Asr (a pure addition) before remembering at the end. What is the ruling?",
    options: [
      'Perform Sujood as-Sahw AFTER the Salam (Ba’di)',
      'Perform Sujood as-Sahw BEFORE the Salam (Qabli)',
      'Pray two extra rak’ahs to make it six',
      'Skip Maghrib to balance the count',
    ],
    answer: 0,
    explain: 'A pure addition (Ziyadah) in prayer is repaired with two prostrations AFTER the Salam (Sujood Ba’di).',
  },
  {
    prompt: 'Someone both omitted a confirmed sunnah AND accidentally added an action in the same prayer. Which Sujood applies?',
    options: [
      'Before the Salam (Qabli), because omission takes precedence',
      'After the Salam (Ba’di), because addition takes precedence',
      'Both before and after the Salam',
      'No Sujood is needed when they cancel out',
    ],
    answer: 0,
    explain: 'When omission (Naqs) and addition (Ziyadah) combine in one prayer, Sujood Qabli (before Salam) prevails in Maliki Fiqh.',
  },
  {
    prompt: 'Which of the following actions INVALIDATES (breaks) your Wudu?',
    options: [
      'Deep sleep or passing wind',
      'Eating hot jollof rice and plantain',
      'Drinking cold water after ablution',
      'Trimming fingernails or combing hair',
    ],
    answer: 0,
    explain: 'Passing wind or losing consciousness/deep sleep breaks Wudu. Eating cooked food or drinking water does not.',
  },
  {
    prompt: 'In Matn Al-Akhdari, what is the ruling on rubbing the limbs (Ad-Dalk) with your hand while pouring water in Wudu?',
    options: [
      'It is an obligatory pillar (Fard) of Wudu',
      'It is disliked (Makruh) when in a hurry',
      'It is only required during the harmattan season',
      'It is only required for the Imam of the mosque',
    ],
    answer: 0,
    explain: 'In the Maliki school, rubbing the washed limbs (Ad-Dalk) and continuity (Al-Muwalah) are among the obligatory Fara’id of Wudu.',
  },
  {
    prompt: 'If a worshipper doubts whether they have prayed 3 or 4 rak’ahs in Isha, what must they build upon?',
    options: [
      'Build upon certainty (the lesser number, 3), complete the 4th, then do Sujood Ba’di',
      'Assume they prayed 4 and end the prayer immediately',
      'Ask the person standing next to them out loud',
      'Abandon the prayer and wait until tomorrow',
    ],
    answer: 0,
    explain: 'Certainty is not overruled by doubt: you take the lesser number (3), pray the 4th rak’ah, and prostrate after Salam (Ba’di).',
  },
];

export const makeFiqhQuestions = (n = 4): Mcq[] => prepareMcqSet(FIQH_CASES, n);

// ===================== NAHW (Al-Ajurrumiyyah) =====================
const NAHW_BANK: Mcq[] = [
  {
    prompt: 'In the sentence "قَرَأَ أَحْمَدُ الْقُرْآنَ" (Ahmad read the Quran), which word is the Fa’il (the doer)?',
    promptAr: 'قَرَأَ أَحْمَدُ الْقُرْآنَ',
    sub: 'Al-Ajurrumiyyah · Chapter on Marfu’at',
    options: ['أَحْمَدُ (Ahmadu)', 'قَرَأَ (Qara’a)', 'الْقُرْآنَ (Al-Qur’ana)', 'There is no Fa’il'],
    answer: 0,
    explain: 'أَحْمَدُ is the Fa’il (subject/doer of the verb) and therefore takes Dammah (Marfu’).',
  },
  {
    prompt: 'In "كَتَبَ الطَّالِبُ الدَّرْسَ" (The student wrote the lesson), what is the grammatical role of الدَّرْسَ?',
    promptAr: 'كَتَبَ الطَّالِبُ الدَّرْسَ',
    sub: 'Al-Ajurrumiyyah · Sentence Parsing (I’rab)',
    options: [
      'Maf’ul bihi (Direct Object — Mansub with Fathah)',
      'Fa’il (Doer — Marfu’ with Dammah)',
      'Fi’l Madi (Past Tense Verb)',
      'Harf Jarr (Preposition)',
    ],
    answer: 0,
    explain: 'الدَّرْسَ receives the action of writing, making it the Maf’ul bihi (direct object), marked with Fathah.',
  },
  {
    prompt: 'When a preposition (Harf Jarr) like "فِي" (in) enters upon a noun, such as "فِي الْمَسْجِدِ", what vowel mark does the noun take?',
    promptAr: 'فِي الْمَسْجِدِ',
    sub: 'Al-Ajurrumiyyah · Signs of Khafd (Jarr)',
    options: [
      'Kasrah (Majrur)',
      'Dammah (Marfu’)',
      'Fathah (Mansub)',
      'Sukoon (Majzum)',
    ],
    answer: 0,
    explain: 'Every noun preceded by a Harf Jarr (مِنْ، إِلَى، عَنْ، عَلَى، فِي) becomes Majrur and takes a Kasrah at the end.',
  },
  {
    prompt: 'In the nominal sentence "الْعِلْمُ نُورٌ" (Knowledge is light), what are the two parts called in Nahw?',
    promptAr: 'الْعِلْمُ نُورٌ',
    sub: 'Al-Ajurrumiyyah · Jumlah Ismiyyah',
    options: [
      'Mubtada’ (Subject) and Khabar (Predicate)',
      'Fi’l (Verb) and Fa’il (Doer)',
      'Mudhaf and Mudhaf Ilayh',
      'Shart and Jawab',
    ],
    answer: 0,
    explain: 'A sentence starting with a noun is a Jumlah Ismiyyah, composed of Mubtada’ (الْعِلْمُ) and Khabar (نُورٌ), both Marfu’.',
  },
  {
    prompt: 'According to Ibn Ajurrum, into how many categories is all Arabic speech (Al-Kalam) divided?',
    promptAr: 'أَقْسَامُ الْكَلَامِ',
    sub: 'Al-Ajurrumiyyah · Opening Chapter',
    options: [
      'Three: Ism (Noun), Fi’l (Verb), and Harf (Particle)',
      'Two: Past and Present only',
      'Five: Letters, Vowels, Words, Lines, and Chapters',
      'Four: Masculine, Feminine, Singular, and Plural',
    ],
    answer: 0,
    explain: 'Ibn Ajurrum states: "وأقسامه ثلاثة: اسم، وفعل، وحرف جاء لمعنى" — Noun, Verb, and Particle.',
  },
  {
    prompt: 'In "فَتَحَ الْوَلَدُ الْبَابَ" (The boy opened the door), which word is the Fi’l Madi (Past Tense Verb)?',
    promptAr: 'فَتَحَ الْوَلَدُ الْبَابَ',
    sub: 'Al-Ajurrumiyyah · Verbs',
    options: ['فَتَحَ', 'الْوَلَدُ', 'الْبَابَ', 'None of them'],
    answer: 0,
    explain: 'فَتَحَ ("opened") is the past tense verb (Fi’l Madi), which is always built upon Fathah.',
  },
  {
    prompt: 'In "شَرِبَ الطِّفْلُ الْمَاءَ" (The child drank the water), which word is the Maf’ul bihi (receiver of the action)?',
    promptAr: 'شَرِبَ الطِّفْلُ الْمَاءَ',
    sub: 'Al-Ajurrumiyyah · Mansubat',
    options: ['الْمَاءَ', 'الطِّفْلُ', 'شَرِبَ', 'الْحَلِيبَ'],
    answer: 0,
    explain: 'الْمَاءَ (the water) is what was drunk — the Maf’ul bihi, marked with Fathah at the end.',
  },
];

export const makeNahwQuestions = (n = 5): Mcq[] => prepareMcqSet(NAHW_BANK, n);

// ===================== TUTORING / CORRECTING JUNIORS (Tas-heeh) =====================
const TUTOR_BANK: Mcq[] = [
  {
    prompt: 'Junior Suleiman wrote the Arabic word for "Mosque" in his exercise notebook. Which spelling is correct?',
    sub: 'Notebook Check · Arabic Spelling',
    options: ['مَسْجِدٌ', 'مَسْجِرٌ', 'مَشْجِدٌ', 'مَسْخِدٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'Mosque is مَسْجِدٌ (Masjidun) with Seen (س) and Jeem (ج).',
  },
  {
    prompt: 'Little Aminah is trying to write "Book" (Kitab) in her Daftar. Spot the correct Arabic spelling:',
    sub: 'Notebook Check · Vocabulary',
    options: ['كِتَابٌ', 'كِتَاتٌ', 'قِتَابٌ', 'كِثَابٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'Book is spelled كِتَابٌ with Kaaf (ك), Taa (ت), Alif, and Baa (ب).',
  },
  {
    prompt: 'A junior student recited Surah Al-Fatihah as "ٱلْحَمْدُ لِلَّهِ رَبَّ ٱلْعَٰلَمِينَ" (with Fathah on رَبَّ). How do you correct him?',
    promptAr: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ',
    sub: 'Recitation Check · Harakat Correction',
    options: [
      'It must be "رَبِّ" (Rabbi) with a Kasrah, not Fathah',
      'It should be "رَبُّ" (Rabbu) with a Dammah',
      'It should have a Sukoon on the Baa',
      'His recitation with Fathah was already correct',
    ],
    answer: 0,
    explain: 'رَبِّ (Rabbi) takes a Kasrah because it is an attribute (Na’t/Badal) following لِلَّهِ (Majrur).',
  },
  {
    prompt: 'Junior Ridwan wrote the word for "Pen" (Qalam). Which of these four entries in his notebook is right?',
    sub: 'Notebook Check · Orthography',
    options: ['قَلَمٌ', 'كَلَمٌ', 'فَلَمٌ', 'قَلَنٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'Pen is قَلَمٌ (Qalamun), starting with the deep letter Qaaf (ق) and ending with Meem (م).',
  },
  {
    prompt: 'A young Omo Kewu pronounced "الشَّمْسُ" as "Al-Shamsu" (pronouncing the Laam clearly). What rule do you teach him?',
    promptAr: 'الشَّمْسُ',
    sub: 'Tajweed Check · Sun & Moon Letters',
    options: [
      'Sheen (ش) is a Sun Letter (Harf Shamsi), so the Laam merges silently into "Ash-Shamsu"',
      'Sheen is a Moon Letter (Harf Qamari), so the Laam should bounce',
      'The word should be read without Alif-Laam',
      'You must add a Meem sound before Sheen',
    ],
    answer: 0,
    explain: 'With Sun Letters (الحروف الشمسية) like ش, س, ص, ت, ر, the Laam of "Al-" assimilates into the letter: Ash-Shamsu.',
  },
  {
    prompt: 'Junior Musa wants to write "School" (Madrasah) on the top of his exercise book. Which spelling is accurate?',
    sub: 'Notebook Check · Spelling',
    options: ['مَدْرَسَةٌ', 'مَضْرَسَةٌ', 'مَدْرَصَةٌ', 'مَذْرَسَةٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'Madrasah (مَدْرَسَةٌ) is written with Daal (د), Raa (ر), Seen (س), and Taa Marbutah (ة).',
  },
  {
    prompt: 'While reciting Surah Al-Ikhlas, a junior paused on "أَحَدْ" without echoing the Daal. Which Tajweed rule did he miss?',
    promptAr: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ',
    sub: 'Recitation Check · Tajweed',
    options: [
      'Qalqalah (echoing bounce on the letters ق ط ب ج د when sukooned)',
      'Idgham bi-Ghunnah (nasal merging)',
      'Madd Lazim (6-beat elongation)',
      'Iqlab (turning Noon into Meem)',
    ],
    answer: 0,
    explain: 'Daal (د) is one of the five Qalqalah letters (قُطْبُ جَدٍّ). When stopped on at the end of a verse, it requires a clear Qalqalah bounce.',
  },
  {
    prompt: 'Junior Bilal wrote the word for "Teacher" (Mu’allim). Which option is spelled properly?',
    sub: 'Notebook Check · Vocabulary',
    options: ['مُعَلِّمٌ', 'مُأَلِّمٌ', 'مُعَلِّنٌ', 'مُغَلِّمٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'Teacher is مُعَلِّمٌ (Mu’allimun) with the throat letter ‘Ayn (ع) and a Shaddah on the Laam.',
  },
  {
    prompt: 'A junior student asks: "Senior, how many dots are under the letter Yaa (ي) and above the letter Taa (ت)?"',
    promptAr: 'ي / ت',
    sub: 'Qa’idah Check · Letter Dots (Nuqat)',
    options: [
      'Two dots under Yaa (ي) and two dots above Taa (ت)',
      'One dot under Yaa and three dots above Taa',
      'Three dots under Yaa and one dot above Taa',
      'Neither letter has any dots',
    ],
    answer: 0,
    explain: 'Yaa (ي) has two dots below, while Taa (ت) has two dots above (and Thaa ث has three above).',
  },
  {
    prompt: 'Junior Zainab wrote the word for "House" (Bayt). Pick the right spelling to mark her notebook ✓:',
    sub: 'Notebook Check · Spelling',
    options: ['بَيْتٌ', 'بَيْثٌ', 'تَيْتٌ', 'بَيْطٌ'],
    optionsAr: true,
    answer: 0,
    explain: 'House is بَيْتٌ (Baytun) with Baa, Yaa Sakinah, and open Taa (ت).',
  },
];

export const makeTutorQuestions = (n = 5): Mcq[] => prepareMcqSet(TUTOR_BANK, n);

// ===================== HOME LESSON (Isolo Estate Private Tutoring) =====================
const HOME_LESSON_BANK: Mcq[] = [
  {
    prompt: 'Alhaji Musa’s 9-year-old son asks: "Ustadh, what Dua do we say before starting to eat our meal?"',
    promptAr: 'بِسْمِ اللَّهِ',
    sub: 'Home Lesson · Daily Adab & Duas',
    options: [
      'Say "Bismillah" (and if you forget at the start, say "Bismillahi awwalahu wa akhirahu")',
      'Say "Alhamdulillahi Rabbil Aalameen" only before touching the food',
      'Say "Subhana Rabbiyal A’la" three times',
      'Say "Astaghfirullah" and eat with the left hand',
    ],
    answer: 0,
    explain: 'The Prophet ﷺ taught: "Mention Allah’s Name (say Bismillah), eat with your right hand, and eat from what is nearest to you."',
  },
  {
    prompt: 'You are teaching Alhaji’s daughter the daily prayers. How many obligatory (Fard) rak’ahs are in Maghrib and Isha respectively?',
    sub: 'Home Lesson · Fiqh of Salah',
    options: [
      'Maghrib has 3 Fard rak’ahs, and Isha has 4 Fard rak’ahs',
      'Maghrib has 4 Fard rak’ahs, and Isha has 3 Fard rak’ahs',
      'Both Maghrib and Isha have 4 Fard rak’ahs',
      'Maghrib has 2 Fard rak’ahs, and Isha has 4 Fard rak’ahs',
    ],
    answer: 0,
    explain: 'The 5 daily Fard prayers have 2 (Fajr), 4 (Dhuhr), 4 (Asr), 3 (Maghrib), and 4 (Isha) rak’ahs — 17 in total.',
  },
  {
    prompt: 'In your Arabic conversation drill with the children, how do they say "This is a Muslim boy" vs "This is a Muslim girl"?',
    promptAr: 'هَٰذَا وَلَدٌ مُسْلِمٌ / هَٰذِهِ بِنْتٌ مُسْلِمَةٌ',
    sub: 'Home Lesson · Arabic Demonstratives',
    options: [
      'Use "هَٰذَا" (Hadha) for masculine and "هَٰذِهِ" (Hadhihi) for feminine',
      'Use "هَٰذِهِ" for masculine and "هَٰذَا" for feminine',
      'Use "أَنَا" for both masculine and feminine',
      'Use "نَحْنُ" for singular nouns',
    ],
    answer: 0,
    explain: 'هَٰذَا (Hadha) points to a singular masculine noun, while هَٰذِهِ (Hadhihi) points to a singular feminine noun.',
  },
  {
    prompt: 'Alhaji’s children are memorizing the Pillars of Islam. Which pillar immediately follows the Shahadah (Testimony of Faith)?',
    sub: 'Home Lesson · Pillars of Islam',
    options: [
      'Establishing the five daily prayers (Iqamat as-Salah)',
      'Pilgrimage to Makkah (Hajj)',
      'Fasting the month of Ramadan (Sawm)',
      'Giving Zakah once a year',
    ],
    answer: 0,
    explain: 'Salah is the second pillar of Islam and the first deed a servant will be questioned about on the Day of Judgment.',
  },
  {
    prompt: 'While teaching Tajweed at the dining table: when Noon Sakinah (نْ) is followed by the letter Baa (ب) as in "مِنْ بَعْدِ", what is the rule?',
    promptAr: 'مِنْ بَعْدِ',
    sub: 'Home Lesson · Tajweed Rules',
    options: [
      'Iqlab — transforming the Noon into a hidden Meem sound with Ghunnah',
      'Izhar — pronouncing the Noon sharply from the throat',
      'Idgham — dropping the Noon completely without nasal sound',
      'Qalqalah — bouncing the Noon',
    ],
    answer: 0,
    explain: 'Whenever Noon Sakinah or Tanween meets Baa (ب), the rule of Iqlab applies.',
  },
  {
    prompt: 'You ask the children: "Which foot do we step with when entering the Mosque, and which foot when entering the restroom?"',
    sub: 'Home Lesson · Prophetic Sunnah',
    options: [
      'Right foot when entering the Mosque; Left foot when entering the restroom',
      'Left foot when entering the Mosque; Right foot when entering the restroom',
      'Jump with both feet together in both places',
      'It does not matter at all in Sunnah',
    ],
    answer: 0,
    explain: 'The Sunnah honours noble places (like the Mosque) by entering with the right foot, and enters the restroom with the left foot.',
  },
  {
    prompt: 'Alhaji Musa listens from the balcony as you test the kids on Seerah: In which city was Prophet Muhammad ﷺ born, and to which city did he migrate (Hijrah)?',
    sub: 'Home Lesson · Prophetic Biography (Seerah)',
    options: [
      'Born in Makkah; migrated to Madinah (Yathrib)',
      'Born in Madinah; migrated to Makkah',
      'Born in Jerusalem; migrated to Ta’if',
      'Born in Cairo; migrated to Baghdad',
    ],
    answer: 0,
    explain: 'The Prophet ﷺ was born in Makkah in the Year of the Elephant and migrated to Madinah after 13 years of calling people to Islam.',
  },
  {
    prompt: 'In Arabic grammar, what is the plural of "كِتَابٌ" (Book) that you write on the children’s whiteboard?',
    promptAr: 'كِتَابٌ ← كُتُبٌ',
    sub: 'Home Lesson · Broken Plurals (Jam’ Takseer)',
    options: [
      'كُتُبٌ (Kutubun)',
      'مَكْتَبٌ (Maktabun)',
      'كَاتِبٌ (Katibun)',
      'مَكْتُوبٌ (Maktubun)',
    ],
    answer: 0,
    explain: 'كُتُبٌ (Kutubun) is the plural of كِتَابٌ (book), whereas كَاتِبٌ means writer and مَكْتَبٌ means desk/office.',
  },
];

export const makeHomeLessonQuestions = (n = 5): Mcq[] => prepareMcqSet(HOME_LESSON_BANK, n);

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
    prompt: 'The community in Idimu is facing economic hardship. Which theme fits the Friday Khutbah best?',
    options: [
      'Patience (Sabr), honest trade, mutual charity, and trust in Allah (Tawakkul)',
      'Boasting about personal wealth and expensive clothes',
      'Mocking those who ride Danfo buses',
      'Telling traders to inflate prices in the market',
    ],
    answer: 0,
    explain: 'A wise Khatib uplifts the community with Sabr, integrity in business, and compassion for neighbours.',
  },
  {
    prompt: 'According to the Sunnah of the Prophet ﷺ, how should the Friday Khutbah be delivered?',
    options: [
      'With moderate length, clear impactful words, and heartfelt sincerity',
      'As long as possible until the sun sets',
      'In a whisper that only the front row can hear',
      'Without reciting any verse from the Quran',
    ],
    answer: 0,
    explain: 'Jabir ibn Samurah reported that the Prophet’s ﷺ prayer and khutbah were of moderate length, concise, and eloquent.',
  },
  {
    prompt: 'While the Imam is delivering the Friday Khutbah on the Minbar, what must the congregation do?',
    options: [
      'Listen attentively in complete silence — even telling a neighbour "Be quiet" is avoided',
      'Debate football scores with the person beside them',
      'Scroll through social media with the volume on',
      'Walk between the rows selling merchandise',
    ],
    answer: 0,
    explain: 'Listening attentively in silence is an obligation during the Jumu’ah Khutbah.',
  },
  {
    prompt: 'How many distinct parts (sermons) make up the Friday Khutbah, separated by a brief sitting of the Imam?',
    options: [
      'Two sermons (Khutbatayn) separated by a brief sitting on the Minbar',
      'Four sermons separated by three breaks',
      'One continuous sermon after the prayer',
      'Three sermons delivered after Asr',
    ],
    answer: 0,
    explain: 'The Friday Khutbah consists of two parts before the Jumu’ah prayer, with the Imam sitting briefly between them.',
  },
];

export const makeKhutbahQuestions = (n = 3): Mcq[] => prepareMcqSet(KHUTBAH_QUESTIONS, n);
