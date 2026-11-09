'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { subscribeMatchRoom, syncMatchRoomMove, publishMinbarPostToCloud } from '@/lib/firebase';
import { Trophy, Swords, Sparkles, CheckCircle2, XCircle, Clock, Award } from 'lucide-react';

interface DuelQuestion {
  id: number;
  question: string;
  arabic?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const DUEL_QUESTIONS: DuelQuestion[] = [
  {
    id: 1,
    question: 'When a Noon Sakinah (نْ) or Tanween meets the letter Baa (ب), which Tajweed rule applies?',
    arabic: 'مِنْ بَعْدِ',
    options: ['Izhar (Clear)', 'Iqlab (Transform to Meem)', 'Idgham (Merge)', 'Ikhfa (Hide)'],
    correctIndex: 1,
    explanation: 'Iqlab transforms the Noon sound into a soft Meem with Ghunnah.',
  },
  {
    id: 2,
    question: 'Which of the following belongs to the Qalqalah (echo sound) group (ق ط ب ج د)?',
    options: ['Seen (س)', 'Daal (د)', 'Raa (ر)', 'Lam (ل)'],
    correctIndex: 1,
    explanation: 'Daal (د) is one of the five Qalqalah letters: Qaf, Taa, Baa, Jeem, Daal.',
  },
  {
    id: 3,
    question: 'In Arabic grammar (Nahw), what is the default vowel ending for the subject (Al-Faa\'il)?',
    arabic: 'جَاءَ زَيْدٌ',
    options: ['Dhammah (Marfoo\')', 'Fathah (Mansoub)', 'Kasrah (Majroor)', 'Sukoon (Majzoom)'],
    correctIndex: 0,
    explanation: 'The doer of the verb (Al-Faa\'il) is always in the state of Raf\' (Dhammah).',
  },
  {
    id: 4,
    question: 'What is the literal meaning of the Yoruba madrasah term "Ile-Kewu"?',
    options: ['House of Charity', 'House of Quranic Learning & Reading', 'The Palace of Kings', 'House of Solat'],
    correctIndex: 1,
    explanation: '"Ile" means home, and "Kewu" is the Yoruba root for reading and recitation of the Quran.',
  },
  {
    id: 5,
    question: 'Which is famously known as the shortest Surah in the Holy Quran (3 verses)?',
    arabic: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
    options: ['Surah Al-Ikhlas', 'Surah Al-Asr', 'Surah Al-Kawthar', 'Surah An-Nasr'],
    correctIndex: 2,
    explanation: 'Surah Al-Kawthar consists of 3 brief and powerful verses.',
  },
];

export const QuizDuelGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const player = useGameStore((s) => s.player);
  const authUser = useGameStore((s) => s.authUser);
  const activeMatchRoom = useGameStore((s) => s.activeMatchRoom);
  const setActiveMatchRoom = useGameStore((s) => s.setActiveMatchRoom);
  const reward = useGameStore((s) => s.reward);

  const myUid = authUser?.uid || player.id;
  const isMultiplayer = Boolean(activeMatchRoom && activeMatchRoom.gameType === 'quiz_duel');
  const isPlayer1 = isMultiplayer ? myUid === activeMatchRoom!.player1Uid : true;
  const opponentName = isMultiplayer
    ? isPlayer1
      ? activeMatchRoom!.player2Name
      : activeMatchRoom!.player1Name
    : 'Ustadh Luqman';

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [myAnswers, setMyAnswers] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [oppFinished, setOppFinished] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const rewarded = useRef(false);
  const roomStateRef = useRef<Record<string, any>>({});

  useEffect(() => {
    roomStateRef.current = activeMatchRoom?.state || {};
  }, [activeMatchRoom?.state]);

  useEffect(() => {
    return () => {
      if (isMultiplayer) {
        useGameStore.getState().setActiveMatchRoom(null);
      }
    };
  }, [isMultiplayer]);

