export interface MinigameInfo {
  id: 'football' | 'ayo' | 'tenten' | 'suwe' | 'skipping' | 'catcher' | 'quiz_duel' | 'throw';
  name: string;
  category: 'sports' | 'board' | 'traditional' | 'academic';
  description: string;
  botName: string;
  botTitle: string;
  howToPlay: {
    objective: string;
    controls: string;
    winning: string;
  };
  rewardText: string;
}

export const MINIGAMES: Record<string, MinigameInfo> = {
  football: {
    id: 'football',
    name: 'Ping Pong',
    category: 'sports',
    description:
      'Fast-paced table soccer duel! Slide your goalkeeper and striker rods to bounce the ball across the pitch and score in the monkey post.',
    botName: 'Captain Ridwan',
    botTitle: 'Madrasah Sports Prefect',
    howToPlay: {
      objective: 'Bounce the ball past your opponent’s defenders and slide it into their net.',
      controls: 'Drag your finger / mouse across the rod or press ← and → (or A and D) keys to slide your paddles.',
      winning: 'First scholar to score 3 goals wins the match!',
    },
    rewardText: 'Win ₦500 - ₦1,200 & Agility Points',
  },
  ayo: {
    id: 'ayo',
    name: 'Ayo',
    category: 'board',
    description:
      'The classic Yoruba mancala of wits and calculation! Pick seeds from your pits, sow them counter-clockwise, and capture your opponent’s seeds.',
    botName: 'Baba Ayo',
    botTitle: 'Compound Elder & Master Player',
    howToPlay: {
      objective: 'Capture seeds from your opponent’s side by landing your final seed to make 2 or 3 seeds in their pit.',
      controls: 'Tap any pit on your side (bottom row) that contains seeds to pick up and sow.',
      winning: 'Capture 25 or more seeds (half the board) to win the game!',
    },
    rewardText: 'Win ₦800 - ₦1,000 & Ilm Points',
  },
  tenten: {
    id: 'tenten',
    name: 'Tinko-Tinko',
    category: 'traditional',
    description:
      'Traditional Nigerian rhythm and foot-clapping duel! Read your opponent’s rhythm and anticipate which foot they will strike with.',
    botName: 'Zainab',
    botTitle: 'Quick-Footed Classmate',
    howToPlay: {
      objective: 'When attacking, pick the SAME foot as your opponent to score. When defending, pick the OPPOSITE foot to dodge!',
      controls: 'Tap LEFT FOOT or RIGHT FOOT before the rhythm beat concludes.',
      winning: 'First scholar to reach 5 points wins the duel!',
    },
    rewardText: 'Win ₦1,000 & Reflex Resistance',
  },
  suwe: {
    id: 'suwe',
    name: 'Suwe',
    category: 'traditional',
    description:
      'Nigerian courtyard hopscotch! Toss your tile into the chalk court, balance on one foot through the boxes, and claim your home square.',
    botName: 'Amina',
    botTitle: 'Courtyard Champion',
    howToPlay: {
      objective: 'Hop through the chalk squares in sequence without stepping on lines or losing balance.',
      controls: 'Tap the matching box rhythmically when the target pulses green.',
      winning: 'Clear all numbered boxes without faulting to claim victory!',
    },
    rewardText: 'Win ₦600 & Balance Barakah',
  },
  skipping: {
    id: 'skipping',
    name: 'Skipping Rope',
    category: 'traditional',
    description:
      'High-energy rope skipping! Keep up with the Madrasah songs and leap over the spinning rope at the perfect moment.',
    botName: 'Bilal',
    botTitle: 'Yard Skipper',
    howToPlay: {
      objective: 'Jump over the rope on every swing without getting caught in the loops.',
      controls: 'Tap JUMP or press Spacebar just as the rope hits the ground.',
      winning: 'Survive 30 consecutive jumps to earn the jumping champion title!',
    },
    rewardText: 'Win ₦500 & Stamina Energy',
  },
  catcher: {
    id: 'catcher',
    name: 'Boju-Boju',
    category: 'traditional',
    description:
      'Nigerian hide-and-seek dodge game! Gather scattered prayer beads and coins while dodging the playful chasers across the field.',
    botName: 'Moruf',
    botTitle: 'Playground Seeker',
    howToPlay: {
      objective: 'Collect glowing coins and Tasbih beads before the timer runs out.',
      controls: 'Use directional arrows or swipe to maneuver across the court.',
      winning: 'Reach the collection quota before time expires!',
    },
    rewardText: 'Win ₦600 & Alertness',
  },
  quiz_duel: {
    id: 'quiz_duel',
    name: 'Quiz Duel',
    category: 'academic',
    description:
      'Fast-paced Musabaqah academic speed duel! Test your speed and precision on Tajweed rules, Arabic Nahw, and Quranic knowledge.',
    botName: 'Ustadh Luqman',
    botTitle: 'Tajweed Instructor',
    howToPlay: {
      objective: 'Answer 5 multiple-choice Quranic questions correctly before your opponent.',
      controls: 'Tap the correct option for each question before the 15-second timer runs out.',
      winning: 'Score the highest combined points (speed + accuracy) across 5 rounds!',
    },
    rewardText: 'Win ₦1,000 Pot & Ilm Boost',
  },
  throw: {
    id: 'throw',
    name: 'Throw',
    category: 'sports',
    description:
      'Snowball fight! Pull back to aim. Release to throw. Hit your opponent. First to reduce their opponent’s health to zero wins!',
    botName: 'Snow Fighter Faruq',
    botTitle: 'Madrasah Sharp Thrower',
    howToPlay: {
      objective: 'Deplete your opponent’s health to zero by launching accurate snowballs across the snow arena.',
      controls: 'Tap and drag backwards to adjust angle & force. The live HUD displays Angle & Force. Release to throw!',
      winning: 'Direct body hits deal 20-25 damage. Headshots deal devastating critical damage (45+ damage)!',
    },
    rewardText: 'Win ₦1,000 & Focus Reflexes',
  },
};
