import { GameEvent } from '@/types/game';

export const GAME_EVENTS: GameEvent[] = [
  // 1. The Afternoon Asr Slump
  {
    id: 'asr_dozing',
    stage: 'omo_kewu',
    title: 'The Heavy Eyelids of Asr Kewu',
    arabicTitle: 'نَوْمُ الْعَصْرِ فِي الْمَدْرَسَةِ',
    category: 'discipline',
    description: 'It is 4:45 PM. The afternoon heat is relentless, and the ceiling fan stopped working due to NEPA. Alfa is explaining the rules of "Makharij al-Huroof" (articulation points of Arabic letters). Your head nods forward, and your eyelids feel heavier than a bag of cement.',
    choices: [
      {
        id: 'splash_water',
        text: 'Quickly run to the well and splash cold water on your face',
        description: 'Take responsibility before the Alfa spots you nodding.',
        consequences: {
          statChanges: { energy: -5, taqwa: +5, barakah: +2 },
          logMessage: 'You washed your face with freezing well water. Alfa nodded approvingly at your determination.',
        },
      },
      {
        id: 'pretend_ponder',
        text: 'The "Scholar Squint": Pretend you are in deep philosophical reflection',
        description: 'Nod slowly and mutter "Masha Allah" under your breath.',
        consequences: {
          statChanges: { pasanResistance: +8, energy: -10, ilm: -2 },
          logMessage: 'Alfa threw a wooden chalk duster at your forehead. "You think you are Imam Malik contemplating Fiqh?!" You endured the strike.',
        },
      },
      {
        id: 'pinch_partner',
        text: 'Pinch your friend Moruf so he screams and distracts the class',
        description: 'Misery loves company. Shift the spotlight.',
        consequences: {
          statChanges: { taqwa: -10, barakah: -5, energy: +5 },
          logMessage: 'Moruf yelled "Subhanallah!" and got 3 cane strokes. You stayed safe, but your conscience is heavy.',
        },
      },
    ],
  },

  // 2. The Friday Saraa Arrival
  {
    id: 'friday_saraa',
    stage: 'all',
    title: 'The Great Friday Saraa Scramble',
    arabicTitle: 'طَعَامُ الصَّدَقَةِ يَوْمَ الْجُمُعَةِ',
    category: 'street',
    description: 'After Friday Jumu\'ah prayers, Alhaja Kudirat\'s catering van pulls up with huge metal coolers of steaming hot Jollof Rice, fried plantains, and gigantic cuts of beef for Sadaqah. The scent of party rice fills the courtyard, and every student\'s stomach roars.',
    choices: [
      {
        id: 'decorum_first',
        text: 'Maintain Islamic Adab: Let the little kids and elders eat first',
        description: 'Practice selfless character as taught in the Quran.',
        consequences: {
          statChanges: { taqwa: +15, barakah: +10, energy: -5 },
          logMessage: 'Alhaja Kudirat noticed your patience and gave you an extra piece of beef with a prayer: "Omo mi, wa jere!"',
        },
      },
      {
        id: 'stealth_plate',
        text: 'The "Tactical Maneuver": Slip your bowl directly under Alfa\'s reserve table',
        description: 'Why queue when you can be diplomatic with the seniors?',
        consequences: {
          statChanges: { energy: +25, naira: +200, taqwa: -5 },
          logMessage: 'You scored a mound of hot rice and ₦200 pocket money from a guest. Your stomach is rejoicing!',
        },
      },
      {
        id: 'snatch_rush',
        text: 'Join the mad scramble at the front with the street boys',
        description: 'Survival of the quickest spoon.',
        consequences: {
          statChanges: { pasanResistance: +10, energy: +15, barakah: -10 },
          logMessage: 'You fought bravely and secured a plate, but got your white Jalabiya stained with palm oil sauce.',
        },
      },
    ],
  },

  // 3. Washing the Wooden Slate (Walaah)
  {
    id: 'walaah_washing',
    stage: 'omo_kewu',
    title: 'The Sacred Walaah Washing Ritual',
    arabicTitle: 'غَسْلُ اللَّوْحِ وَكِتَابَةُ الْآيَاتِ',
    category: 'learning',
    description: 'You have finally recited Surah Al-Fil three times without a single mistake! Baba Kewu permits you to wash your wooden slate (Walaah) with sponge and cold water, let it dry under the bright sun, and prepare the soot ink (Tadaa) for the next Surah: Quraysh.',
    choices: [
      {
        id: 'thorough_wash',
        text: 'Wash the board spotless and brew fresh rich Tadaa ink from pot soot',
        description: 'Excellence in calligraphy brings Barakah.',
        consequences: {
          statChanges: { ilm: +12, taqwa: +8, energy: -10 },
          logMessage: 'Your calligraphy looks like an ancient illuminated manuscript. Baba Kewu smiled and praised your penmanship.',
        },
      },
      {
        id: 'quick_wipe',
        text: 'Rinse it half-heartedly with dirty puddle water so you can go play football',
        description: 'The street match between Mushin Boys and Agege FC is starting in 10 minutes!',
        consequences: {
          statChanges: { energy: +10, pasanResistance: +5, ilm: -5, taqwa: -8 },
          logMessage: 'The ink smeared into an illegible muddy mess. The monitor gave you 2 swift lashes with the cane.',
        },
      },
    ],
  },

  // 4. The School Exam vs Kewu Rehearsal Clash
  {
    id: 'boko_clash',
    stage: 'arowo_kewu',
    title: 'The "Boko" vs. Kewu Dilemma',
    arabicTitle: 'تَعَارُضُ الْمَدْرَسَةِ الْعَصْرِيَّةِ وَالْقُرْآنِيَّةِ',
    category: 'boko_clash',
    description: 'Your WAEC / Junior WAEC mock examination in Mathematics is tomorrow morning at 8:00 AM, but tonight is the mandatory overnight Tahajjud and Tajweed rehearsal for the upcoming zonal competition. If you miss Kewu, Baba Kewu will summon your parents. If you fail Maths, your mother will ground you forever.',
    choices: [
      {
        id: 'midnight_oil',
        text: 'The "Night Owl": Attend Kewu till 10 PM, then study Maths with flashlight till 3 AM',
        description: 'Drink strong black coffee and push your human limits.',
        consequences: {
          statChanges: { ilm: +15, energy: -30, pasanResistance: +10 },
          logMessage: 'Exhausted but triumphant! You scored 78% in Mathematics and recited Surah Al-Mulk flawlessly.',
        },
      },
      {
        id: 'tell_truth',
        text: 'Politely seek permission from Baba Kewu with a gift of kolanuts',
        description: 'Adab and transparency with your teacher.',
        consequences: {
          statChanges: { taqwa: +10, barakah: +8, naira: -500 },
          logMessage: 'Baba Kewu accepted the kolanuts and made Du\'a: "May Allah make both secular and religious knowledge easy for you."',
        },
      },
      {
        id: 'skip_lie',
        text: 'Forge a medical note claiming you have "acute malaria and typhoid"',
        description: 'The classic high-risk excuse.',
        consequences: {
          statChanges: { taqwa: -20, barakah: -10, pasanResistance: +15 },
          logMessage: 'Baba Kewu came to check on you at home and caught you eating fried yam and playing video games. Double cane strikes delivered!',
        },
      },
    ],
  },

  // 5. The Inter-Madrasah Recitation Duel
  {
    id: 'musabaqah_duel',
    stage: 'markaziy',
    title: 'The Great Lagos Musabaqah Showdown',
    arabicTitle: 'مُسَابَقَةُ تِلَاوَةِ الْقُرْآنِ الْكَرِيمِ',
    category: 'learning',
    description: 'It is the annual Zonal Quranic Recitation Competition at the Central Mosque. You are matched against Ustadh Bilal from Ilorin, renowned for his thunderous voice and mastery of the Maqamat (Bayati and Hijaz melodious tones). The auditorium is packed with thousands of spectators.',
    choices: [
      {
        id: 'recite_hadr',
        text: 'Recite in smooth, powerful Maqam Bayati with pinpoint Tajweed precision',
        description: 'Channel your months of rigorous training.',
        consequences: {
          statChanges: { ilm: +20, barakah: +25, naira: +50000 },
          logMessage: 'Takbeer! "Allahu Akbar!" reverberated through the hall. You won 1st place, a gold plaque, and ₦50,000 cash prize!',
        },
      },
      {
        id: 'showboat',
        text: 'Attempt an overly dramatic high-pitch vocal flourish to impress the crowd',
        description: 'High risk, viral glory if it works.',
        consequences: {
          statChanges: { ilm: -5, barakah: -5, pasanResistance: +5 },
          logMessage: 'Your voice cracked like dry firewood on the high note. The audience gasped, but the judges gave you consolation marks.',
        },
      },
    ],
  },

  // 6. The Grand Walimah Quran Ceremony
  {
    id: 'walimah_day',
    stage: 'markaziy',
    title: 'The Grand Walimatul Quran Graduation!',
    arabicTitle: 'حَفْلُ خَتْمِ الْقُرْآنِ وَالْوَلِيمَةُ الْكُبْرَى',
    category: 'walimah',
    description: 'THE BIGGEST DAY OF YOUR YOUTH! You have completed the entire 30 Juz of the Holy Quran. The marquee tent is decorated with gold and emerald satin. You are wearing a shimmering embroidered Agbada. A white decorated stallion horse (Esin Walimah) is waiting for your grand entrance!',
    choices: [
      {
        id: 'mount_horse',
        text: 'Mount the horse gallantly and deliver your Arabic Khutbah with tears of gratitude',
        description: 'A moment of supreme dignity and family pride.',
        consequences: {
          statChanges: { ilm: +25, taqwa: +20, barakah: +30, naira: +150000 },
          logMessage: 'Your mother wept tears of joy! Relatives and community elders showered you with bundles of new Naira notes. You have graduated to a recognized Scholar!',
        },
      },
      {
        id: 'humble_foot',
        text: 'Decline the lavish horse and enter on foot reciting Surah Ar-Rahman',
        description: 'True humility of the righteous scholars.',
        consequences: {
          statChanges: { taqwa: +35, barakah: +20, ilm: +15 },
          logMessage: 'The Chief Imam took off his turban and placed it upon your head in reverence for your genuine piety.',
        },
      },
    ],
  },

  // 7. The Modern Media Alfa Dilemma
  {
    id: 'viral_preacher',
    stage: 'sheikh_agba',
    title: 'The Viral TikTok / Instagram Fatwa Dilemma',
    arabicTitle: 'شُهْرَةُ مَوَاقِعِ التَّوَاصُلِ وَالْفَتْوَى',
    category: 'street',
    description: 'You are now an established Alfa. A media interviewer asks you a spicy, controversial question about music, politics, and relationships. Giving an outrageous, inflammatory answer will get you 5 million views on TikTok and huge invitation fees, but may compromise theological integrity.',
    choices: [
      {
        id: 'nuanced_truth',
        text: 'Deliver a balanced, scholarly answer grounded in Classical Fiqh and wisdom',
        description: 'Protect your Akhirah and the dignity of Islamic scholarship.',
        consequences: {
          statChanges: { ilm: +15, taqwa: +25, barakah: +20 },
          logMessage: 'University professors and traditional scholars shared your clip as a masterclass in Islamic jurisprudence.',
        },
      },
      {
        id: 'viral_drama',
        text: 'Scream theatrically into the microphone: "Olorun gbo! Anybody that wears jeans is in trouble!"',
        description: 'Instant viral meme fame on Nigerian Twitter/X and Instagram.',
        consequences: {
          statChanges: { naira: +300000, barakah: -20, taqwa: -15 },
          logMessage: 'Your sound became the #1 trending audio on TikTok! You got 10 Walimah invites and ₦300k, but the Council of Ulamas issued a stern warning letter.',
        },
      },
    ],
  },
];
