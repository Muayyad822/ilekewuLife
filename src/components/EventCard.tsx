'use client';

import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { Calendar, ChevronRight, Sparkles, ScrollText } from 'lucide-react';

export const EventCard: React.FC = () => {
  const currentEvent = useGameStore((s) => s.currentEvent);
  const chooseOption = useGameStore((s) => s.chooseOption);
  const nextDay = useGameStore((s) => s.nextDay);
  const player = useGameStore((s) => s.player);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-2xs overflow-hidden">
      {currentEvent ? (
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-4">
            <span className="text-[11px] uppercase tracking-wider font-extrabold bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-300">
              {currentEvent.category.replace('_', ' ')}
            </span>
            {currentEvent.arabicTitle && (
              <span className="text-lg font-serif text-emerald-800 font-bold" dir="rtl">
                {currentEvent.arabicTitle}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 mb-2">
            {currentEvent.title}
          </h2>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed mb-5 bg-stone-50 p-4 rounded-xl border border-stone-200/80">
            {currentEvent.description}
          </p>

          <div className="space-y-2.5">
            <div className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              What will you do?
            </div>
            {currentEvent.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => chooseOption(choice)}
                className="w-full text-left p-3.5 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition group flex items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <div className="font-bold text-stone-900 group-hover:text-emerald-800 text-xs sm:text-sm">
                    {choice.text}
                  </div>
                  {choice.description && (
                    <div className="text-xs text-stone-500 mt-0.5">{choice.description}</div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-600 transition shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-700">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-stone-900 mb-1">
            Evening Reflection at Your Residence
          </h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto mb-4">
            You have resolved today&apos;s main event. Rest for the night to restore your energy and begin a new day!
          </p>
          <button
            onClick={nextDay}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Sleep &amp; Advance to Next Day
          </button>
        </div>
      )}

      <div className="bg-stone-50 border-t border-stone-200 p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-stone-600 uppercase tracking-wider mb-2.5">
          <ScrollText className="w-3.5 h-3.5 text-amber-600" />
          Recent Life Memories &amp; Activity Log
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {player.logHistory.slice(0, 5).map((log, index) => (
            <div
              key={index}
              className="text-xs text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/80 flex items-start gap-2"
            >
              <span className="text-emerald-600 font-bold">•</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
