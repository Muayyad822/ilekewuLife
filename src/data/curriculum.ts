import { SubjectId } from '@/types/game';
import { Mcq, prepareMcqSet } from '@/data/lessons';

export interface DailyTopic {
  id: string;
  subject: SubjectId;
  title: string;
  arabicTitle: string;
  ustadhName: string;
  ustadhTitle: string;
  chalkboard: {
    arabic: string;
    transliteration: string;
    meaning: string;
  };
  summary: string;
  keyPoints: {
    heading: string;
    arabicSnippet?: string;
    body: string;
  }[];
  practicalTakeaway: string;
  quiz: Mcq[];
}

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  arabicName: string;
  icon: string;
  color: string;
  badgeBg: string;
  ustadh: string;
  description: string;
}

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'nahw',
    name: 'Nahw & Sarf',
    arabicName: 'النَّحْوُ وَالصَّرْفُ',
    icon: '📕',
    color: '#0284c7',
    badgeBg: 'bg-sky-100 text-sky-900 border-sky-300',
    ustadh: 'Ustadh Hamza Al-Ajurrumi',
    description: 'Arabic grammar, sentence parsing (I’rab), and word morphology.',
  },
  {
    id: 'fiqh',
    name: 'Fiqh & Ibadah',
    arabicName: 'الْفِقْهُ وَالْعِبَادَاتُ',
    icon: '📙',
    color: '#d97706',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    ustadh: 'Sheikh Sulaiman Al-Maliki',
    description: 'Purification, prayer rulings, Sujood Sahw, and daily worship.',
  },
  {
    id: 'tajweed',
    name: 'Qur’an & Tajweed',
    arabicName: 'التَّجْوِيدُ وَالتِّلَاوَةُ',
    icon: '📗',
    color: '#059669',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    ustadh: 'Baba Kewu (Grand Alfa)',
    description: 'Articulation points (Makharij), Noon Sakinah rules, and melodious recitation.',
  },
  {
    id: 'hadith',
    name: 'Hadith & Sunnah',
    arabicName: 'الْحَدِيثُ الشَّرِيفُ',
    icon: '📜',
    color: '#7c3aed',
    badgeBg: 'bg-violet-100 text-violet-900 border-violet-300',
    ustadh: 'Ustadh Luqman Al-Muhaddith',
    description: 'Gems from Al-Arba’in An-Nawawiyyah and Riyadus-Salihin.',
  },
  {
    id: 'seerah',
    name: 'Seerah & Tarikh',
    arabicName: 'السِّيرَةُ وَالتَّارِيخُ',
    icon: '🕌',
    color: '#be185d',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    ustadh: 'Alfa Qasim Al-Ilori',
    description: 'Life of the Prophet ﷺ and the history of Islamic scholarship in West Africa.',
  },
  {
    id: 'adab',
    name: 'Adab & Akhlaq',
    arabicName: 'الْآدَابُ وَالْأَخْلَاقُ',
    icon: '✨',
    color: '#0d9488',
    badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
    ustadh: 'Alhaja Khadijah',
    description: 'Character of the seeker of knowledge, honouring parents, and honesty.',
  },
];

