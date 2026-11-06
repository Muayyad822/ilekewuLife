'use client';

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SubjectId } from '@/types/game';
import {
  SUBJECTS,
  getFeaturedSubjectForToday,
  getDailyTopicForSubject,
  getTodayDateKey,
} from '@/data/curriculum';
import { McqRunner } from '@/components/Activities';
import {
  BookOpen,
  CheckCircle2,
  Flame,
  GraduationCap,
  Sparkles,
  Users,
  Award,
  Hand,
  Swords,
} from 'lucide-react';

export const ClassroomView: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const education = useGameStore((s) => s.education);
  const onlinePeers = useGameStore((s) => s.onlinePeers);
  const activeClassroomSubject = useGameStore((s) => s.activeClassroomSubject);
  const completeDailyClassroomLesson = useGameStore((s) => s.completeDailyClassroomLesson);
  const sendSalaamToPeer = useGameStore((s) => s.sendSalaamToPeer);
  const organizeGameWithPeer = useGameStore((s) => s.organizeGameWithPeer);

  const featuredSubject = useMemo(() => getFeaturedSubjectForToday(), []);
  const [activeSubject, setActiveSubject] = useState<SubjectId>(activeClassroomSubject || featuredSubject);

  React.useEffect(() => {
    if (activeClassroomSubject) {
      setActiveSubject(activeClassroomSubject);
      setMode('lesson');
      setLastResult(null);
    }
  }, [activeClassroomSubject]);
  const [mode, setMode] = useState<'lesson' | 'quiz' | 'result'>('lesson');
  const [quizSession, setQuizSession] = useState(0);
  const [lastResult, setLastResult] = useState<{
    correct: number;
    total: number;
    stipend: number;
    ilmGain: number;
    alreadyDoneToday: boolean;
  } | null>(null);
  const [peerToast, setPeerToast] = useState<string | null>(null);

  const subjectMeta = SUBJECTS.find((s) => s.id === activeSubject) ?? SUBJECTS[0];
  const topic = useMemo(
    () => getDailyTopicForSubject(activeSubject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSubject, quizSession],
  );

  const todayKey = getTodayDateKey();
  const isCompletedToday = (sub: SubjectId) =>
    education.completedDailyKeys.includes(`${todayKey}:${sub}`);

  const completedTodayCount = SUBJECTS.filter((s) => isCompletedToday(s.id)).length;

  const handleSelectSubject = (sub: SubjectId) => {
    setActiveSubject(sub);
    setMode('lesson');
    setLastResult(null);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Compact Streak & Progress Header */}
      <div className="rounded-2xl bg-linear-to-r from-emerald-950 via-emerald-900 to-teal-900 text-white p-4 shadow-md border border-emerald-700/50 flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-white/10 px-2 py-0.5 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" /> {todayKey}
          </div>
          <h3 className="text-base sm:text-lg font-extrabold">
            Daily Classroom
          </h3>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-1.5 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-300 font-extrabold text-sm">
              <Flame className="w-4 h-4" /> {player.streakDays}d
            </div>
            <div className="text-[9px] text-emerald-200 uppercase font-semibold">Streak</div>
          </div>
          <div className="bg-black/25 border border-white/15 rounded-xl px-3 py-1.5 text-center">
            <div className="text-white font-extrabold text-sm">
              {completedTodayCount}/{SUBJECTS.length}
            </div>
            <div className="text-[9px] text-emerald-200 uppercase font-semibold">Done</div>
          </div>
        </div>
      </div>

      {/* Subject Hall Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Subjects
          </span>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
            ★ Featured: {SUBJECTS.find((s) => s.id === featuredSubject)?.name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SUBJECTS.map((sub) => {
            const active = sub.id === activeSubject;
            const done = isCompletedToday(sub.id);
            const mastery = education.subjectMastery[sub.id] ?? 15;
            const isFeatured = sub.id === featuredSubject;
            return (
              <button
                key={sub.id}
                onClick={() => handleSelectSubject(sub.id)}
                className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer relative overflow-hidden ${
                  active
                    ? 'border-emerald-700 bg-emerald-50/90 shadow-xs'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xl">{sub.icon}</span>
                  <div className="flex items-center gap-1">
                    {isFeatured && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-200 text-amber-950">
                        Today
                      </span>
                    )}
                    {done && (
                      <span title="Completed today">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="font-extrabold text-xs sm:text-sm text-stone-900 mt-1">{sub.name}</div>
                <div dir="rtl" className="text-xs font-serif text-stone-500">
                  {sub.arabicName}
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-stone-500 mb-0.5">
                    <span>Mastery</span>
                    <span>{mastery}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${mastery}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Classroom Halqah Visual + Online Classmates */}
      <div className="rounded-2xl border-2 border-stone-200 bg-stone-900 text-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Live Classroom Halqah · {subjectMeta.ustadh}
            </div>
            <h4 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <span>{subjectMeta.icon}</span> {topic.title}
            </h4>
          </div>
          <span dir="rtl" className="text-base sm:text-lg font-serif text-amber-200 font-bold">
            {topic.arabicTitle}
          </span>
        </div>

        {/* Madrasah Chalkboard */}
        <div className="rounded-xl bg-[#103828] border-4 border-[#7c4d25] p-4 sm:p-5 text-center space-y-2 shadow-inner">
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-bold">
            ── Classroom Blackboard (السَّبُّورَة) ──
          </div>
          <div dir="rtl" className="text-2xl sm:text-3xl font-serif font-bold text-amber-200 py-1 leading-relaxed">
            {topic.chalkboard.arabic}
          </div>
          <div className="text-xs italic text-emerald-100">{topic.chalkboard.transliteration}</div>
          <div className="text-xs sm:text-sm font-semibold text-white bg-black/20 rounded-lg px-3 py-1.5 inline-block">
            &ldquo;{topic.chalkboard.meaning}&rdquo;
          </div>
        </div>

        {/* Classmates Sitting in the Halqah Right Now */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" /> Classmates Seated in Halqah ({onlinePeers.length + 1} Present)
            </span>
            <span className="text-[11px] text-stone-400">Tap a classmate to greet or quiz-duel</span>
          </div>

          {peerToast && (
            <div className="text-xs font-bold bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-2 rounded-xl">
              {peerToast}
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {/* Current Player */}
            <div className="px-3 py-2 rounded-xl bg-emerald-800/50 border border-emerald-400/40 shrink-0 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <div className="text-xs font-extrabold text-white">{player.name} (You)</div>
                <div className="text-[10px] text-emerald-200">Seated front row · {player.stats.ilm}% Ilm</div>
              </div>
            </div>

            {onlinePeers.slice(0, 4).map((peer) => (
              <div
                key={peer.uid}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center gap-2.5"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {peer.name}
                  </div>
                  <div className="text-[10px] text-stone-400">
                    Juz {peer.hifzJuz} · {peer.ilm}% Ilm
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const res = sendSalaamToPeer(peer);
                      setPeerToast(res.msg);
                    }}
                    title="Send Salaam & Dua"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-600 text-xs cursor-pointer transition"
                  >
                    <Hand className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setMode('quiz');
                      setQuizSession((s) => s + 1);
                      setPeerToast(`⚔️ Started a live classroom speed-test duel with ${peer.name}!`);
                      organizeGameWithPeer(peer, 'quiz_duel', 200);
                    }}
                    title="Challenge to Classroom Quiz Duel"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-stone-950 text-xs cursor-pointer transition"
                  >
                    <Swords className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mode Switch: Lesson Content vs Daily Assessment */}
      {mode === 'lesson' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-2xs">
          <div className="flex items-start gap-3 bg-amber-50/90 border border-amber-200 rounded-xl p-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-extrabold text-lg shrink-0">
              👳🏾‍♂️
            </div>
            <div>
              <div className="text-xs font-extrabold text-amber-950">
                {topic.ustadhName} ({topic.ustadhTitle}) says:
              </div>
              <p className="text-xs sm:text-sm text-stone-700 mt-0.5 leading-relaxed">{topic.summary}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-700" /> Today&apos;s Lesson Breakdown
            </h5>
            <div className="grid grid-cols-1 gap-3">
              {topic.keyPoints.map((kp, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-extrabold text-sm text-stone-900">{kp.heading}</span>
                    {kp.arabicSnippet && (
                      <span
                        dir="rtl"
                        className="font-serif text-lg font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-lg"
                      >
                        {kp.arabicSnippet}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{kp.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-emerald-950">
              <span className="font-extrabold">💡 Daily Practice: </span>
              {topic.practicalTakeaway}
            </div>
            <button
              onClick={() => {
                setQuizSession((s) => s + 1);
                setMode('quiz');
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shrink-0 flex items-center justify-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              Sit for Today&apos;s Test ({topic.quiz.length} Questions)
            </button>
          </div>
        </div>
      )}

      {mode === 'quiz' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <McqRunner
            key={`${activeSubject}-${quizSession}`}
            title={`Daily Assessment: ${topic.title}`}
            subtitle={`Answer ${topic.quiz.length} questions from ${topic.ustadhName}'s lesson to claim your scholarship stipend!`}
            questions={topic.quiz}
            onFinish={(correct, total) => {
              const res = completeDailyClassroomLesson(activeSubject, topic.title, correct, total);
              setLastResult({ correct, total, ...res });
              setMode('result');
            }}
          />
        </div>
      )}

      {mode === 'result' && lastResult && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 p-6 text-center space-y-4 shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              Daily Classroom Assessment Complete!
            </div>
            <h4 className="text-xl font-extrabold text-stone-900">
              You Scored {lastResult.correct} / {lastResult.total}
            </h4>
            <p className="text-xs text-stone-600 max-w-md mx-auto">
              {lastResult.alreadyDoneToday
                ? 'Revision session completed! You earned extra revision stipend and strengthened your subject mastery.'
                : `Masha'Allah! ${topic.ustadhName} signed your attendance register for today!`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs">
              +₦{lastResult.stipend.toLocaleString()} Scholarship Stipend
            </span>
            <span className="px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 font-extrabold text-xs">
              +{lastResult.ilmGain} Ilm Gained
            </span>
            <span className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs">
              🔥 {player.streakDays}-Day Learning Streak
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setMode('lesson')}
              className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-xs font-bold text-stone-800 cursor-pointer"
            >
              Review Lesson Notes
            </button>
            <button
              onClick={() => {
                const nextSub =
                  SUBJECTS.find((s) => !isCompletedToday(s.id) && s.id !== activeSubject)?.id ??
                  SUBJECTS[(SUBJECTS.findIndex((s) => s.id === activeSubject) + 1) % SUBJECTS.length].id;
                handleSelectSubject(nextSub);
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold cursor-pointer"
            >
              Enter Next Subject Hall →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
