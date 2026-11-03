'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Calendar, ChevronRight, Sparkles, ScrollText, AlertCircle } from 'lucide-react';

export const EventCard: React.FC = () => {
  const { currentEvent, chooseOption, nextDay, player } = useGameStore();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-md overflow-hidden">
        {currentEvent ? (
          <div className="p-6 md:p-8">
            {/* Event Category & Arabic Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-4 mb-4">
              <span className="text-xs uppercase tracking-wider font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                {currentEvent.category.replace('_', ' ')}
              </span>
              {currentEvent.arabicTitle && (
                <span className="text-lg md:text-xl font-serif text-emerald-800 dark:text-emerald-400 font-bold" dir="rtl">
                  {currentEvent.arabicTitle}
                </span>
              )}
            </div>

            {/* Event Title & Narrative */}
            <h2 className="text-xl md:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-3">
              {currentEvent.title}
            </h2>
            <p className="text-base text-stone-700 dark:text-stone-300 leading-relaxed mb-6 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800">
              {currentEvent.description}
            </p>

            {/* Choices */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                What will you do?
              </div>
              {currentEvent.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => chooseOption(choice)}
                  className="w-full text-left p-4 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition group flex items-center justify-between gap-4 cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 text-sm md:text-base">
                      {choice.text}
                    </div>
                    {choice.description && (
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                        {choice.description}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-600 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-700 dark:text-emerald-300">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
              The Sun Has Set on Another Day in Kewu
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto mb-6">
              You reflect on today’s lessons and chores. As morning approaches, a new event awaits you at MAHD IQRA, Ejigbo!
            </p>
            <button
              onClick={nextDay}
              className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-3 rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Advance to Next Day in Kewu
            </button>
          </div>
        )}

        {/* Life Log History */}
        <div className="bg-stone-50 dark:bg-stone-950/40 border-t border-stone-200 dark:border-stone-800 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-3">
            <ScrollText className="w-4 h-4 text-amber-600" />
            Recent Life Memories & Chronicle
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {player.logHistory.slice(0, 5).map((log, index) => (
              <div
                key={index}
                className="text-xs md:text-sm text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-900 p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 flex items-start gap-2"
              >
                <span className="text-emerald-600 font-bold">•</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