export const CURRICULUM_TOPICS: Record<SubjectId, DailyTopic[]> = {
  nahw: [
    {
      id: 'nahw_kalam',
      subject: 'nahw',
      title: 'The Three Pillars of Arabic Speech (Aqsam al-Kalam)',
      arabicTitle: 'أَقْسَامُ الْكَلَامِ الثَّلَاثَةُ',
      ustadhName: 'Ustadh Hamza Al-Ajurrumi',
      ustadhTitle: 'Senior Grammar Master',
      chalkboard: {
        arabic: 'الْكَلَامُ ثَلَاثَةٌ : اِسْمٌ ، وَفِعْلٌ ، وَحَرْفٌ جَاءَ لِمَعْنًى',
        transliteration: 'Al-Kalamu thalathatun: Ismun, wa Fi’lun, wa Harfun ja’a li-ma’nan',
        meaning: 'Every word in Arabic is one of three: a Noun (Ism), a Verb (Fi’l), or a Particle (Harf).',
      },
      summary:
        'When you open the Quran or any classical Arabic text, every single word belongs to one of three families. Mastering how to spot them is the key that unlocks the entire Arabic language.',
      keyPoints: [
        {
          heading: '1. Al-Ism (الِاسْمُ — The Noun)',
          arabicSnippet: 'الْمَسْجِدُ · مُحَمَّدٌ · كِتَابٍ',
          body: 'Names a person, place, thing, or idea without being tied to time. You can recognize an Ism whenever a word accepts "Al-" (ال), Tanween (ـٌ ـٍ ـً), or follows a preposition (Harf Jarr).',
        },
        {
          heading: '2. Al-Fi’l (الْفِعْلُ — The Verb)',
          arabicSnippet: 'كَتَبَ · يَكْتُبُ · اُكْتُبْ',
          body: 'Indicates an action linked to a time: Past (Madi — كَتَبَ "he wrote"), Present/Future (Mudari’ — يَكْتُبُ "he writes"), or Command (Amr — اُكْتُبْ "write!").',
        },
        {
          heading: '3. Al-Harf (الْحَرْفُ — The Particle)',
          arabicSnippet: 'فِي · مِنْ · إِلَى · عَلَى',
          body: 'A connector word whose full meaning appears when joined with other words — like "فِي الْمَدْرَسَةِ" (in the Madrasah).',
        },
      ],
      practicalTakeaway:
        'Today when you recite Surah Al-Fatihah, notice how "بِسْمِ" starts with the Harf "بِ", followed by the Ism "اسْمِ"!',
      quiz: [
        {
          prompt: 'Which of these is a clear sign that an Arabic word is an Ism (Noun)?',
          options: [
            'It accepts Tanween (double vowel) or begins with "Al-" (ال)',
            'It only refers to an action happening tomorrow',
            'It cannot be pronounced by itself',
            'It never takes a Kasrah under any circumstance',
          ],
          answer: 0,
          explain: 'Ibn Ajurrum teaches that Tanween, Khafd (Kasrah), and entering of Alif-Laam (ال) are unmistakable signs of an Ism.',
        },
        {
          prompt: 'In the trio "كَتَبَ · يَكْتُبُ · اُكْتُبْ", what does "اُكْتُبْ" (Uktub) represent?',
          promptAr: 'اُكْتُبْ',
          options: [
            'Fi’l Amr (Command verb: "Write!")',
            'Fi’l Madi (Past tense verb)',
            'Harf Jarr (Preposition)',
            'Ism Alam (Proper noun)',
          ],
          answer: 0,
          explain: 'اُكْتُبْ is the command form (Fi’l Amr) requesting the listener to write.',
        },
        {
          prompt: 'In the phrase "فِي الْمَسْجِدِ" (In the mosque), what type of word is "فِي"?',
          promptAr: 'فِي الْمَسْجِدِ',
          options: [
            'Harf (Particle / Preposition)',
            'Fi’l Madi (Past Verb)',
            'Fa’il (Doer of an action)',
            'Mubtada’ (Subject)',
          ],
          answer: 0,
          explain: 'فِي is a Harf Jarr (preposition) that makes the noun after it Majrur with a Kasrah.',
        },
      ],
    },
    {
      id: 'nahw_jumlah',
      subject: 'nahw',
      title: 'Nominal vs. Verbal Sentences (Jumlah Ismiyyah & Fi’liyyah)',
      arabicTitle: 'الْجُمْلَةُ الِاسْمِيَّةُ وَالْجُمْلَةُ الْفِعْلِيَّةُ',
      ustadhName: 'Ustadh Hamza Al-Ajurrumi',
      ustadhTitle: 'Senior Grammar Master',
      chalkboard: {
        arabic: 'الْعِلْمُ نُورٌ  |  طَلَبَ الْمُسْلِمُ الْعِلْمَ',
        transliteration: 'Al-’Ilmu Noorun  |  Talaba al-Muslimu al-’Ilma',
        meaning: 'Knowledge is light (Nominal) | The Muslim sought knowledge (Verbal).',
      },
      summary:
        'Look at the very first word of any Arabic sentence: if it starts with a Noun, you are in a Nominal Sentence (Jumlah Ismiyyah); if it starts with a Verb, you are in a Verbal Sentence (Jumlah Fi’liyyah)!',
      keyPoints: [
        {
          heading: '1. Jumlah Ismiyyah (Nominal Sentence)',
          arabicSnippet: 'الْقُرْآنُ هُدًى',
          body: 'Starts with an Ism called the Mubtada’ (Subject) and completes the thought with the Khabar (Predicate). Both are Marfu’ (take Dammah).',
        },
        {
          heading: '2. Jumlah Fi’liyyah (Verbal Sentence)',
          arabicSnippet: 'حَفِظَ الطَّالِبُ السُّورَةَ',
          body: 'Starts with a Fi’l (Verb), followed by the Fa’il (Doer — takes Dammah) and optionally the Maf’ul bihi (Object — takes Fathah).',
        },
      ],
      practicalTakeaway:
        'Always check the last vowel (I’rab): Dammah marks the doer (Fa’il), while Fathah marks what received the action (Maf’ul bihi).',
      quiz: [
        {
          prompt: 'What do we call a sentence that begins with a Noun, such as "الصَّلَاةُ خَيْرٌ"?',
          promptAr: 'الصَّلَاةُ خَيْرٌ',
          options: [
            'Jumlah Ismiyyah (Nominal Sentence)',
            'Jumlah Fi’liyyah (Verbal Sentence)',
            'Harf Shart (Conditional Particle)',
            'Idhafah (Possessive Phrase)',
          ],
          answer: 0,
          explain: 'Because الصَّلَاةُ is a noun at the start of the sentence, it is a Jumlah Ismiyyah.',
        },
        {
          prompt: 'In "حَفِظَ الطَّالِبُ السُّورَةَ" (The student memorized the Surah), why does السُّورَةَ end with a Fathah?',
          promptAr: 'حَفِظَ الطَّالِبُ السُّورَةَ',
          options: [
            'Because it is the Maf’ul bihi (Direct Object of the verb)',
            'Because it is the Fa’il (Doer of the verb)',
            'Because it is preceded by a preposition',
            'Because it is a past tense verb',
          ],
          answer: 0,
          explain: 'السُّورَةَ is what was memorized — the Maf’ul bihi — which is always Mansub (takes Fathah).',
        },
        {
          prompt: 'What are the two main pillars of a Jumlah Ismiyyah?',
          options: [
            'Mubtada’ (Subject) and Khabar (Predicate)',
            'Fi’l (Verb) and Maf’ul (Object)',
            'Harf Jarr and Ism Majrur',
            'Mudhaf and Mudhaf Ilayh',
          ],
          answer: 0,
          explain: 'Every Jumlah Ismiyyah consists of a Mubtada’ and its Khabar.',
        },
      ],
    },
  ],
  fiqh: [
    {
      id: 'fiqh_taharah',
      subject: 'fiqh',
      title: 'Fara’id vs. Sunan of Wudu in Maliki Fiqh',
      arabicTitle: 'فَرَائِضُ الْوُضُوءِ وَسُنَنُهُ فِي الْمَذْهَبِ الْمَالِكِيِّ',
      ustadhName: 'Sheikh Sulaiman Al-Maliki',
      ustadhTitle: 'Teacher of Matn Al-Akhdari',
      chalkboard: {
        arabic: 'مَنْ تَرَكَ فَرْضًا لَمْ يَصِحَّ وُضُوؤُهُ حَتَّى يَأْتِيَ بِهِ',
        transliteration: 'Man taraka fardan lam yasihha wudu’uhu hatta ya’tiya bihi',
        meaning: 'Whoever leaves out an obligatory pillar (Fard), his Wudu is not valid until he performs it.',
      },
      summary:
        'In Matn Al-Akhdari, Imam Al-Akhdari distinguishes between the 7 Obligatory Pillars (Fara’id) of Wudu — which cannot be omitted — and the Sunnah acts which earn extra reward.',
      keyPoints: [
        {
          heading: '1. The 7 Fara’id (Obligatory Pillars)',
          arabicSnippet: 'النِّيَّةُ · غَسْلُ الْوَجْهِ · غَسْلُ الْيَدَيْنِ · مَسْحُ الرَّأْسِ · غَسْلُ الرِّجْلَيْنِ · الدَّلْكُ · الْفَوْرُ',
          body: '(1) Niyyah, (2) Washing the face, (3) Washing arms to elbows, (4) Wiping the whole head, (5) Washing feet to ankles, (6) Ad-Dalk (rubbing with the hand), and (7) Al-Fawr/Muwalah (continuity without long pauses).',
        },
        {
          heading: '2. Key Sunan of Wudu',
          arabicSnippet: 'غَسْلُ الْيَدَيْنِ أَوَّلًا · الْمَضْمَضَةُ · الِاسْتِنْشَاقُ · مَسْحُ الْأُذُنَيْنِ',
          body: 'Washing the hands at the start, rinsing the mouth (Madmadah), sniffing water into the nose (Istinshaq), and wiping the ears are confirmed Sunan.',
        },
      ],
      practicalTakeaway:
        'When performing Wudu at the compound taps, don’t just hold your arm under the running tap — gently rub the water over the skin (Ad-Dalk) so every Fard is fulfilled!',
      quiz: [
        {
          prompt: 'Which of the following is an OBLIGATORY pillar (Fard) of Wudu in Matn Al-Akhdari?',
          options: [
            'Wiping the entire head (Mas-h ar-Ra’s) and rubbing the limbs (Ad-Dalk)',
            'Using a wooden Miswak before starting',
            'Facing the Qiblah while sitting at the tap',
            'Washing each limb four times',
          ],
          answer: 0,
          explain: 'Wiping the whole head and rubbing the washed limbs (Ad-Dalk) are among the 7 Fara’id of Wudu in the Maliki school.',
        },
        {
          prompt: 'What is the ruling on rinsing the mouth (Madmadah) and nose (Istinshaq) during Wudu?',
          options: [
            'They are confirmed Sunnah acts of Wudu that bring great reward',
            'They are forbidden during daytime',
            'They invalidate the ablution if performed',
            'They replace washing the face',
          ],
          answer: 0,
          explain: 'In Maliki Fiqh, Madmadah and Istinshaq are Sunan of Wudu.',
        },
        {
          prompt: 'What does "Al-Fawr" (or Al-Muwalah) mean in the pillars of Wudu?',
          options: [
            'Continuity — washing one limb right after the other without a long break in between',
            'Using boiling hot water for ablution',
            'Reciting a whole Juz of Quran during Wudu',
            'Running fast to the mosque after Wudu',
          ],
          answer: 0,
          explain: 'Al-Fawr means performing the steps of Wudu continuously in one session before the previous limb dries in normal weather.',
        },
      ],
    },
  ],
  tajweed: [
    {
      id: 'tajweed_noon_sakinah',
      subject: 'tajweed',
      title: 'The Four Rules of Noon Sakinah & Tanween',
      arabicTitle: 'أَحْكَامُ النُّونِ السَّاكِنَةِ وَالتَّنْوِينِ',
      ustadhName: 'Baba Kewu (Grand Alfa)',
      ustadhTitle: 'Chief Quran Master',
      chalkboard: {
        arabic: 'إِظْهَارٌ · إِدْغَامٌ · إِقْلَابٌ · إِخْفَاءٌ',
        transliteration: 'Izhar · Idgham · Iqlab · Ikhfa’',
        meaning: 'Clear Pronunciation · Merging · Transformation · Nasal Hiding',
      },
      summary:
        'Whenever you encounter a Noon with a Sukoon (نْ) or a Tanween (ـً ـٍ ـٌ) in the Holy Quran, look closely at the letter that comes immediately after it. That next letter determines which of the 4 melodious rules you apply!',
      keyPoints: [
        {
          heading: '1. Izhar Halqi (Clear Throat Pronunciation)',
          arabicSnippet: 'ء هـ ع ح غ خ  —  مَنْ آمَنَ',
          body: 'Before the 6 throat letters (ء هـ ع ح غ خ), pronounce the Noon clearly and crisply without extra nasal stretch.',
        },
        {
          heading: '2. Idgham (Merging — يَرْمَلُونَ)',
          arabicSnippet: 'مَنْ يَعْمَلْ · مِنْ رَبِّهِمْ',
          body: 'Before the letters of "Yarmaloon" (ي ر م ل و ن), merge the Noon into the next letter (with Ghunnah on ي ن م و, and without Ghunnah on ل and ر).',
        },
        {
          heading: '3. Iqlab (Turning into Meem before ب)',
          arabicSnippet: 'مِنْ بَعْدِ ← مِمْ بَعْدِ',
          body: 'When followed by Baa (ب) alone, gently convert the Noon into a hidden Meem (م) with a 2-count nasal Ghunnah.',
        },
        {
          heading: '4. Ikhfa’ Haqiqi (Nasal Hiding)',
          arabicSnippet: 'مِنْ شَرِّ · أَنْفُسِهِمْ',
          body: 'Before the remaining 15 letters, hide the Noon sound between Izhar and Idgham with a rich 2-count Ghunnah.',
        },
      ],
      practicalTakeaway:
        'In Surah Al-Falaq ("مِن شَرِّ مَا خَلَقَ"), the Noon Sakinah is followed by Sheen (ش) — apply a smooth Ikhfa’!',
      quiz: [
        {
          prompt: 'Which word groups all six letters of Idgham (Merging)?',
          promptAr: 'يَرْمَلُونَ',
          options: [
            'Yarmaloon (ي ر م ل و ن)',
            'Qutb Jad (ق ط ب ج د)',
            'Huroof al-Halq (ء هـ ع ح غ خ)',
            'Alif, Waw, and Yaa',
          ],
          answer: 0,
          explain: 'The 6 letters of Idgham are collected in the word يَرْمَلُونَ (Yarmaloon).',
        },
        {
          prompt: 'In "مِنْ خَوْفٍ" (Min Khawfin) from Surah Quraysh, Noon Sakinah is followed by Khaa (خ). Which rule applies?',
          promptAr: 'مِنْ خَوْفٍ',
          options: [
            'Izhar Halqi (Clear pronunciation because خ is a throat letter)',
            'Iqlab (Transforming into Meem)',
            'Idgham bila Ghunnah',
            'Qalqalah Kubra',
          ],
          answer: 0,
          explain: 'Khaa (خ) is one of the 6 throat letters (ء هـ ع ح غ خ), so Noon Sakinah is pronounced clearly (Izhar).',
        },
        {
          prompt: 'Which single letter triggers the rule of Iqlab after Noon Sakinah or Tanween?',
          options: [
            'Baa (ب)',
            'Meem (م)',
            'Qaaf (ق)',
            'Seen (س)',
          ],
          answer: 0,
          explain: 'Iqlab occurs exclusively when Noon Sakinah or Tanween is followed by the letter Baa (ب).',
        },
      ],
    },
  ],
  hadith: [
    {
      id: 'hadith_niyyah',
      subject: 'hadith',
      title: 'Hadith #1: Actions Are Judged By Intentions',
      arabicTitle: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ',
      ustadhName: 'Ustadh Luqman Al-Muhaddith',
      ustadhTitle: 'Hadith Lecturer',
      chalkboard: {
        arabic: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
        transliteration: 'Innama al-a’malu bin-niyyat, wa innama li-kulli imri’in ma nawa',
        meaning: 'Actions are but by intentions, and every person shall have only that which they intended.',
      },
      summary:
        'Narrated by Umar ibn Al-Khattab (may Allah be pleased with him), this opening Hadith of Imam An-Nawawi’s 40 Hadith is described by scholars as one-third of all Islamic knowledge.',
      keyPoints: [
        {
          heading: '1. Sincerity (Ikhlas) Transforms Ordinary Acts',
          body: 'Even sleeping early in the Ruwaq or eating amala becomes an act of worship (Ibadah) when your intention is to gain strength to study and pray!',
        },
        {
          heading: '2. Guarding Against Riya’ (Showing Off)',
          body: 'A true student of knowledge studies and recites to seek Allah’s pleasure and benefit the community, not merely to be praised at ceremonies.',
        },
      ],
      practicalTakeaway:
        'Before starting every class, renew your Niyyah silently in your heart: "O Allah, I am learning this for Your sake."',
      quiz: [
        {
          prompt: 'Which companion narrated the famous Hadith "Innama al-a’malu bin-niyyat" (Actions are by intentions)?',
          options: [
            'Umar ibn Al-Khattab (رضي الله عنه)',
            'Khalid ibn Al-Walid (رضي الله عنه)',
            'Bilal ibn Rabah (رضي الله عنه)',
            'Salman Al-Farisi (رضي الله عنه)',
          ],
          answer: 0,
          explain: 'Amir al-Mu’minin Umar ibn Al-Khattab (رضي الله عنه) narrated this foundational Hadith from the pulpit.',
        },
        {
          prompt: 'Where is the place of Niyyah (intention) according to Islamic scholars?',
          options: [
            'In the heart (Al-Qalb)',
            'Only written on paper',
            'Shouted at the top of one’s voice',
            'Only valid when witnessed by three people',
          ],
          answer: 0,
          explain: 'The locus of intention (Mahall an-Niyyah) is the heart.',
        },
        {
          prompt: 'How can a student turn daily habits like eating or resting into rewarded worship?',
          options: [
            'By intending to gain energy and health for obeying Allah and seeking knowledge',
            'By eating as much as possible without saying Bismillah',
            'By boasting to classmates about how much food they bought',
            'Daily habits can never be rewarded',
          ],
          answer: 0,
          explain: 'A righteous intention elevates permissible daily habits (Mubahat) into acts of reward.',
        },
      ],
    },
  ],
  seerah: [
    {
      id: 'seerah_iqra_legacy',
      subject: 'seerah',
      title: 'From Cave Hira to the Ile-Kewu Courtyards of West Africa',
      arabicTitle: 'مِنْ غَارِ حِرَاءٍ إِلَى مَدَارِسِ غَرْبِ إِفْرِيقِيَا',
      ustadhName: 'Alfa Qasim Al-Ilori',
      ustadhTitle: 'Historian of Islamic Scholarship',
      chalkboard: {
        arabic: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
        transliteration: 'Iqra’ bismi Rabbika alladhi khalaq',
        meaning: 'Read! In the Name of your Lord Who created (Surah Al-Alaq, 96:1).',
      },
      summary:
        'The very first word revealed to Prophet Muhammad ﷺ in Cave Hira was "Iqra!" (Read/Recite). For over a thousand years, that command traveled across the Sahara to Timbuktu, Kano, Borno, Ilorin, Ibadan, and Lagos — giving birth to the vibrant Ile-Kewu tradition.',
      keyPoints: [
        {
          heading: '1. The First Revelation in Cave Hira',
          arabicSnippet: 'عَلَّمَ بِالْقَلَمِ',
          body: 'Angel Jibril embraced the Prophet ﷺ three times and revealed the opening five verses of Surah Al-Alaq, honouring reading, teaching, and the Pen (Al-Qalam).',
        },
        {
          heading: '2. The West African Madrasah Heritage',
          body: 'Centuries of West African scholars — from Sheikh Usman dan Fodio and the scholars of Timbuktu to Sheikh Adam Abdullah Al-Ilori (founder of Markaz in Agege) — modernized Arabic & Islamic classrooms across Nigeria.',
        },
      ],
      practicalTakeaway:
        'Every time you sit in the Madrasah courtyard in Ejigbo, you are part of an unbroken chain of students stretching back 1,400 years to Makkah and Madinah.',
      quiz: [
        {
          prompt: 'Which Surah contains the very first verses revealed to Prophet Muhammad ﷺ in Cave Hira?',
          promptAr: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ',
          options: [
            'Surah Al-Alaq (Chapter 96)',
            'Surah Al-Baqarah (Chapter 2)',
            'Surah Yasin (Chapter 36)',
            'Surah An-Nasr (Chapter 110)',
          ],
          answer: 0,
          explain: 'The first five verses of Surah Al-Alaq ("Iqra’ bismi Rabbika...") were the first revelation of the Quran.',
        },
        {
          prompt: 'Which renowned Nigerian scholar founded the famous Markaz Arabic & Islamic Training Centre in Agege, Lagos?',
          options: [
            'Sheikh Adam Abdullah Al-Ilori',
            'Ibn Battuta of Tangier',
            'Imam Al-Ghazali',
            'Mansa Musa of Mali',
          ],
          answer: 0,
          explain: 'Sheikh Adam Abdullah Al-Ilori (1917–1992) established Markaz in Agege, pioneering structured modern Arabic classrooms in Nigeria.',
        },
        {
          prompt: 'Which instrument of learning is explicitly praised by Allah in the fourth verse of Surah Al-Alaq ("Alladhi ’allama bil-...")?',
          options: [
            'Al-Qalam (The Pen)',
            'As-Sayf (The Sword)',
            'Ad-Dirham (The Coin)',
            'As-Safinah (The Ship)',
          ],
          answer: 0,
          explain: 'Allah says: "الَّذِي عَلَّمَ بِالْقَلَمِ" — "Who taught by the Pen."',
        },
      ],
    },
  ],
  adab: [
    {
      id: 'adab_talib_ilm',
      subject: 'adab',
      title: 'Etiquette of the Seeker of Knowledge (Adab Talib al-Ilm)',
      arabicTitle: 'آدَابُ طَالِبِ الْعِلْمِ مَعَ مُعَلِّمِهِ وَإِخْوَانِهِ',
      ustadhName: 'Alhaja Khadijah',
      ustadhTitle: 'Dean of Student Character',
      chalkboard: {
        arabic: 'بِالْأَدَبِ تَفْهَمُ الْعِلْمَ',
        transliteration: 'Bil-adabi tafhamu al-’ilma',
        meaning: 'Through good manners and etiquette, you truly understand knowledge.',
      },
      summary:
        'As Baba Kewu always reminds the compound: "Ilm without Adab is like a tree without fruit." The greatest scholars succeeded not merely by sharp memory, but by humility, punctuality, and respect for teachers and classmates.',
      keyPoints: [
        {
          heading: '1. Adab with Yourself (Purification & Punctuality)',
          body: 'Arrive early before the Ustadh sits, keep your clothes and Mushaf clean, and guard your time from idle arguments.',
        },
        {
          heading: '2. Adab with the Teacher (Tawadu’)',
          body: 'Listen attentively even if you have heard the point before, ask questions politely, and make Dua for your teachers.',
        },
        {
          heading: '3. Adab with Classmates (Brotherhood & Sisterhood)',
          body: 'Help juniors who struggle with pronunciation without mocking them, and celebrate your classmates’ achievements.',
        },
      ],
      practicalTakeaway:
        'Greet fellow students with a warm "As-salamu alaykum wa rahmatullah" and share what you learned today!',
      quiz: [
        {
          prompt: 'What is the proper Islamic etiquette when a junior student makes a mistake while reciting?',
          options: [
            'Correct them gently and encouragingly without laughing or mocking them',
            'Laugh out loud so the whole compound hears',
            'Snatch their book away and refuse to help',
            'Boast that you memorized that Surah five years ago',
          ],
          answer: 0,
          explain: 'Gentleness (Rifq) and humility with fellow learners bring Barakah into one’s own knowledge.',
        },
        {
          prompt: 'What does the classical scholarly saying "Bil-adabi tafhamu al-’ilma" teach us?',
          options: [
            'Good manners and respect are the vessel through which true knowledge is understood and retained',
            'Manners are only needed after graduating at age 40',
            'Only wealthy students need to show respect',
            'You can disrespect teachers as long as you pass quizzes',
          ],
          answer: 0,
          explain: 'Imam Malik’s mother used to tell him: "Go to Rabi’ah and learn his Adab before you learn his knowledge."',
        },
        {
          prompt: 'When entering the classroom or home, what is the Sunnah greeting that spreads peace and love?',
          options: [
            'As-salamu alaykum wa rahmatullahi wa barakatuh',
            'Walking in silently while staring at your phone',
            'Shouting people’s nicknames from the gate',
            'Knocking the door down without waiting',
          ],
          answer: 0,
          explain: 'Spreading Salam is one of the surest ways to build mutual love and earn 30 good deeds.',
        },
      ],
    },
  ],
};

/**
 * Returns today's date string in YYYY-MM-DD format.
 */
export function getTodayDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Deterministically picks the featured Subject of the Day based on day of week,
 * so all players online on the same day share the same featured daily class.
 */
export function getFeaturedSubjectForToday(): SubjectId {
  const dayOfWeek = new Date().getDay(); // 0 (Sun) .. 6 (Sat)
  const map: SubjectId[] = ['tajweed', 'nahw', 'fiqh', 'tajweed', 'hadith', 'seerah', 'adab'];
  return map[dayOfWeek] ?? 'nahw';
}

/**
 * Deterministically picks today's topic for a given subject, with shuffled quiz options.
 */
export function getDailyTopicForSubject(subject: SubjectId): DailyTopic {
  const list = CURRICULUM_TOPICS[subject];
  const dayIndex = Math.floor(Date.now() / 86400000);
  const raw = list[dayIndex % list.length] ?? list[0];
  return {
    ...raw,
    quiz: prepareMcqSet(raw.quiz),
  };
}

