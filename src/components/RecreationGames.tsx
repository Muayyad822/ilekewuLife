'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { sound } from '@/lib/audio';
import { RotateCcw, X } from 'lucide-react';

// ============================================================================
// Recreation-ground games (free to play, gender-neutral, cash gifts for winning)
// ============================================================================

interface GameProps {
  onClose: () => void;
}
interface InnerProps extends GameProps {
  onAgain: () => void;
}

/** Wraps a game so "Play Again" simply remounts it with fresh state. */
const withReplay = (Inner: React.FC<InnerProps>): React.FC<GameProps> => {
  const Wrapped: React.FC<GameProps> = ({ onClose }) => {
    const [round, setRound] = useState(0);
    return <Inner key={round} onClose={onClose} onAgain={() => setRound((r) => r + 1)} />;
  };
  return Wrapped;
};

const ResultCard: React.FC<{
  emoji: string;
  title: string;
  message: string;
  onAgain: () => void;
  onClose: () => void;
}> = ({ emoji, title, message, onAgain, onClose }) => (
  <div className="absolute inset-0 z-10 bg-black/75 flex flex-col items-center justify-center p-5 text-center text-white gap-3">
    <div className="text-4xl">{emoji}</div>
    <h4 className="font-extrabold text-lg text-amber-300">{title}</h4>
    <p className="text-xs text-stone-200 max-w-xs">{message}</p>
    <div className="flex items-center gap-2 mt-1">
      <button
        onClick={onAgain}
        className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Play Again
      </button>
      <button
        onClick={onClose}
        className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
      >
        <X className="w-3.5 h-3.5" /> Back to Field
      </button>
    </div>
  </div>
);

const GameHeader: React.FC<{ title: string; subtitle: string; badge?: string }> = ({ title, subtitle, badge }) => (
  <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
    <div>
      <h3 className="font-extrabold text-base text-stone-900">{title}</h3>
      <p className="text-xs text-stone-500">{subtitle}</p>
    </div>
    {badge && (
      <span className="shrink-0 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
        {badge}
      </span>
    )}
  </div>
);

// ============================================================================
// 1. TINKO-TINKO — foot-clapping duel (rhythm & reading your opponent)
// ============================================================================
type Foot = 'L' | 'R';
const TENTEN_TARGET = 5;

