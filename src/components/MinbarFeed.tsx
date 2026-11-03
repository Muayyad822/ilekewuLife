'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Mic, Radio, Send, Heart, Flame } from 'lucide-react';
import { sound } from '@/lib/audio';

export const MinbarFeed: React.FC = () => {
  const { minbarPosts, addMinbarPost } = useGameStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    addMinbarPost(inputText.trim());
    setInputText('');
  };

  const handleSimulatedVoiceRecord = () => {
    setIsRecording(true);
    sound.playWalaahTap();
    setTimeout(() => {
      setIsRecording(false);
      addMinbarPost('🎙️ [Voice Recitation] Surah Al-Ikhlas recited with Tajweed during Tahajjud prayer.');
    }, 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-6">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-md">
        {/* Minbar Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-500 animate-pulse" />
            <div>
              <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                Minbar Live Radio (مِنْبَرُ الْحَيَاةِ)
              </h3>
              <p className="text-xs text-stone-500">
                Live communal broadcasts, voice notes, and Madrasah banter from across Nigeria.
              </p>
            </div>
          </div>
          <span className="text-xs bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold px-3 py-1 rounded-full border border-red-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" /> LIVE
          </span>
        </div>

        {/* Post Creation Input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Share a sermon, recitation update, or Ile-Kewu meme..."
              className="flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={handleSimulatedVoiceRecord}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                isRecording
                  ? 'bg-red-600 text-white border-red-700 animate-bounce'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-200'
              }`}
              title="Record 15-second Voice Snippet"
            >
              <Mic className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline">
                {isRecording ? 'Recording...' : 'Voice'}
              </span>
            </button>
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-3 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              <span className="text-xs hidden md:inline">Broadcast</span>
            </button>
          </div>
        </form>

        {/* Live Broadcast Feed */}
        <div className="space-y-3">
          {minbarPosts.map((post) => (
            <div
              key={post.id}
              className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-xl border border-stone-200 dark:border-stone-800"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                    {post.authorName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {post.authorName}
                    </div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wide">
                      {post.authorStage.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-stone-400">
                  {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="text-sm text-stone-800 dark:text-stone-200 mb-3 leading-relaxed">
                {post.text}
              </p>

              <div className="flex items-center gap-4 text-xs font-semibold text-stone-500">
                <button
                  onClick={() => sound.playTakbeer()}
                  className="flex items-center gap-1.5 hover:text-emerald-600 transition cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>{post.takbeers} Takbeer!</span>
                </button>
                <button
                  onClick={() => sound.playCoin()}
                  className="flex items-center gap-1.5 hover:text-red-500 transition cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-red-400" />
                  <span>{post.likes} Barakah</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