  // Subscribe to live Firestore match room for cross-device multiplayer
  useEffect(() => {
    if (!isMultiplayer || !activeMatchRoom) return;

    const unsub = subscribeMatchRoom(activeMatchRoom.id, (room) => {
      if (!room || !room.state) return;
      setActiveMatchRoom(room);
      const st = room.state;

      const p1S = st.p1Score ?? 0;
      const p2S = st.p2Score ?? 0;
      const p1Done = Boolean(st.p1Done);
      const p2Done = Boolean(st.p2Done);

      setMyScore(isPlayer1 ? p1S : p2S);
      setOppScore(isPlayer1 ? p2S : p1S);
      setOppFinished(isPlayer1 ? p2Done : p1Done);

      if (room.winnerUid && !rewarded.current) {
        rewarded.current = true;
        if (room.winnerUid === myUid) {
          reward(
            { naira: 1000, ilm: 8, barakah: 6, energy: -3 },
            `🏆 Won Classroom Musabaqah Duel vs ${opponentName} (${isPlayer1 ? p1S : p2S} vs ${isPlayer1 ? p2S : p1S} pts)! Claimed ₦1,000 prize pot!`,
          );
          publishMinbarPostToCloud({
            authorName: player.name,
            authorStage: player.stage,
            text: `📖🏆 Alhamdulillah! Just won a live Musabaqah Classroom Speed Duel against ${opponentName} (${isPlayer1 ? p1S : p2S} vs ${isPlayer1 ? p2S : p1S} pts) and claimed the ₦1,000 prize pot! 📿✨`,
            likes: 3,
            takbeers: 7,
            timestamp: Date.now(),
          });
        } else if (room.winnerUid === 'tie') {
          reward({ ilm: 4, barakah: 3 }, `Honorable tie in Musabaqah Duel against ${opponentName}!`);
        } else {
          reward({ ilm: 3, barakah: 2 }, `Participated in Musabaqah Duel against ${opponentName}. Good revision!`);
        }
      }
    });

    return () => unsub();
  }, [isMultiplayer, activeMatchRoom?.id, isPlayer1, myUid, opponentName, player.name, player.stage, reward, setActiveMatchRoom]);