const TenTenInner: React.FC<InnerProps> = ({ onClose, onAgain }) => {
  const reward = useGameStore((s) => s.reward);
  const [you, setYou] = useState(0);
  const [her, setHer] = useState(0);
  const [roundNo, setRoundNo] = useState(0);
  const [phase, setPhase] = useState<'pick' | 'result' | 'done'>('pick');
  const [flash, setFlash] = useState<{ mine: Foot | null; hers: Foot; text: string; good: boolean } | null>(null);
  const [history, setHistory] = useState<Foot[]>([]);
  const rewarded = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const role: 'attack' | 'defend' = roundNo % 2 === 0 ? 'attack' : 'defend';

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const resolve = useCallback(
    (mine: Foot | null) => {
      const last = history[history.length - 1];
      // Zainab tends to repeat her previous foot — watch the pattern!
      const hers: Foot = last && Math.random() < 0.6 ? last : Math.random() < 0.5 ? 'L' : 'R';
      const match = mine !== null && mine === hers;
      let youPt = 0;
      let herPt = 0;
      let text = '';
      if (role === 'attack') {
        if (match) {
          youPt = 1;
          text = 'Matched her foot! Point to you!';
        } else {
          text = mine === null ? 'Too slow!' : 'Missed her foot.';
        }
      } else if (match || mine === null) {
        herPt = 1;
        text = mine === null ? 'Too slow — she scores!' : 'She matched you — point to her!';
      } else {
        text = 'Dodged! Safe this round.';
      }
      const ny = you + youPt;
      const nh = her + herPt;
      setYou(ny);
      setHer(nh);
      setHistory((h) => [...h.slice(-5), hers]);
      setFlash({ mine, hers, text, good: youPt > 0 || (role === 'defend' && herPt === 0) });
      setPhase('result');
      if (youPt || (role === 'defend' && !herPt)) sound.playTakbeer();
      else sound.playPasan();

      if (ny >= TENTEN_TARGET || nh >= TENTEN_TARGET) {
        timers.current.push(
          setTimeout(() => {
            if (!rewarded.current) {
              rewarded.current = true;
              if (ny >= TENTEN_TARGET) {
                reward(
                  { naira: 600, barakah: 4, pasanResistance: 3, energy: -5 },
                  `Beat Zainab ${ny}-${nh} at Tinko-Tinko! Won ₦600 & sharper reflexes.`,
                );
              } else {
                reward(
                  { pasanResistance: 1, energy: -4 },
                  `Lost a close Tinko-Tinko duel to Zainab (${ny}-${nh}). Good exercise! (+1 Agility)`,
                );
              }
            }
            setPhase('done');
          }, 1100),
        );
      } else {
        timers.current.push(
          setTimeout(() => {
            setRoundNo((r) => r + 1);
            setPhase('pick');
          }, 1100),
        );
      }
    },
    [history, role, you, her, reward],
  );

  useEffect(() => {
    if (phase !== 'pick') return;
    const t = setTimeout(() => resolve(null), 1900);
    return () => clearTimeout(t);
  }, [phase, resolve]);

  const won = you >= TENTEN_TARGET;

  return (
    <div className="p-5 space-y-4 relative">
      <GameHeader
        title="👯 Tinko-Tinko — Foot-Clapping Duel"
        subtitle="Clap the rhythm, then show Left or Right foot before the bar runs out!"
        badge="Win ₦600"
      />

      <div className="flex items-center justify-between bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold">
        <span className="text-sky-300">YOU: {you}</span>
        <span className="text-amber-300">FIRST TO {TENTEN_TARGET}</span>
        <span className="text-rose-300">ZAINAB: {her}</span>
      </div>

      <div
        className={`text-center text-xs font-extrabold px-3 py-2 rounded-xl ${
          role === 'attack' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
        }`}
      >
        {role === 'attack'
          ? '⚔️ YOUR TURN TO ATTACK — match Zainab’s foot to score!'
          : '🛡️ DEFEND — show the OPPOSITE foot so she can’t match you!'}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-semibold">
        Zainab&apos;s recent feet:
        {history.length === 0 && <span>—</span>}
        {history.map((f, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono font-bold">
            {f === 'L' ? 'Left' : 'Right'}
          </span>
        ))}
      </div>

      <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
        {phase === 'pick' && (
          <div key={roundNo} className="h-full bg-amber-500" style={{ animation: 'kw-shrink 1.9s linear forwards' }} />
        )}
      </div>

      <div className="min-h-[44px] text-center text-sm font-extrabold">
        {phase === 'pick' && <span className="text-stone-800">🎵 Tin-ko! Tin-ko! Pick your foot…</span>}
        {phase === 'result' && flash && (
          <span className={flash.good ? 'text-emerald-700' : 'text-rose-700'}>
            You: {flash.mine ? (flash.mine === 'L' ? 'Left' : 'Right') : '—'} · Zainab: {flash.hers === 'L' ? 'Left' : 'Right'} — {flash.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(['L', 'R'] as Foot[]).map((f) => (
          <button
            key={f}
            disabled={phase !== 'pick'}
            onClick={() => resolve(f)}
            className="py-5 rounded-2xl border-2 border-sky-500 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 font-extrabold text-stone-900 cursor-pointer text-sm"
          >
            <div className="text-3xl mb-1">{f === 'L' ? '🦶' : '🦶'}</div>
            {f === 'L' ? 'Left Foot' : 'Right Foot'}
          </button>
        ))}
      </div>

      {phase === 'done' && (
        <ResultCard
          emoji={won ? '🏆' : '😅'}
          title={won ? `Masha'Allah! You won ${you}–${her}!` : `Zainab won ${her}–${you}!`}
          message={won ? 'You earned ₦600, Barakah and sharper reflexes!' : 'Good exercise! Agility still improved (+1).'}
          onAgain={onAgain}
          onClose={onClose}
        />
      )}
    </div>
  );
};
export const TenTenGame = withReplay(TenTenInner);

// ============================================================================
// 2. SUWE — Nigerian hopscotch (toss precision + hop sequence)
// ============================================================================
const BOXES = 6;
const SUWE_ROUNDS = 3;
const triangle = (t: number) => {
  const x = t % 2;
  return x < 1 ? x : 2 - x;
};
const randomTarget = () => 2 + Math.floor(Math.random() * 5);

const SuweInner: React.FC<InnerProps> = ({ onClose, onAgain }) => {
  const reward = useGameStore((s) => s.reward);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [target, setTarget] = useState(randomTarget);
  const [stage, setStage] = useState<'toss' | 'hop' | 'done'>('toss');
  const [marker, setMarker] = useState(0);
  const [hopIdx, setHopIdx] = useState(0);
  const [hopKey, setHopKey] = useState(0);
  const [msg, setMsg] = useState('Stop the sliding marker inside the target box to toss your stone!');
  const rewarded = useRef(false);

  const seq = Array.from({ length: BOXES }, (_, i) => i + 1).filter((n) => n !== target);

  const finish = useCallback(
    (finalScore: number) => {
      if (rewarded.current) return;
      rewarded.current = true;
      const naira = finalScore * 180;
      reward(
        { naira, pasanResistance: finalScore * 2, barakah: finalScore, energy: -4 },
        finalScore > 0
          ? `Cleared ${finalScore}/${SUWE_ROUNDS} Suwe rounds and won ₦${naira}!`
          : 'Played Suwe on the field but stepped on the lines this time.',
      );
      setScore(finalScore);
      setStage('done');
    },
    [reward],
  );

  const loseLife = useCallback(
    (why: string) => {
      const nl = lives - 1;
      setLives(nl);
      if (nl <= 0) {
        finish(score);
      } else {
        setMsg(`${why} (${nl} ${nl === 1 ? 'life' : 'lives'} left)`);
        setStage('toss');
      }
    },
    [lives, score, finish],
  );

  useEffect(() => {
    if (stage !== 'toss') return;
    let raf = 0;
    const start = performance.now();
    const speed = 0.9 + round * 0.35;
    const loop = (now: number) => {
      setMarker(triangle(((now - start) / 1000) * speed));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage, round]);

  useEffect(() => {
    if (stage !== 'hop') return;
    const t = setTimeout(() => {
      sound.playPasan();
      loseLife('Too slow — the other kids took your turn!');
    }, 6500 - round * 800);
    return () => clearTimeout(t);
  }, [stage, hopKey, round, loseLife]);

  const toss = () => {
    const idx = Math.min(BOXES - 1, Math.floor(marker * BOXES));
    if (idx + 1 === target) {
      sound.playWalaahTap();
      setStage('hop');
      setHopIdx(0);
      setHopKey((k) => k + 1);
      setMsg(`Stone is in box ${target}! Hop 1 → 6 in order, but skip box ${target}!`);
    } else {
      sound.playPasan();
      loseLife(`Stone landed in box ${idx + 1} — you aimed for box ${target}.`);
    }
  };

  const hop = (n: number) => {
    if (stage !== 'hop') return;
    if (n === seq[hopIdx]) {
      sound.playWalaahTap();
      if (hopIdx + 1 >= seq.length) {
        const ns = score + 1;
        setScore(ns);
        sound.playTakbeer();
        if (round + 1 >= SUWE_ROUNDS) {
          finish(ns);
        } else {
          setRound((r) => r + 1);
          setTarget(randomTarget());
          setStage('toss');
          setMsg('Clean hop! Toss for the next round.');
        }
      } else {
        setHopIdx(hopIdx + 1);
      }
    } else {
      sound.playPasan();
      loseLife('Wrong box — you stepped on the chalk line!');
    }
  };

  return (
    <div className="p-5 space-y-4 relative">
      <GameHeader
        title="🪨 Suwe — Nigerian Hopscotch"
        subtitle="Toss your stone into the right box, then hop the grid in order without stepping on its box."
        badge={`Win up to ₦${SUWE_ROUNDS * 180}`}
      />

      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="px-2.5 py-1 rounded-full bg-stone-900 text-white">
          Round {Math.min(round + 1, SUWE_ROUNDS)}/{SUWE_ROUNDS} · Cleared {score}
        </span>
        <span>{'❤️'.repeat(Math.max(0, lives))}</span>
      </div>

      <div className="text-xs font-semibold text-stone-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{msg}</div>

      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: BOXES }, (_, i) => i + 1).map((n) => {
          const isStone = n === target;
          const hopDone = stage === 'hop' && seq.indexOf(n) !== -1 && seq.indexOf(n) < hopIdx;
          const isNext = stage === 'hop' && seq[hopIdx] === n;
          return (
            <button
              key={n}
              disabled={stage !== 'hop'}
              onClick={() => hop(n)}
              className={`h-16 rounded-lg border-2 font-extrabold text-lg cursor-pointer transition ${
                isStone
                  ? 'bg-stone-300 border-stone-500 text-stone-700'
                  : hopDone
                    ? 'bg-emerald-200 border-emerald-500 text-emerald-900'
                    : isNext
                      ? 'bg-amber-100 border-amber-500 text-amber-900 kw-pulse'
                      : 'bg-white border-stone-300 text-stone-800'
              }`}
            >
              {isStone ? '🪨' : n}
            </button>
          );
        })}
      </div>

      {stage === 'toss' && (
        <div className="space-y-2">
          <div className="relative h-8 rounded-full overflow-hidden border border-stone-300 bg-stone-100">
            <div className="absolute inset-0 grid grid-cols-6">
              {Array.from({ length: BOXES }, (_, i) => (
                <div
                  key={i}
                  className={`border-r border-stone-300 last:border-r-0 ${i + 1 === target ? 'bg-emerald-300/70' : ''}`}
                />
              ))}
            </div>
            <div className="absolute top-0 bottom-0 w-1.5 bg-rose-600" style={{ left: `calc(${marker * 100}% - 3px)` }} />
          </div>
          <button
            onClick={toss}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-sm cursor-pointer"
          >
            Toss the stone into box {target}!
          </button>
        </div>
      )}

      {stage === 'hop' && (
        <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
          <div
            key={hopKey}
            className="h-full bg-rose-500"
            style={{ animation: `kw-shrink ${(6500 - round * 800) / 1000}s linear forwards` }}
          />
        </div>
      )}

      {stage === 'done' && (
        <ResultCard
          emoji={score >= 2 ? '🏆' : '🪨'}
          title={score > 0 ? `You cleared ${score}/${SUWE_ROUNDS} rounds!` : 'The chalk got you this time!'}
          message={score > 0 ? `You won ₦${score * 180} and better balance (+${score * 2} Agility).` : 'Try again — aim for the highlighted box.'}
          onAgain={onAgain}
          onClose={onClose}
        />
      )}
    </div>
  );
};
export const SuweGame = withReplay(SuweInner);

