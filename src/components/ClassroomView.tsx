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
import { TodayCard } from '@/components/classroom/TodayCard';
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
  X,
  Lock,
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
      setModalOpen(true);
    }
  }, [activeClassroomSubject]);
  const [mode, setMode] = useState<'lesson' | 'quiz' | 'result'>('lesson');
  const [modalOpen, setModalOpen] = useState(false);
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
    setModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* 4-Step Daily Learning Experience Header */}
      <TodayCard
        streakDays={player.streakDays}
        completedCount={completedTodayCount}
        totalCount={SUBJECTS.length}
        featuredSubject={featuredSubject}
        dueReviewsCount={0}
        onContinue={() => {
          handleSelectSubject(featuredSubject);
        }}
        onReviewDue={() => {
          handleSelectSubject(featuredSubject);
        }}
      />

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

      {/* Subject Halqah Modal Popup */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-stone-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto text-white flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-stone-950/80 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl p-2 rounded-xl bg-stone-900 border border-white/10 shrink-0">
                  {subjectMeta.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 truncate">
                    {subjectMeta.ustadh} · Live Halqah
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                    {topic.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span dir="rtl" className="hidden sm:inline font-serif text-amber-200 text-sm font-bold">
                  {topic.arabicTitle}
                </span>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white cursor-pointer transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Madrasah Chalkboard */}
              <div className="rounded-2xl bg-[#103828] border-4 border-[#7c4d25] p-4 sm:p-5 text-center space-y-2 shadow-inner">
                <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-bold">
                  ── Classroom Blackboard (السَّبُّورَة) ──
                </div>
                <div dir="rtl" className="text-2xl sm:text-3xl font-serif font-bold text-amber-200 py-1 leading-relaxed">
                  {topic.chalkboard.arabic}
                </div>
                <div className="text-xs italic text-emerald-100">{topic.chalkboard.transliteration}</div>
                <div className="text-xs sm:text-sm font-semibold text-white bg-black/25 rounded-lg px-3 py-1.5 inline-block">
                  &ldquo;{topic.chalkboard.meaning}&rdquo;
                </div>
              </div>

              {/* Classmates Sitting in the Halqah */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" /> Classmates in Halqah ({onlinePeers.length + 1})
                  </span>
                  <span className="text-[11px] text-stone-400">Tap a classmate to greet or quiz-duel</span>
                </div>

                {peerToast && (
                  <div className="text-xs font-bold bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 px-3 py-2 rounded-xl">
                    {peerToast}
                  </div>
                )}

                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <div className="px-3 py-2 rounded-xl bg-emerald-800/50 border border-emerald-400/40 shrink-0 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <div className="text-xs font-extrabold text-white">{player.name} (You)</div>
                      <div className="text-[10px] text-emerald-200">Front row · {player.stats.ilm}% Ilm</div>
                    </div>
                  </div>

                  {onlinePeers.length === 0 ? (
                    <div className="px-3 py-2 rounded-xl bg-white/5 border border-dashed border-white/10 text-xs text-stone-400 shrink-0 flex items-center gap-1.5">
                      <span>🕌</span>
                      <span>No other students currently in this halqah. Real classmates will appear here when online.</span>
                    </div>
                  ) : (
                    onlinePeers.map((peer) => (
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
                            const res = organizeGameWithPeer(peer, 'quiz_duel', 1000);
                            setPeerToast(res.msg);
                          }}
                          title="Challenge to Classroom Speed Duel (₦1,000 prize)"
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-xs cursor-pointer transition"
                        >
                          <Swords className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mode 1: Lesson Content Breakdown */}
              {mode === 'lesson' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-stone-950/60 border border-amber-500/20 rounded-2xl p-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-extrabold text-lg shrink-0">
                      👳🏾‍♂️
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-amber-300">
                        {topic.ustadhName} ({topic.ustadhTitle}):
                      </div>
                      <p className="text-xs sm:text-sm text-stone-300 mt-0.5 leading-relaxed">{topic.summary}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-400" /> Lesson Breakdown
                    </h5>
                    <div className="space-y-2.5">
                      {topic.keyPoints.map((kp, i) => (
                        <div
                          key={i}
                          className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-stone-950/50 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-sm text-white">{kp.heading}</span>
                            {kp.arabicSnippet && (
                              <span
                                dir="rtl"
                                className="font-serif text-base font-bold text-amber-300 bg-amber-950/40 border border-amber-400/30 px-2.5 py-0.5 rounded-lg"
                              >
                                {kp.arabicSnippet}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">{kp.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Practical Takeaway & Action Button */}
                  <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-emerald-200">
                      <span className="font-extrabold">💡 Practice: </span>
                      {topic.practicalTakeaway}
                    </div>

                    {isCompletedToday(activeSubject) ? (
                      <div className="px-4 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center gap-2 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Today&apos;s Test Completed</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setQuizSession((s) => s + 1);
                          setMode('quiz');
                        }}
                        className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-extrabold text-xs px-5 py-3 rounded-xl cursor-pointer shrink-0 flex items-center justify-center gap-2 shadow-md transition"
                      >
                        <Sparkles className="w-4 h-4" />
                        Sit for Today&apos;s Test ({topic.quiz.length} Questions)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Quiz Assessment */}
              {mode === 'quiz' && (
                <div className="bg-stone-950 rounded-2xl border border-white/10 p-2 sm:p-4 overflow-hidden">
                  {isCompletedToday(activeSubject) ? (
                    <div className="p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                        <Lock className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-extrabold text-white">
                        Test Already Completed for Today!
                      </h4>
                      <p className="text-xs text-stone-400 max-w-sm mx-auto">
                        You have already submitted today&apos;s assessment for {subjectMeta.name}. The next daily test will unlock tomorrow!
                      </p>
                      <button
                        onClick={() => setMode('lesson')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                      >
                        Return to Lesson Notes
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              )}

              {/* Mode 3: Test Result */}
              {mode === 'result' && lastResult && (
                <div className="bg-stone-950 rounded-2xl border-2 border-emerald-500/40 p-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <Award className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Assessment Submitted!
                    </div>
                    <h4 className="text-xl font-extrabold text-white">
                      You Scored {lastResult.correct} / {lastResult.total}
                    </h4>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      Masha&apos;Allah! {topic.ustadhName} has marked your attendance and recorded your test score for today.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs">
                      +₦{lastResult.stipend.toLocaleString()} Stipend
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-sky-950 border border-sky-500/30 text-sky-300 font-extrabold text-xs">
                      +{lastResult.ilmGain} Ilm Gained
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-amber-950 border border-amber-500/30 text-amber-300 font-extrabold text-xs">
                      🔥 {player.streakDays}-Day Streak
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setMode('lesson')}
                      className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-stone-300 cursor-pointer"
                    >
                      Back to Notes
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 text-xs font-extrabold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