  // Per-question timer
  useEffect(() => {
    if (isFinished || selectedOpt !== null) return;
    setTimerSeconds(15);
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAnswer(-1); // Timed out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIdx, isFinished, selectedOpt]);

  const handleAnswer = (optionIdx: number) => {
    if (selectedOpt !== null || isFinished) return;
    setSelectedOpt(optionIdx);

    const q = DUEL_QUESTIONS[currentIdx];
    const isCorrect = optionIdx === q.correctIndex;
    const pointsGained = isCorrect ? 10 + Math.max(0, timerSeconds) : 0;
    const newMyScore = myScore + pointsGained;

    if (isCorrect) sound.playTakbeer();
    else sound.playPasan();

    setMyScore(newMyScore);
    const newAnswers = { ...myAnswers, [currentIdx]: isCorrect };
    setMyAnswers(newAnswers);

    const isLast = currentIdx + 1 >= DUEL_QUESTIONS.length;

    // Sync score to Firestore in multiplayer
    if (isMultiplayer && activeMatchRoom) {
      const curState = roomStateRef.current;
      const p1S = isPlayer1 ? newMyScore : oppScore;
      const p2S = isPlayer1 ? oppScore : newMyScore;
      const p1Done = isPlayer1 ? isLast : Boolean(curState.p1Done);
      const p2Done = isPlayer1 ? Boolean(curState.p2Done) : isLast;

      let winnerUid: string | undefined = undefined;
      if (p1Done && p2Done) {
        if (p1S > p2S) winnerUid = activeMatchRoom.player1Uid;
        else if (p2S > p1S) winnerUid = activeMatchRoom.player2Uid;
        else winnerUid = 'tie';
      }

      syncMatchRoomMove(
        activeMatchRoom.id,
        {
          ...curState,
          p1Score: p1S,
          p2Score: p2S,
          p1Done,
          p2Done,
          msg: `${player.name} answered Question ${currentIdx + 1}!`,
        },
        isPlayer1 ? 'player2' : 'player1',
        winnerUid,
      );
    }

    setTimeout(() => {
      if (isLast) {
        setIsFinished(true);
        if (!isMultiplayer && !rewarded.current) {
          rewarded.current = true;
          if (newMyScore >= 35) {
            reward({ naira: 800, ilm: 6, barakah: 4 }, `Won practice duel against ${opponentName} with ${newMyScore} pts!`);
          } else {
            reward({ ilm: 2 }, `Completed practice duel against ${opponentName}.`);
          }
        }
      } else {
        setSelectedOpt(null);
        setCurrentIdx((i) => i + 1);
      }
    }, 1300);
  };

  const q = DUEL_QUESTIONS[currentIdx];
  const gameOver = isFinished && (!isMultiplayer || oppFinished || activeMatchRoom?.winnerUid);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-xl mx-auto">
      {/* Live Duel Header */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 border border-amber-500/40 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              {isMultiplayer ? 'Live 1v1 Classroom Duel' : 'Classroom Musabaqah Practice'}
            </h3>
          </div>
          {isMultiplayer && (
            <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Different Devices Synced
            </span>
          )}
        </div>

        {/* Live Head-to-Head Scoreboard */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-emerald-400">YOU ({player.name})</div>
              <div className="text-xl font-black text-white">{myScore} <span className="text-xs font-normal text-stone-400">pts</span></div>
            </div>
            <div className="text-xs font-bold text-stone-400">
              {Object.keys(myAnswers).length}/5 Qs
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-amber-400">{opponentName}</div>
              <div className="text-xl font-black text-white">{oppScore} <span className="text-xs font-normal text-stone-400">pts</span></div>
            </div>
            <div className="text-xs font-bold text-stone-400">
              {oppFinished ? 'Done ✓' : 'Competing...'}
            </div>
          </div>
        </div>
      </div>

      {!gameOver ? (
        <div className="bg-white border-2 border-stone-200 rounded-2xl p-5 space-y-4 shadow-sm">
          {/* Question Header & Countdown */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-xs font-bold text-stone-500">
              Question {currentIdx + 1} of {DUEL_QUESTIONS.length}
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs font-extrabold">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span>{timerSeconds}s</span>
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-2">
            {q.arabic && (
              <div className="text-center font-arabic text-xl sm:text-2xl text-emerald-900 font-bold py-1 bg-emerald-50/60 rounded-xl">
                {q.arabic}
              </div>
            )}
            <h4 className="font-extrabold text-sm sm:text-base text-stone-900 leading-snug">
              {q.question}
            </h4>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {q.options.map((opt, i) => {
              const isSelected = selectedOpt === i;
              const isCorrect = i === q.correctIndex;
              let style = 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800';
              if (selectedOpt !== null) {
                if (isCorrect) style = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold shadow';
                else if (isSelected) style = 'bg-rose-100 border-rose-500 text-rose-950';
                else style = 'bg-stone-50 border-stone-200 opacity-50';
              }

              return (
                <button
                  key={i}
                  disabled={selectedOpt !== null}
                  onClick={() => handleAnswer(i)}
                  className={`p-3 rounded-xl border-2 text-left text-xs sm:text-sm transition cursor-pointer flex items-center justify-between ${style}`}
                >
                  <span>{opt}</span>
                  {selectedOpt !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {selectedOpt !== null && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {selectedOpt !== null && (
            <div className="text-xs bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl animate-in fade-in">
              <span className="font-bold">Explanation:</span> {q.explanation}
            </div>
          )}
        </div>
      ) : (
        /* Game Over Podium Card */
        <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 text-center space-y-4 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-400 mx-auto flex items-center justify-center text-amber-600 shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-black text-stone-900">
              {myScore > oppScore ? '🏆 Victory! Duel Won!' : myScore === oppScore ? '🤝 An Honorable Tie!' : '🥈 Match Concluded!'}
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Final Score: <b>{player.name} ({myScore} pts)</b> vs <b>{opponentName} ({oppScore} pts)</b>
            </p>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 max-w-sm mx-auto text-xs text-stone-700">
            {myScore > oppScore
              ? `Masha Allah! You outpaced ${opponentName} in Tajweed and Arabic grammar to claim the ₦1,000 pot and scholar honor!`
              : myScore === oppScore
              ? 'Both scholars showed exceptional knowledge of Quranic sciences. Balanced wisdom!'
              : `${opponentName} answered faster this round. Keep revising your daily lessons to claim the rematch!`}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (isMultiplayer) setActiveMatchRoom(null);
                onClose();
              }}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md cursor-pointer transition"
            >
              Back to Madrasah
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