// ============================================================================
// 3. AYO OLOPON — Yoruba mancala (turn-based strategy vs. Baba Ayo)
// ============================================================================
const PITS = 12;
const AYO_TARGET = 25;
const sideOf = (i: number): 'you' | 'ai' => (i < 6 ? 'you' : 'ai');

interface AyoState {
  board: number[];
  you: number;
  ai: number;
  turn: 'you' | 'ai';
  moves: number;
  msg: string;
  over: null | 'you' | 'ai' | 'draw';
}

const sow = (board: number[], pit: number) => {
  const b = [...board];
  let seeds = b[pit];
  b[pit] = 0;
  let pos = pit;
  while (seeds > 0) {
    pos = (pos + 1) % PITS;
    if (pos === pit) continue;
    b[pos] += 1;
    seeds -= 1;
  }
  const mover = sideOf(pit);
  let captured = 0;
  if (sideOf(pos) !== mover) {
    let p = pos;
    while (sideOf(p) !== mover && (b[p] === 2 || b[p] === 3)) {
      captured += b[p];
      b[p] = 0;
      p = (p - 1 + PITS) % PITS;
    }
  }
  return { board: b, captured };
};

const legalPits = (board: number[], who: 'you' | 'ai') =>
  board.map((n, i) => ({ n, i })).filter(({ n, i }) => n > 0 && sideOf(i) === who).map(({ i }) => i);

