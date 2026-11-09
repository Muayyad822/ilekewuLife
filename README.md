# 🇳🇬 Ile-Kewu Life (إِلَى كِتَابِ اللَّهِ)

> **The Authentic Nigerian Arabic School (Ile-Kewu) 3D Life & Culture Simulator**

[![Next.js](https://img.shields.io/badge/Next.js-16.4.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.187-black?logo=three.js)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-ffca28?logo=firebase)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-green?logo=pwa)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

---

## 📖 Overview

**Ile-Kewu Life** is an immersive 3D role-playing and life simulation web game set in traditional Nigerian Arabic and Quranic schools (*Ile-Kewu* / *Madrasah*).

Players experience the nostalgic, rigorous, and culturally vibrant journey of a young Nigerian student: starting from holding a wooden slate (*Wàláà*) and dodging the disciplinarian's cane (*Ọ̀pá / Pásán*), fetching water from the neighborhood well, boarding Danfo buses through Lagos streets, challenging peers in traditional street games, mastering the Quran and Arabic sciences through spaced repetition, and rising through the ranks of scholarship to become a revered **Sheikh Àgbà**.

---

## ✨ Key Features

### 🌍 3D Lagos & Madrasah World
- **Explorable 3D Districts**: Roam between the central **Madrasah & Mosque Compound**, **Lagos East (Isale Eko / Island)**, and **West Districts**, powered by Three.js.
- **Dynamic Nigerian Streetscape**: Yellow Danfo commercial buses, Okada bikes, street food vendors, water wells, and bustling neighborhood spots.
- **Custom 3D Characters**: Dress in tailored jalabiyas/robes, turbans, kofias, hijabs, or native filà caps, holding iconic props like the *Wàláà* slate, kettle (*kòtò*), or prayer beads (*tasbīḥ*).

### 🎓 Spaced Repetition Curriculum (SRS)
- **Comprehensive Islamic & Arabic Sciences**:
  - **Ḥurūf & Tajwīd**: Arabic alphabet and Quranic phonetic rules.
  - **Naḥw & Ṣarf**: Classical Arabic grammar and morphology.
  - **Fiqh & Ḥadīth**: Islamic jurisprudence and prophetic traditions.
  - **Sīrah & Ādāb**: Prophetic biography, moral character, and etiquette.
- **Leitner Box SRS Engine**: Dynamic review scheduling, daily review streaks, lesson crowns, and grace periods for streak recovery.

### 🎮 Nostalgic Nigerian Recreation & Minigames
- **Ten-Ten**: Fast-paced traditional clapping and jumping reflex minigame against the clock or peers.
- **Ayo Olọ́pọ́n**: Authentic Yoruba 12-pit Mancala board game with complete capture mechanics and AI/multiplayer modes.
- **Sùwé**: Traditional chalk-grid hopscotch game.
- **Street Football**: Penalty shootout and target practice with wind simulation, shot curve, and goalkeeper physics.
- **Throw Minigame**: Precision street toss challenge targeting cans and markers.
- **Quiz Duel**: Real-time and asynchronous head-to-head Arabic and Islamic knowledge showdowns with virtual Naira wagers.
- **Skipping & Catcher (Tag)**: Playground stamina-building activities.

### 📊 RPG Stats & Discipline Engine
- **Core Character Stats**:
  - `Ilm` (Islamic Knowledge & Arabic Fluency)
  - `Taqwa` (Piety & Ethical Character)
  - `Energy` (Daily Stamina for study, sports, and chores)
  - `Pasan Resistance` (Physical & mental resilience against the teacher's whip!)
  - `Naira (₦)` (Virtual currency earned from chores, duels, and competitions)
  - `Barakah` (Spiritual acclaim and communal standing)
- **Four Stages of Scholar Progression**:
  1. **Ọmọ Kéwú** *(Novice / Slate Carrier)*
  2. **Arọ́wọ́ Kéwú** *(Senior Student & Classroom Monitor)*
  3. **Markaziy** *(Advanced Collegiate Scholar)*
  4. **Sheikh Àgbà** *(Eminent Grand Scholar & Community Leader)*

### 💬 The Minbar & Multiplayer Social Hub
- **The Minbar Feed**: Community social feed featuring audio voice clips, recitations, reflections, Takbeers, and scholarly discussions.
- **Real-Time Peer Discovery**: See live online students walking across the Madrasah grounds and districts.
- **Private Chat & Audio Messages**: Voice notes and direct messaging with peers.
- **Wagered Challenges**: Propose and accept friendly wagers in Naira for minigame battles.

### 🏡 Housing & Lifestyle Simulation
- Progress through housing tiers: **Ruwāq Boarding Quarters** ➡️ **Shared Room** ➡️ **Mini Flat** ➡️ **Personal Villa**.
- Interactive 3D furniture customization and room layouts.

### 📱 Progressive Web App (PWA)
- Installable on mobile devices (Android & iOS) and desktop.
- Touch-optimized HUD, landscape/portrait responsiveness, and offline caching via Service Worker.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Frontend UI** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **3D Engine** | [Three.js](https://threejs.org/) |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs/) (with persistence & sync) |
| **Backend & Cloud** | [Firebase](https://firebase.google.com/) (Authentication, Cloud Firestore, Real-Time Presence) |
| **Audio** | HTML5 Audio & Web Audio API synthesis |
| **PWA & Offline** | Custom Service Worker cache strategy, Web App Manifest |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) version **20.x** or higher
- [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), [yarn](https://yarnpkg.com/), or [bun](https://bun.sh/)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ilekewuLife.git
cd ilekewuLife
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Configure Environment Variables
Copy the sample environment file to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Firebase credentials in `.env.local` (optional for local offline play, required for live multiplayer and cloud sync):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ilekewu-life.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ilekewu-life
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ilekewu-life.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to enter the Madrasah!

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 📁 Project Architecture

```
ilekewuLife/
├── public/                 # Static assets, 3D textures, PWA manifest & icons, service worker
│   ├── manifest.json       # PWA manifest configuration
│   └── sw.js               # Service Worker for offline asset caching
├── src/
│   ├── app/                # Next.js App Router root layout, metadata, globals.css
│   │   ├── layout.tsx      # Fonts, viewport, PWA registration, and global themes
│   │   └── page.tsx        # Main game canvas & viewport mounting
│   ├── components/         # Core game UI and modular interfaces
│   │   ├── ThreeWorld/     # 3D Lagos environment, procedural city, and character models
│   │   │   ├── LagosWorld.tsx       # Three.js canvas, lighting, camera, and district rendering
│   │   │   ├── characterBuilder.ts  # Modular 3D avatar & garment geometry
│   │   │   └── worldBuilders.ts     # Procedural buildings, roads, mosques, and street props
│   │   ├── Activities.tsx           # Errands for Alfa, chores, well visits, and bus rides
│   │   ├── ClassroomView.tsx        # Spaced repetition curriculum flashcards and lesson views
│   │   ├── FootballMinigame.tsx     # 2D/3D street football & penalty game
│   │   ├── GameHud.tsx              # Top stats HUD, bottom navigation dock, and panel drawer
│   │   ├── MinbarFeed.tsx           # Voice clips, reflections, social posts, and comments
│   │   ├── PrivateChatModal.tsx     # Direct messaging, voice notes, and game challenge invites
│   │   ├── ProfileView.tsx          # Character customization, housing upgrades, 3D furniture
│   │   ├── QuizDuelGame.tsx         # Head-to-head multiplayer trivia duel
│   │   ├── RecreationGames.tsx      # Ten-Ten, Ayo Olopon, Suwe, Skipping, and Catcher
│   │   └── ThrowMinigame.tsx        # Target throwing minigame
│   ├── data/               # Game content, question banks, curriculum, and items
│   │   ├── curriculum.ts   # Detailed Arabic & Islamic curriculum syllabus
│   │   ├── events.ts       # Dynamic narrative encounters, moral dilemmas, and choices
│   │   ├── lessons.ts      # Structured learning modules and flashcard data
│   │   ├── minigames.ts    # Minigame configuration and rules
│   │   └── shop.ts         # In-game items, robes, caps, books, and lifestyle assets
│   ├── lib/                # Utilities and integrations
│   │   ├── audio.ts        # Sound effects and procedural audio synthesizer
│   │   ├── firebase.ts     # Firebase client SDK, Firestore collections, presence listeners
│   │   ├── srs.ts          # Spaced Repetition (SRS) interval calculations
│   │   └── time.ts         # Prayer times, in-game calendar, and day-night logic
│   ├── store/              # State management
│   │   └── gameStore.ts    # Master Zustand store (stats, inventory, multiplayer, UI state)
│   └── types/              # TypeScript interfaces and game schemas
│       └── game.ts         # Profile, stats, multiplayer, housing, and activity types
```

---

## 📜 Cultural & Lore Glossary

- **Ile-Kewu**: Traditional Yoruba term for an Arabic or Islamic Madrasah.
- **Wàláà**: The wooden writing board (*lawḥ*) traditionally washed and reused to write Quranic verses.
- **Pásán / Ọ̀pá**: The disciplinary cane used by teachers to maintain strict decorum and focus.
- **Alfa**: An Islamic teacher or scholar in Southwestern Nigeria.
- **Ayo Olọ́pọ́n**: "Game of the wooden board" — the historic Yoruba strategy game of seed capture.
- **Ten-Ten**: A popular, rhythmic Nigerian playground game requiring fast synchronization of feet and hands.
- **Danfo**: The iconic yellow commercial transit buses traversing the streets of Lagos.

---

## 🤝 Contributing

Contributions are warmly welcomed! You can contribute in many ways:
- Adding more curriculum lessons and flashcards in [curriculum.ts](file:///c:/Users/USER/Desktop/ilekewuLife/src/data/curriculum.ts)
- Creating new narrative dilemma events in [events.ts](file:///c:/Users/USER/Desktop/ilekewuLife/src/data/events.ts)
- Enhancing 3D environments, audio soundscapes, or minigame physics
- Reporting bugs or proposing new feature ideas via GitHub Issues

```bash
# Fork the repository, create your feature branch:
git checkout -b feature/amazing-feature

# Commit your changes:
git commit -m "feat: add new tajweed lessons"

# Push to your branch and open a Pull Request:
git push origin feature/amazing-feature
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

*Bārakallāhu fīkum! Welcome to the life of an Ọmọ Kéwú.* 🌙📖
