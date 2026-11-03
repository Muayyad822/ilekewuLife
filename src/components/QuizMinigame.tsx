'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Trophy, CheckCircle, XCircle, Award } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  arabicSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: 'When a Noon Sakinah (نْ) or Tanween meets the letter Baa (ب), which Tajweed rule applies?',
    arabicSnippet: 'مِنْ بَعْدِ',
    options: ['Izhar (Clear pronunciation)', 'Iqlab (Transforming to Meem with Ghunnah)', 'Idgham (Merging)', 'Ikhfa (Hiding)'],
    correctIndex: 1,
    explanation: 'Correct! It is Iqlab: the Noon turns into a slight Meem with Ghunnah nasal sound.',
    points: 10,
  },
  {
    id: 2,
    question: 'Which of the following letters belongs to the Qalqalah (echo/bouncing sound) group (ق ط ب ج د)?',
    options: ['Seen (س)', 'Daal (د)', 'Raa (ر)', 'Lam (ل)'],
    correctIndex: 1,
    explanation: 'Correct! Daal (د) is one of the five letters of Qutb Jad (ق ط ب ج د).',
    points: 10,
  },
  {
    id: 3,
    question: 'What is the literal meaning of the Yoruba word "Ile-Kewu"?',
    options: ['House of Prayer', 'House of Reading / Arabic Learning', 'The King’s Palace', 'House of Fasting'],
    correctIndex: 1,
    explanation: 'Correct! "Ile" means house, and "Kewu" comes from the Yoruba root for reading or Quranic schooling.',
    points: 8,
  },
  {
    id: 4,
    question: 'Surah Al-Kawthar is famously known as:',
    arabicSnippet: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ',
    options: ['The Longest Surah in the Quran', 'The Shortest Surah in the Quran', 'The First Surah revealed', 'The Mother of the Book'],
    correctIndex: 1,
    explanation: 'Correct! Surah Al-Kawthar has only 3 verses, making it the shortest Surah.',
    points: 12,
  },
];

export const QuizMinigame: React.FC = () => {
  const { quizAnswerSuccess } = useGameStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const question = QUESTIONS[currentIdx];

  const handleSelect = (idx: number) => {
    if (hasSubmitted) return;
    setSelectedIdx(idx);
    setHasSubmitted(true);

    if (idx === question.correctIndex) {
      quizAnswerSuccess(question.points);
    }
  };

  const handleNext = () => {
    setSelectedIdx(null);
    setHasSubmitted(false);
    setCurrentIdx((prev) => (prev + 1) % QUESTIONS.length);
  };

  const isCorrect = selectedIdx === question.correctIndex;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            <div>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Musabaqah Recitation & Tajweed Duel
              </h3>
              <p className="text-xs text-stone-500">
                Test your knowledge of Quranic recitation rules and West African Islamic heritage.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300">
            Question {currentIdx + 1} of {QUESTIONS.length}
          </span>
        </div>

        {/* Question Content */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
            {question.question}
          </h4>
          {question.arabicSnippet && (
            <div className="text-2xl font-serif text-emerald-700 dark:text-emerald-400 font-bold my-3 bg-stone-50 dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 inline-block">
              {question.arabicSnippet}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {question.options.map((option, idx) => {
            let btnStyle = 'border-stone-200 dark:border-stone-700 hover:border-emerald-500 hover:bg-emerald-50/50';

            if (hasSubmitted) {
              if (idx === question.correctIndex) {
                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100 font-bold';
              } else if (idx === selectedIdx) {
                btnStyle = 'border-red-500 bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-100';
              } else {
                btnStyle = 'opacity-50 border-stone-200';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={hasSubmitted}
                className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between cursor-pointer ${btnStyle}`}
              >
                <span>{option}</span>
                {hasSubmitted && idx === question.correctIndex && (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                {hasSubmitted && idx === selectedIdx && idx !== question.correctIndex && (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback & Next */}
        {hasSubmitted && (
          <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-xl border border-stone-200 dark:border-stone-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm">
              <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                {isCorrect ? '✨ Masha Allah! Correct!' : '⚠️ Incorrect.'}{' '}
              </span>
              <span className="text-stone-700 dark:text-stone-300">{question.explanation}</span>
            </div>
            <button
              onClick={handleNext}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition shrink-0 cursor-pointer"
            >
              Next Question ➡️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