const applyAyoMove = (g: AyoState, pit: number): AyoState => {
  const who = g.turn;
  const { board, captured } = sow(g.board, pit);
  let you = g.you + (who === 'you' ? captured : 0);
  let ai = g.ai + (who === 'ai' ? captured : 0);
  const moves = g.moves + 1;
  const name = who === 'you' ? 'You' : 'Baba Ayo';
  let msg = captured > 0 ? `${name} captured ${captured} seeds!` : `${name} sowed from a pit.`;
  const next: 'you' | 'ai' = who === 'you' ? 'ai' : 'you';
  let over: AyoState['over'] = null;

  if (you >= AYO_TARGET) over = 'you';
  else if (ai >= AYO_TARGET) over = 'ai';
  else if (legalPits(board, next).length === 0 || moves >= 120) {
    // Each player keeps the seeds left on their own side
    board.forEach((n, i) => {
      if (sideOf(i) === 'you') you += n;
      else ai += n;
    });
    over = you > ai ? 'you' : ai > you ? 'ai' : 'draw';
    msg = 'No more moves — remaining seeds are collected.';
  }
  return { board, you, ai, turn: next, moves, msg, over };
};

const AyoInner: React.FC<InnerProps> = ({ onClose, onAgain }) => {
  const reward = useGameStore((s) => s.reward);
  const [g, setG] = useState<AyoState>({
    board: Array(PITS).fill(4),
    you: 0,
    ai: 0,
    turn: 'you',
    moves: 0,
    msg: 'Tap one of your pits (bottom row) to sow seeds to the right.',
    over: null,
  });
  const rewarded = useRef(false);

  const commit = useCallback(
    (ng: AyoState) => {
      setG(ng);
      if (ng.over && !rewarded.current) {
        rewarded.current = true;
        if (ng.over === 'you') {
          reward(
            { naira: 800, ilm: 3, barakah: 4, energy: -3 },
            `Outplayed Baba Ayo at Ayo Olopon (${ng.you}-${ng.ai}) and won ₦800!`,
          );
        } else {
          reward({ ilm: 1, energy: -3 }, `Played a thoughtful game of Ayo Olopon with Baba Ayo (${ng.you}-${ng.ai}).`);
        }
      }
    },
    [reward],
  );

  useEffect(() => {
    if (g.turn !== 'ai' || g.over) return;
    const t = setTimeout(() => {
      const options = legalPits(g.board, 'ai');
      let best = options[0];
      let bestScore = -1;
      for (const o of options) {
        const sc = sow(g.board, o).captured + Math.random() * 0.9;
        if (sc > bestScore) {
          bestScore = sc;
          best = o;
        }
      }
      commit(applyAyoMove(g, best));
    }, 850);
    return () => clearTimeout(t);
  }, [g, commit]);

  const play = (pit: number) => {
    if (g.turn !== 'you' || g.over || g.board[pit] === 0 || sideOf(pit) !== 'you') return;
    sound.playWalaahTap();
    commit(applyAyoMove(g, pit));
  };

  const topRow = [11, 10, 9, 8, 7, 6];
  const bottomRow = [0, 1, 2, 3, 4, 5];

  const Pit: React.FC<{ i: number }> = ({ i }) => {
    const mine = sideOf(i) === 'you';
    const playable = mine && g.turn === 'you' && !g.over && g.board[i] > 0;
    return (
      <button
        disabled={!playable}
        onClick={() => play(i)}
        className={`aspect-square rounded-full border-4 flex flex-col items-center justify-center font-extrabold text-sm ${
          mine ? 'bg-amber-200 border-amber-800 text-amber-950' : 'bg-stone-300 border-stone-700 text-stone-900'
        } ${playable ? 'cursor-pointer hover:brightness-110 kw-pulse' : 'cursor-default'}`}
      >
        <span>{g.board[i]}</span>
        <span className="text-[8px] leading-none tracking-tighter">{'●'.repeat(Math.min(g.board[i], 6))}</span>
      </button>
    );
  };

  return (
    <div className="p-5 space-y-4 relative">
      <GameHeader
        title="🪵 Ayo Olopon — Yoruba Mancala"
        subtitle={`Sow seeds anticlockwise. Land in a pit that makes 2 or 3 seeds to capture it. First to ${AYO_TARGET} wins.`}
        badge="Win ₦800"
      />

      <div className="flex items-center justify-between bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold">
        <span className="text-amber-300">YOU: {g.you}</span>
        <span className="text-stone-300">{g.turn === 'you' ? 'Your move' : 'Baba Ayo is thinking…'}</span>
        <span className="text-stone-200">BABA AYO: {g.ai}</span>
      </div>

      <div className="rounded-2xl bg-amber-900 p-2 sm:p-3 space-y-1.5 sm:space-y-2 shadow-inner">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">{topRow.map((i) => <Pit key={i} i={i} />)}</div>
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">{bottomRow.map((i) => <Pit key={i} i={i} />)}</div>
      </div>

      <div className="text-xs font-semibold text-stone-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{g.msg}</div>

      {g.over && (
        <ResultCard
          emoji={g.over === 'you' ? '🏆' : g.over === 'draw' ? '🤝' : '🧓'}
          title={g.over === 'you' ? `You beat Baba Ayo ${g.you}–${g.ai}!` : g.over === 'draw' ? 'A fair draw!' : `Baba Ayo wins ${g.ai}–${g.you}`}
          message={g.over === 'you' ? 'You earned ₦800, Ilm and Barakah!' : 'Wisdom comes with practice (+1 Ilm). Try again!'}
          onAgain={onAgain}
          onClose={onClose}
        />
      )}
    </div>
  );
};
export const AyoGame = withReplay(AyoInner);

