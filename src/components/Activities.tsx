'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore, LOC_META } from '@/store/gameStore';
import { Loc } from '@/types/game';
import { SHOP_ITEMS, BOOK_NAMES } from '@/data/shop';
import {
  Mcq, OrderItem, shuffle,
  makeHurufQuestions, VERSES, WUDU_STEPS, FIQH_CASES,
  makeNahwQuestions, makeTutorQuestions, makeHomeLessonQuestions,
  ADHAN_LINES, KHUTBAH_PARTS, KHUTBAH_QUESTIONS,
} from '@/data/lessons';
import { prayerFor } from '@/lib/time';
import { sound } from '@/lib/audio';
import { FootballMinigame } from '@/components/FootballMinigame';
import { TenTenGame, SuweGame, AyoGame, SkippingGame, CatcherGame } from '@/components/RecreationGames';
import { CheckCircle2, XCircle, Lock, Bus, Sparkles, BookOpen, ShoppingBag, Volume2 } from 'lucide-react';

// ============================================================================
// Reusable MCQ Runner (Huruf, Nahw, Fiqh cases, Tutoring, Home Lesson, Khutbah)
// ============================================================================
const McqRunner: React.FC<{
  title: string;
  subtitle: string;
  questions: Mcq[];
  timedSeconds?: number;
  onFinish: (correct: number, total: number) => void;
}> = ({ title, subtitle, questions, timedSeconds, onFinish }) => {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timedSeconds ?? 0);

  useEffect(() => {
    if (!timedSeconds) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          onFinish(score, questions.length);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timedSeconds, score, questions.length, onFinish]);

  const q = questions[idx];
  if (!q) return null;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) {
      sound.playTakbeer();
      setScore((s) => s + 1);
    } else {
      sound.playPasan();
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      onFinish(score, questions.length);
    } else {
      setPicked(null);
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          {timedSeconds ? (
            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-mono">⏱ {timeLeft}s</span>
          ) : null}
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
            {idx + 1} / {questions.length} · Score {score}
          </span>
        </div>
      </div>

      <div className="bg-stone-100 rounded-2xl p-5 text-center space-y-2 border border-stone-200">
        {q.promptAr && (
          <div dir="rtl" className="text-4xl sm:text-5xl font-serif font-black text-stone-900 py-2">
            {q.promptAr}
          </div>
        )}
        {q.prompt && <div className="text-base font-bold text-stone-800">{q.prompt}</div>}
        {q.sub && <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider">{q.sub}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {q.options.map((opt, i) => {
          const isRight = i === q.answer;
          const isChosen = picked === i;
          let cls = 'border-stone-300 bg-white hover:border-sky-500 text-stone-900';
          if (picked !== null) {
            if (isRight) cls = 'border-emerald-600 bg-emerald-50 text-emerald-950';
            else if (isChosen) cls = 'border-rose-500 bg-rose-50 text-rose-900';
            else cls = 'border-stone-200 bg-stone-50 text-stone-400';
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              dir={q.optionsAr ? 'rtl' : undefined}
              className={`p-3.5 rounded-xl border-2 font-bold transition cursor-pointer flex items-center justify-between gap-2 ${
                q.optionsAr ? 'text-2xl font-serif' : 'text-sm'
              } ${cls}`}
            >
              <span>{opt}</span>
              {picked !== null && isRight && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {picked !== null && isChosen && !isRight && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
          <div className="text-xs text-stone-700 font-medium">{q.explain || 'Keep going!'}</div>
          <button
            onClick={next}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shrink-0"
          >
            {idx + 1 >= questions.length ? 'Finish & Claim Reward' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Reusable Sequence Orderer (Wudu Steps, Adhan, Khutbah Pillars)
// ============================================================================
const SequenceRunner: React.FC<{
  title: string;
  subtitle: string;
  items: OrderItem[];
  onSuccess: () => void;
}> = ({ title, subtitle, items, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<string | null>(null);
  const pool = useMemo(() => shuffle(items.map((it, idx) => ({ ...it, idx }))), [items]);

  const pick = (idx: number, text: string) => {
    if (idx === step) {
      sound.playWalaahTap();
      setWrong(null);
      if (step + 1 >= items.length) {
        sound.playTakbeer();
        onSuccess();
      } else {
        setStep(step + 1);
      }
    } else {
      sound.playPasan();
      setWrong(text);
    }
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-stone-900">{title}</h3>
          <p className="text-xs text-stone-500">{subtitle}</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900">
          Step {step} / {items.length}
        </span>
      </div>

      {/* Completed steps */}
      {step > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Completed in order</div>
          {items.slice(0, step).map((it, i) => (
            <div key={i} className="text-xs font-bold text-emerald-950 flex items-center justify-between gap-2">
              <span>{i + 1}. {it.text}</span>
              {it.ar && <span dir="rtl" className="font-serif text-base">{it.ar}</span>}
            </div>
          ))}
        </div>
      )}

      {wrong && (
        <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          Not quite — &quot;{wrong}&quot; is not step #{step + 1}. Try again!
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {pool.map((it) => {
          const done = it.idx < step;
          return (
            <button
              key={it.idx}
              disabled={done}
              onClick={() => pick(it.idx, it.text)}
              className={`p-3 rounded-xl border-2 text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                done
                  ? 'border-emerald-300 bg-emerald-50/60 text-emerald-700 opacity-55'
                  : 'border-stone-300 bg-white hover:border-sky-500 text-stone-900'
              }`}
            >
              <span className="text-xs font-bold">{it.text}</span>
              {it.ar && <span dir="rtl" className="font-serif text-base font-bold text-stone-800">{it.ar}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Hifz Verse Word Scrambler
// ============================================================================
const HifzBuilder: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { owned, reward } = useGameStore();
  const available = useMemo(
    () => VERSES.filter((v) => !v.needs || owned.includes(v.needs)),
    [owned],
  );
  const [vIdx, setVIdx] = useState(0);
  const verse = available[vIdx % available.length];
  const words = useMemo(() => verse.text.split(' '), [verse]);
  const scrambled = useMemo(() => shuffle(words.map((w, i) => ({ w, i }))), [words]);
  const [picked, setPicked] = useState<number[]>([]);
  const [error, setError] = useState(false);

  const tapWord = (itemIdx: number, wordPos: number) => {
    if (picked.includes(itemIdx)) return;
    if (wordPos === picked.length) {
      sound.playWalaahTap();
      const next = [...picked, itemIdx];
      setPicked(next);
      setError(false);
      if (next.length === words.length) {
        sound.playTakbeer();
      }
    } else {
      sound.playPasan();
      setError(true);
    }
  };

  const complete = picked.length === words.length;

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-stone-900">
            Surah {verse.surah} · Ayah {verse.ayah}
          </h3>
          <p className="text-xs text-stone-500">&quot;{verse.translation}&quot;</p>
        </div>
        {!owned.includes('juz_amma') && (
          <span className="text-[11px] bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-bold">
            Buy Juz &apos;Amma at the Kiosk for more Surahs
          </span>
        )}
      </div>

      {/* Assembled ayah box */}
      <div
        dir="rtl"
        className="min-h-[84px] rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 flex flex-wrap items-center justify-center gap-2 text-2xl sm:text-3xl font-serif font-bold text-stone-900"
      >
        {picked.length === 0 ? (
          <span className="text-xs font-sans text-stone-400">Tap the Arabic words below in the right order...</span>
        ) : (
          picked.map((id, idx) => (
            <span key={idx} className="px-2 py-1 rounded-lg bg-white border border-amber-300 shadow-2xs">
              {scrambled.find((s) => s.i === id)?.w}
            </span>
          ))
        )}
      </div>

      {error && (
        <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
          Baba Kewu raised his cane! That word comes later in the ayah.
        </div>
      )}

      {/* Word bank */}
      <div dir="rtl" className="flex flex-wrap items-center justify-center gap-2.5 py-2">
        {scrambled.map((item) => {
          const used = picked.includes(item.i);
          return (
            <button
              key={item.i}
              disabled={used}
              onClick={() => tapWord(item.i, item.i)}
              className={`px-4 py-2.5 rounded-xl border-2 text-2xl font-serif font-bold transition cursor-pointer ${
                used
                  ? 'border-stone-200 bg-stone-100 text-stone-300'
                  : 'border-stone-300 bg-white hover:border-sky-500 text-stone-900 shadow-2xs'
              }`}
            >
              {item.w}
            </button>
          );
        })}
      </div>

      {complete && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border border-emerald-300 rounded-xl p-4">
          <div className="text-xs font-bold text-emerald-950">
            Masha&apos;Allah! You recited Surah {verse.surah} ({verse.ayah}) from memory!
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                reward({ ilm: 6, taqwa: 4, barakah: 3 }, `Recited Surah ${verse.surah} (${verse.ayah}) to Baba Kewu (+6 Ilm, +4 Taqwa).`, 1);
                setPicked([]);
                setVIdx((v) => v + 1);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Next Ayah (+6 Ilm)
            </button>
            <button
              onClick={() => {
                reward({ ilm: 6, taqwa: 4, barakah: 3 }, `Completed Hifz session with Baba Kewu (+6 Ilm, +4 Taqwa).`, 1);
                onDone();
              }}
              className="bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
            >
              Finish Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Mallam Idris's Bookshop & Outfit Customizer
// ============================================================================
const ShopView: React.FC = () => {
  const { player, owned, outfit, buyOrEquip } = useGameStore();
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'book' | 'robe' | 'cap' | 'prop'>('all');

  const items = SHOP_ITEMS.filter(
    (it) => (filter === 'all' || it.kind === filter) && (!it.gender || it.gender === player.gender),
  );

  const isEquipped = (id: string) => {
    const it = SHOP_ITEMS.find((x) => x.id === id);
    if (!it?.apply) return false;
    return Object.entries(it.apply).every(([k, v]) => outfit[k as keyof typeof outfit] === v);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" /> Mallam Idris — Books, Attar & Modrasah Wear
          </h3>
          <p className="text-xs text-stone-500">
            Buy classical books to unlock higher subjects, or equip robes & caps visible on your 3D character!
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-extrabold">
          Wallet: ₦{player.stats.naira.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {([
          ['all', 'All Items'],
          ['book', '📚 Books'],
          ['robe', '👘 Robes'],
          ['cap', '🧢 Caps & Hijabs'],
          ['prop', '📿 Hand Props'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer shrink-0 ${
              filter === id ? 'bg-sky-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950 px-3.5 py-2.5 rounded-xl">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((it) => {
          const has = owned.includes(it.id);
          const eq = isEquipped(it.id);
          return (
            <div
              key={it.id}
              className="p-3.5 rounded-2xl border border-stone-200 bg-white flex items-start justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                  {it.icon}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-stone-900">{it.name}</div>
                  <div className="text-xs text-stone-500 leading-snug mt-0.5">{it.desc}</div>
                  <div className="mt-2 text-xs font-mono font-bold text-emerald-700">
                    {has ? (it.kind === 'book' ? '✓ In Your Bag' : eq ? '✓ Wearing Now' : 'Owned') : `₦${it.price.toLocaleString()}`}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const res = buyOrEquip(it.id);
                  setMsg(res.msg);
                }}
                disabled={has && (it.kind === 'book' || eq)}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer shrink-0 ${
                  has
                    ? it.kind === 'book' || eq
                      ? 'bg-stone-100 text-stone-400 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                }`}
              >
                {has ? (it.kind === 'book' ? 'Owned' : eq ? 'Equipped' : 'Wear') : 'Buy'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Danfo Bus Stop Route Picker
// ============================================================================
const BusView: React.FC = () => {
  const { location, player, owned, startRide, nextDay, setActiveTab } = useGameStore();
  const [err, setErr] = useState<string | null>(null);

  const routes: { to: Loc; title: string; subtitle: string; badge: string; locked?: string }[] = [
    {
      to: 'school',
      title: LOC_META.school.name,
      subtitle: 'Return to the Madrasah compound, classes, well and street stalls.',
      badge: `Fare ₦${LOC_META.school.fare}`,
    },
    {
      to: 'east',
      title: LOC_META.east.name,
      subtitle: 'Ride east to teach private Arabic & Fiqh home lessons for ₦3,500!',
      badge: `Fare ₦${LOC_META.east.fare} · Earn ₦3,500`,
    },
    {
      to: 'west',
      title: LOC_META.west.name,
      subtitle: 'Ride west to deliver the Friday Khutbah & lead congregation for ₦6,000!',
      badge: `Fare ₦${LOC_META.west.fare} · Earn ₦6,000`,
      locked: owned.includes('riyad') ? undefined : `Requires ${BOOK_NAMES.riyad}`,
    },
  ];

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div>
          <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
            <Bus className="w-5 h-5 text-amber-500" /> Yellow Danfo Bus Stop — Oya Enter!
          </h3>
          <p className="text-xs text-stone-500">
            Hop on a live moving Danfo along the Lagos road and watch your character ride to the destination.
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900">
          ₦{player.stats.naira.toLocaleString()}
        </span>
      </div>

      {err && (
        <div className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</div>
      )}

      <div className="space-y-2.5">
        {routes.map((r) => {
          const here = r.to === location;
          return (
            <div
              key={r.to}
              className="p-4 rounded-2xl border border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-stone-900">{r.title}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-1">{r.subtitle}</p>
              </div>
              {here ? (
                <span className="text-xs font-bold text-emerald-700 px-3 py-2 bg-emerald-50 rounded-xl shrink-0">
                  ● You Are Here
                </span>
              ) : r.locked ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 bg-stone-100 px-3 py-2 rounded-xl shrink-0">
                  <Lock className="w-3.5 h-3.5" /> {r.locked}
                </span>
              ) : (
                <button
                  onClick={() => {
                    const res = startRide(r.to);
                    if (!res.ok) setErr(res.msg);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-4 py-2.5 rounded-xl cursor-pointer shrink-0"
                >
                  Hop on Danfo →
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
        <span className="text-xs text-stone-500">Done for today? Head home and rest for tomorrow&apos;s chronicle.</span>
        <button
          onClick={() => {
            nextDay();
            setActiveTab('life');
          }}
          className="text-xs font-bold px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white cursor-pointer"
        >
          Rest & Advance Day
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Master Activity Modal Switcher
// ============================================================================
export const ActivityModal: React.FC = () => {
  const {
    activity, setActivity, owned, reward, washWalaahSuccess, slateTraced,
    hour, triggerRally,
  } = useGameStore();
  // Sub-phase is keyed to the activity it belongs to, so it resets automatically when the activity changes
  const [phaseState, setPhaseState] = useState<{ forActivity: typeof activity; phase: 'seq' | 'mcq' }>({
    forActivity: null,
    phase: 'seq',
  });
  const subPhase = phaseState.forActivity === activity ? phaseState.phase : 'seq';
  const setSubPhase = (phase: 'seq' | 'mcq') => setPhaseState({ forActivity: activity, phase });

  if (!activity) return null;

  const close = () => setActivity(null);
  const prayer = prayerFor(hour);

  let title = 'Madrasah Activity';
  let body: React.ReactNode = null;

  if (activity === 'alfa') {
    title = "Baba Kewu's Podium — Hifz & Recitation";
    body = (
      <div className="p-5 space-y-3">
        <p className="text-xs text-stone-600">
          Baba Kewu adjusts his glasses and taps his cane. Choose your session:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setActivity('hifz')}
            className="p-4 rounded-2xl border-2 border-sky-500 bg-sky-50/60 hover:bg-sky-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600" /> Hifz Verse Builder
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Assemble ayahs of Al-Fatihah &amp; Juz &apos;Amma from memory (+6 Ilm, +1 Hifz Juz).
            </p>
          </button>
          <button
            onClick={() => setActivity('adhan')}
            className="p-4 rounded-2xl border-2 border-amber-400 bg-amber-50/60 hover:bg-amber-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-600" /> Call the Adhan ({prayer.name})
            </div>
            <p className="text-xs text-stone-600 mt-1">
              Recite the Adhan phrases in sequence so the compound gathers for salah (+8 Taqwa, +5 Barakah).
            </p>
          </button>
        </div>
      </div>
    );
  } else if (activity === 'ibtida') {
    title = "Ibtida'i Class Shed — Huruf & Junior Tutoring";
    body = (
      <div className="p-5 space-y-3">
        <p className="text-xs text-stone-600">
          Practice your Arabic vowel marks or grade junior Omo Kewu slates to earn pocket money:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setActivity('huruf')}
            className="p-4 rounded-2xl border-2 border-sky-500 bg-sky-50/60 hover:bg-sky-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900">📘 Qa&apos;idah Huruf Speed Drill</div>
            <p className="text-xs text-stone-600 mt-1">
              45-second Fathah, Kasrah &amp; Dammah sound drill (+Ilm &amp; Pasan Defense).
            </p>
          </button>
          <button
            onClick={() => setActivity('tutor')}
            className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900">📿 Grade Junior Slates (Hustle)</div>
            <p className="text-xs text-stone-600 mt-1">
              Spot spelling mistakes on junior Walaah boards to earn up to ₦1,000!
            </p>
          </button>
        </div>
      </div>
    );
  } else if (activity === 'well') {
    title = 'Ablution Well & Taps — Taharah & Slate Washing';
    body = (
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              washWalaahSuccess();
              close();
            }}
            className="p-4 rounded-2xl border-2 border-sky-500 bg-sky-50/60 hover:bg-sky-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900">
              💧 Wash Walaah Slate {slateTraced ? '(Inked Bonus Ready!)' : ''}
            </div>
            <p className="text-xs text-stone-600 mt-1">
              {slateTraced
                ? 'Your slate has fresh Tadaa calligraphy! Wash it now for +8 Ilm & ₦150!'
                : 'Rinse your wooden board with cool well water (+5 Ilm).'}
            </p>
          </button>
          <button
            onClick={() => setActivity('wudu')}
            className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70 text-left cursor-pointer"
          >
            <div className="font-extrabold text-sm text-stone-900">📙 Fiqh of Wudu &amp; Salah (Al-Akhdari)</div>
            <p className="text-xs text-stone-600 mt-1">
              Order the steps of Wudu {owned.includes('akhdari') ? '& solve Sujood Sahw cases' : ''} (+Ilm &amp; +Taqwa).
            </p>
          </button>
        </div>
      </div>
    );
  } else if (activity === 'hifz') {
    title = 'Hifz & Tajweed — Verse Scrambler';
    body = <HifzBuilder onDone={close} />;
  } else if (activity === 'huruf') {
    title = "Qa'idah Baghdadiyyah — 45s Huruf Drill";
    body = (
      <McqRunner
        title="Huruf & Harakat Speed Drill"
        subtitle="Match each Arabic letter and vowel mark before the timer runs out!"
        questions={makeHurufQuestions(8)}
        timedSeconds={45}
        onFinish={(c, tot) => {
          reward(
            { ilm: c * 2, pasanResistance: c, naira: c * 50 },
            `Scored ${c}/${tot} in the Qa'idah Huruf speed drill (+${c * 2} Ilm, +₦${c * 50}).`,
          );
          close();
        }}
      />
    );
  } else if (activity === 'tutor') {
    title = 'Arowo-Kewu Hustle — Grade Junior Slates';
    body = (
      <McqRunner
        title="Check Junior Omo Kewu Slates"
        subtitle="Pick the slate with the right Arabic spelling to earn your monitor stipend!"
        questions={makeTutorQuestions()}
        onFinish={(c, tot) => {
          const pay = c * 200;
          reward(
            { naira: pay, ilm: c, barakah: 2 },
            `Graded ${c}/${tot} junior slates accurately and earned ₦${pay.toLocaleString()}!`,
          );
          close();
        }}
      />
    );
  } else if (activity === 'wudu') {
    title = 'Fiqh of Purification — Matn Al-Akhdari';
    body =
      subPhase === 'seq' ? (
        <SequenceRunner
          title="Order the Steps of Wudu"
          subtitle="Tap each step of ablution from Niyyah to washing the feet."
          items={WUDU_STEPS}
          onSuccess={() => {
            if (owned.includes('akhdari')) {
              setSubPhase('mcq');
            } else {
              reward({ ilm: 5, taqwa: 6 }, 'Completed the Wudu step sequencer flawlessly (+5 Ilm, +6 Taqwa).');
              close();
            }
          }}
        />
      ) : (
        <McqRunner
          title="Matn Al-Akhdari — Sujood Sahw Cases"
          subtitle="Apply Maliki fiqh rulings to real prayer scenarios."
          questions={FIQH_CASES}
          onFinish={(c, tot) => {
            reward(
              { ilm: 5 + c * 2, taqwa: 6 },
              `Completed Wudu & Al-Akhdari Fiqh cases (${c}/${tot}) (+${5 + c * 2} Ilm, +6 Taqwa).`,
            );
            close();
          }}
        />
      );
  } else if (activity === 'nahw') {
    title = 'Adult / Markaziy Shed — Al-Ajurrumiyyah (Nahw)';
    body = !owned.includes('ajurrumiyyah') ? (
      <div className="p-6 text-center space-y-3">
        <Lock className="w-10 h-10 text-amber-600 mx-auto" />
        <h3 className="font-extrabold text-base text-stone-900">Requires {BOOK_NAMES.ajurrumiyyah}</h3>
        <p className="text-xs text-stone-600 max-w-md mx-auto">
          Walk across the street to Mallam Idris&apos;s Kiosk to purchase <b>{BOOK_NAMES.ajurrumiyyah}</b> (₦5,000) and unlock Arabic grammar parsing!
        </p>
        <button
          onClick={() => setActivity('shop')}
          className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer"
        >
          Open Mallam Idris&apos;s Bookshop
        </button>
      </div>
    ) : (
      <McqRunner
        title="Al-Ajurrumiyyah — Fa'il & Maf'ul Parsing"
        subtitle="Identify the doer (Fa'il) and receiver (Maf'ul bihi) in each Arabic sentence."
        questions={makeNahwQuestions(5)}
        onFinish={(c, tot) => {
          reward(
            { ilm: c * 3, barakah: c * 2, naira: c * 250 },
            `Parsed ${c}/${tot} sentences in Al-Ajurrumiyyah grammar class (+${c * 3} Ilm, +₦${c * 250}).`,
          );
          close();
        }}
      />
    );
  } else if (activity === 'adhan') {
    title = `Minaret Call — ${prayer.name} Adhan`;
    body = (
      <SequenceRunner
        title={`Call the ${prayer.name} Adhan`}
        subtitle="Tap each phrase of the Adhan in order to summon the congregation to prayer!"
        items={ADHAN_LINES}
        onSuccess={() => {
          triggerRally(prayer.name);
          reward(
            { taqwa: 8, barakah: 6, ilm: 2 },
            `Called the ${prayer.name} Adhan from the minaret! Everyone gathered for Jama'ah (+8 Taqwa, +6 Barakah).`,
          );
          close();
        }}
      />
    );
  } else if (activity === 'homelesson') {
    title = 'Isolo Estate — Private Home Lesson Hustle';
    body = (
      <McqRunner
        title="Home Lesson Tutoring (Isolo Estate)"
        subtitle="Teach Alhaji's children Arabic grammar & Fiqh to earn your ₦3,500 home-lesson fee!"
        questions={makeHomeLessonQuestions()}
        onFinish={(c, tot) => {
          const pay = 1500 + c * 400;
          reward(
            { naira: pay, ilm: c * 2, barakah: 4 },
            `Taught Home Lesson in Isolo (${c}/${tot} correct) and received ₦${pay.toLocaleString()}!`,
          );
          close();
        }}
      />
    );
  } else if (activity === 'khutbah') {
    title = 'Idimu Central Mosque — Friday Khutbah';
    body =
      subPhase === 'seq' ? (
        <SequenceRunner
          title="Part 1: Order the Pillars of the Khutbah"
          subtitle="Arrange the classical steps of the Friday sermon from Hamd to Dua."
          items={KHUTBAH_PARTS}
          onSuccess={() => setSubPhase('mcq')}
        />
      ) : (
        <McqRunner
          title="Part 2: Counsel the Congregation"
          subtitle="Guide the community with wisdom and mercy."
          questions={KHUTBAH_QUESTIONS}
          onFinish={(c, tot) => {
            const pay = 3000 + c * 1000;
            reward(
              { naira: pay, barakah: 10, taqwa: 8, ilm: 4 },
              `Delivered a moving Friday Khutbah at Idimu Central Mosque! Received ₦${pay.toLocaleString()} Sadaqah & +10 Barakah (${c}/${tot}).`,
            );
            close();
          }}
        />
      );
  } else if (activity === 'shop') {
    title = "Mallam Idris's Bookshop & Wardrobe";
    body = <ShopView />;
  } else if (activity === 'bus') {
    title = 'Danfo Bus Stop — Lagos Transit';
    body = <BusView />;
  } else if (activity === 'football') {
    title = 'Kewu F.C. — Ping-Pong Table Soccer';
    body = <FootballMinigame onClose={close} />;
  } else if (activity === 'tenten') {
    title = 'Tinko-Tinko — Foot-Clapping Duel';
    body = <TenTenGame onClose={close} />;
  } else if (activity === 'suwe') {
    title = 'Suwe — Nigerian Hopscotch';
    body = <SuweGame onClose={close} />;
  } else if (activity === 'ayo') {
    title = 'Ayo Olopon — Yoruba Mancala';
    body = <AyoGame onClose={close} />;
  } else if (activity === 'skipping') {
    title = 'Skipping Rope — Okunuga';
    body = <SkippingGame onClose={close} />;
  } else if (activity === 'catcher') {
    title = 'Boju-Boju — Dodge & Collect';
    body = <CatcherGame onClose={close} />;
  }

  return (
    <div
      className="absolute inset-0 z-20 flex items-end sm:items-center justify-center p-2 sm:p-3 bg-black/50 backdrop-blur-[2px]"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="kw-glass-strong kw-pop w-full max-w-2xl max-h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/10">
          <h2 className="kw-display text-base sm:text-lg font-extrabold text-kw-gold-soft flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-kw-gold" /> {title}
          </h2>
          <button
            onClick={close}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-kw-cream-dim hover:text-white hover:bg-white/10 cursor-pointer"
          >
            ✕ Close
          </button>
        </div>
        <div className="kw-scroll overflow-y-auto flex-1 bg-kw-cream text-stone-900">
          {body}
        </div>
      </div>
    </div>
  );
};