// ============================================================================
// 4. SKIPPING ROPE — timing & rhythm
// ============================================================================
const SKIP_W = 360;
const SKIP_H = 300;
const SKIP_GOAL = 20;
const JUMP_MS = 520;

const SkippingInner: React.FC<InnerProps> = ({ onClose, onAgain }) => {
  const reward = useGameStore((s) => s.reward);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jumpAtRef = useRef(-10000);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('Tap JUMP (or press Space) so you are in the air when the rope sweeps the ground!');

  const jump = useCallback(() => {
    const now = performance.now();
    if (now - jumpAtRef.current > JUMP_MS * 0.7) {
      jumpAtRef.current = now;
      sound.playWalaahTap();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const ground = SKIP_H - 50;
    const handY = ground - 70;
    const amp = 70;
    let phase = 0;
    let streakL = 0;
    let livesL = 3;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const end = () => {
      if (finished) return;
      finished = true;
      const naira = Math.min(streakL, SKIP_GOAL) * 35;
      reward(
        { naira, energy: -5, pasanResistance: Math.floor(streakL / 5), barakah: streakL >= SKIP_GOAL ? 4 : 1 },
        `Skipped rope ${streakL} times in a row and won ₦${naira}!`,
      );
      setDone(true);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (finished) return;

      const period = Math.max(0.55, 1.1 - 0.025 * streakL);
      const before = Math.floor(phase);
      phase += dt / period;
      const since = now - jumpAtRef.current;
      const h = since >= 0 && since < JUMP_MS ? Math.sin((Math.PI * since) / JUMP_MS) : 0;

      if (Math.floor(phase) > before) {
        if (h > 0.35) {
          streakL += 1;
          sound.playCoin();
          setStreak(streakL);
          setMsg(streakL % 5 === 0 ? `🔥 ${streakL} in a row — the rope is getting faster!` : 'Nice jump!');
          if (streakL >= SKIP_GOAL) end();
        } else {
          livesL -= 1;
          sound.playPasan();
          setLives(livesL);
          setMsg('Tripped on the rope! Keep your rhythm.');
          if (livesL <= 0) end();
        }
      }

      // ---------- draw ----------
      ctx.clearRect(0, 0, SKIP_W, SKIP_H);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(0, 0, SKIP_W, SKIP_H);
      ctx.fillStyle = '#d8b07a';
      ctx.fillRect(0, ground, SKIP_W, SKIP_H - ground);

      const leftX = 40;
      const rightX = SKIP_W - 40;
      const cos = Math.cos(phase * Math.PI * 2);
      const ctrlY = handY + cos * 2 * amp;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(leftX, handY);
      ctx.quadraticCurveTo(SKIP_W / 2, ctrlY, rightX, handY);
      ctx.stroke();

      for (const x of [leftX, rightX]) {
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(x - 12, handY - 6, 24, ground - handY + 6);
        ctx.fillStyle = '#7a4a24';
        ctx.beginPath();
        ctx.arc(x, handY - 20, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      const py = ground - h * 62;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(SKIP_W / 2 - 14, py - 52, 28, 40);
      ctx.fillStyle = '#5d3a1a';
      ctx.beginPath();
      ctx.arc(SKIP_W / 2, py - 66, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(SKIP_W / 2 - 14, py - 12, 10, 12);
      ctx.fillRect(SKIP_W / 2 + 4, py - 12, 10, 12);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reward]);

  const won = streak >= SKIP_GOAL;

  return (
    <div className="p-5 space-y-4">
      <GameHeader
        title="🪢 Skipping Rope — Okunuga"
        subtitle={`Jump in time with the rope. Reach ${SKIP_GOAL} jumps — it gets faster as you go!`}
        badge={`₦35 per jump`}
      />
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="px-2.5 py-1 rounded-full bg-stone-900 text-white">Streak {streak}/{SKIP_GOAL}</span>
        <span>{'❤️'.repeat(Math.max(0, lives))}</span>
      </div>
      <div className="relative rounded-2xl overflow-hidden border-4 border-stone-800">
        <canvas
          ref={canvasRef}
          width={SKIP_W}
          height={SKIP_H}
          style={{ width: '100%', height: 'auto', touchAction: 'none' }}
          className="block"
          onPointerDown={jump}
        />
        {done && (
          <ResultCard
            emoji={won ? '🏆' : '🪢'}
            title={won ? 'Perfect rhythm!' : `${streak} jumps!`}
            message={`You won ₦${Math.min(streak, SKIP_GOAL) * 35} and some stamina training.`}
            onAgain={onAgain}
            onClose={onClose}
          />
        )}
      </div>
      <div className="text-xs font-semibold text-stone-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{msg}</div>
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          jump();
        }}
        className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-extrabold text-base cursor-pointer select-none"
        style={{ touchAction: 'manipulation' }}
      >
        ⬆️ JUMP
      </button>
    </div>
  );
};
export const SkippingGame = withReplay(SkippingInner);

// ============================================================================
// 5. BOJU-BOJU — dodge-and-collect arena
// ============================================================================
const CT_W = 360;
const CT_H = 420;
const CT_TIME = 30;

interface CItem {
  x: number;
  y: number;
  vy: number;
  kind: 'sweet' | 'star';
}
interface CBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const CatcherInner: React.FC<InnerProps> = ({ onClose, onAgain }) => {
  const reward = useGameStore((s) => s.reward);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(CT_TIME);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const p = { x: CT_W / 2, y: CT_H - 70 };
    let tx = p.x;
    let ty = p.y;
    const items: CItem[] = [];
    const balls: CBall[] = [
      { x: 60, y: 90, vx: 90, vy: 70 },
      { x: 300, y: 150, vx: -80, vy: 60 },
    ];
    let remaining = CT_TIME;
    let sc = 0;
    let lv = 3;
    let boost = 0;
    let inv = 0;
    let spawn = 0;
    let starT = 6;
    let ballT = 9;
    let shownSec = CT_TIME;
    let finished = false;
    let last = performance.now();
    let raf = 0;
    const keys = { l: false, r: false, u: false, d: false };

    const end = () => {
      if (finished) return;
      finished = true;
      const naira = Math.min(sc, 14) * 50;
      reward(
        { naira, energy: -6, pasanResistance: Math.floor(sc / 4), barakah: sc >= 10 ? 3 : 1 },
        `Collected ${sc} sweets in Boju-Boju and won ₦${naira}!`,
      );
      setDone(true);
    };

    const setTarget = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width) * CT_W;
      // On touch, aim slightly above the finger so the runner stays visible
      const fingerLift = e.pointerType === 'touch' ? 46 : 0;
      ty = ((e.clientY - rect.top) / rect.height) * CT_H - fingerLift;
    };
    const onDown = (e: PointerEvent) => setTarget(e);
    const onMove = (e: PointerEvent) => {
      if (e.buttons || e.pointerType === 'touch') setTarget(e);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);

    const setKey = (e: KeyboardEvent, v: boolean) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.l = v;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.r = v;
      if (e.key === 'ArrowUp' || e.key === 'w') keys.u = v;
      if (e.key === 'ArrowDown' || e.key === 's') keys.d = v;
    };
    const onKD = (e: KeyboardEvent) => setKey(e, true);
    const onKU = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      if (finished) return;

      remaining -= dt;
      boost = Math.max(0, boost - dt);
      inv = Math.max(0, inv - dt);
      const sec = Math.max(0, Math.ceil(remaining));
      if (sec !== shownSec) {
        shownSec = sec;
        setTimeLeft(sec);
      }
      if (remaining <= 0) {
        end();
        return;
      }

      const speed = boost > 0 ? 300 : 190;
      if (keys.l) tx -= speed * dt;
      if (keys.r) tx += speed * dt;
      if (keys.u) ty -= speed * dt;
      if (keys.d) ty += speed * dt;
      tx = Math.max(18, Math.min(CT_W - 18, tx));
      ty = Math.max(18, Math.min(CT_H - 18, ty));
      const step = speed * dt;
      p.x += Math.max(-step, Math.min(step, tx - p.x));
      p.y += Math.max(-step, Math.min(step, ty - p.y));

      spawn -= dt;
      if (spawn <= 0) {
        spawn = 0.75;
        items.push({ x: 24 + Math.random() * (CT_W - 48), y: -10, vy: 70 + Math.random() * 40, kind: 'sweet' });
      }
      starT -= dt;
      if (starT <= 0) {
        starT = 9;
        items.push({ x: 24 + Math.random() * (CT_W - 48), y: -10, vy: 90, kind: 'star' });
      }
      ballT -= dt;
      if (ballT <= 0 && balls.length < 5) {
        ballT = 9;
        balls.push({ x: Math.random() * CT_W, y: 20, vx: (Math.random() > 0.5 ? 1 : -1) * 100, vy: 80 });
      }

      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += it.vy * dt;
        if (Math.hypot(it.x - p.x, it.y - p.y) < 24) {
          items.splice(i, 1);
          if (it.kind === 'sweet') {
            sc += 1;
            setScore(sc);
            sound.playCoin();
          } else {
            boost = 3;
            sound.playTakbeer();
          }
        } else if (it.y > CT_H + 20) {
          items.splice(i, 1);
        }
      }

      for (const b of balls) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < 12 || b.x > CT_W - 12) b.vx *= -1;
        if (b.y < 12 || b.y > CT_H - 12) b.vy *= -1;
        b.x = Math.max(12, Math.min(CT_W - 12, b.x));
        b.y = Math.max(12, Math.min(CT_H - 12, b.y));
        if (inv <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < 24) {
          lv -= 1;
          inv = 1.3;
          setLives(lv);
          sound.playPasan();
          if (lv <= 0) {
            end();
            return;
          }
        }
      }

      // ---------- draw ----------
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(0, 0, CT_W, CT_H);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, CT_W - 16, CT_H - 16);
      ctx.beginPath();
      ctx.arc(CT_W / 2, CT_H / 2, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const it of items) ctx.fillText(it.kind === 'sweet' ? '🍬' : '⭐', it.x, it.y);

      for (const b of balls) {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.globalAlpha = inv > 0 && Math.floor(inv * 10) % 2 === 0 ? 0.4 : 1;
      ctx.fillStyle = boost > 0 ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '20px serif';
      ctx.fillText('🏃', p.x, p.y + 1);
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
    };
  }, [reward]);

  return (
    <div className="p-4 flex flex-col items-center gap-3">
      <div className="w-full max-w-[360px]">
        <GameHeader
          title="🏃 Boju-Boju — Dodge & Collect"
          subtitle="Grab the sweets, dodge the rolling balls, catch ⭐ for a speed burst!"
          badge="₦50 per sweet"
        />
      </div>
      <div className="w-full max-w-[360px] flex items-center justify-between bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-extrabold">
        <span className="text-amber-300">🍬 {score}</span>
        <span className="font-mono">⏱ {timeLeft}s</span>
        <span>{'❤️'.repeat(Math.max(0, lives))}</span>
      </div>
      <div className="relative rounded-2xl overflow-hidden shadow-lg border-4 border-stone-800">
        <canvas
          ref={canvasRef}
          width={CT_W}
          height={CT_H}
          style={{ width: 'min(84vw, 340px, calc(50dvh * 0.857))', height: 'auto', aspectRatio: '360 / 420', touchAction: 'none' }}
          className="block"
        />
        {done && (
          <ResultCard
            emoji={score >= 10 ? '🏆' : '🍬'}
            title={`You collected ${score} sweets!`}
            message={`You won ₦${Math.min(score, 14) * 50} and built up some stamina.`}
            onAgain={onAgain}
            onClose={onClose}
          />
        )}
      </div>
      <div className="text-[11px] text-stone-500 font-semibold text-center">
        Drag on the field or use the Arrow keys / WASD to run.
      </div>
    </div>
  );
};
export const CatcherGame = withReplay(CatcherInner);
