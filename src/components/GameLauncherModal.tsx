'use client';

import React, { useState } from 'react';
import { MINIGAMES, MinigameInfo } from '@/data/minigames';
import { OnlinePeer } from '@/types/game';
import { useGameStore } from '@/store/gameStore';
import { User, Bot, Play, ChevronDown, ChevronUp, Star, Users, Swords } from 'lucide-react';
import { sound } from '@/lib/audio';

interface GameLauncherModalProps {
  gameId: string;
  onPlayBot: () => void;
  onPlayFriend?: (peer: OnlinePeer) => void;
  onBack: () => void;
  // If already challenging a specific peer (from Circle flow)
  targetPeer?: OnlinePeer | null;
}

export const GameLauncherModal: React.FC<GameLauncherModalProps> = ({
  gameId,
  onPlayBot,
  onPlayFriend,
  onBack,
  targetPeer,
}) => {
  const game: MinigameInfo = MINIGAMES[gameId] || {
    id: gameId as any,
    name: gameId.toUpperCase(),
    category: 'sports',
    description: 'Engage in traditional Madrasah recreation and sharpen your skills!',
    botName: 'Madrasah Companion',
    botTitle: 'Classmate',
    howToPlay: {
      objective: 'Compete thoughtfully and score points.',
      controls: 'Use touch or keyboard controls to play.',
      winning: 'Highest score claims the prize!',
    },
    rewardText: 'Win Naira & Barakah',
  };

  const onlinePeers = useGameStore((s) => s.onlinePeers);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [pickingFriend, setPickingFriend] = useState(false);

  const handleStartBot = () => {
    sound.playWalaahTap();
    onPlayBot();
  };

  const handleStartFriend = (peer: OnlinePeer) => {
    sound.playCoin();
    if (onPlayFriend) onPlayFriend(peer);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sky-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container */}
      <div className="relative w-full max-w-sm flex flex-col items-center">
        {/* Decorative Top Star */}
        <div className="absolute -top-3 right-4 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
          <Star className="w-5 h-5 text-white fill-white" />
        </div>

        {/* Big Game Title Header */}
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wider uppercase mb-3 drop-shadow-md text-center">
          {game.name}
        </h2>

        {/* White Rounded Card */}
        <div className="w-full bg-white rounded-[28px] p-6 shadow-2xl flex flex-col gap-4 border border-white/60">
          {/* Main Description */}
          <p className="text-sm sm:text-base font-bold text-stone-800 leading-relaxed text-center px-1">
            {game.description}
          </p>

          {/* HOW TO PLAY Pill Button */}
          <button
            type="button"
            onClick={() => {
              sound.playWalaahTap();
              setShowHowToPlay((prev) => !prev);
            }}
            className="self-center inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-600 hover:bg-slate-700 text-white font-extrabold text-xs tracking-wide shadow-sm transition cursor-pointer"
          >
            <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
            <span>HOW TO PLAY</span>
            {showHowToPlay ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Expandable Rules Accordion */}
          {showHowToPlay && (
            <div className="bg-sky-50 rounded-2xl p-3.5 border border-sky-100 text-xs space-y-2 animate-in slide-in-from-top-2 duration-200">
              <div>
                <span className="font-extrabold text-sky-900">🎯 Objective: </span>
                <span className="text-stone-700">{game.howToPlay.objective}</span>
              </div>
              <div>
                <span className="font-extrabold text-sky-900">🕹️ Controls: </span>
                <span className="text-stone-700">{game.howToPlay.controls}</span>
              </div>
              <div>
                <span className="font-extrabold text-sky-900">🏆 How to Win: </span>
                <span className="text-stone-700">{game.howToPlay.winning}</span>
              </div>
            </div>
          )}

          {/* MODE SELECTION AREA */}
          {targetPeer ? (
            /* Circle Flow: Already challenging a specific peer */
            <div className="flex flex-col gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm">
                    {targetPeer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-black text-stone-900">vs. {targetPeer.name}</div>
                    <div className="text-[10px] text-stone-500">{targetPeer.madrasahName}</div>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                  ₦1,000 Pot
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStartFriend(targetPeer)}
                className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98]"
              >
                <Swords className="w-5 h-5" />
                <span>START MATCH</span>
              </button>
            </div>
          ) : pickingFriend ? (
            /* Field Flow: Picker for selecting an online scholar */
            <div className="flex flex-col gap-2 pt-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-600" /> Choose an Online Scholar:
                </span>
                <button
                  type="button"
                  onClick={() => setPickingFriend(false)}
                  className="text-[11px] font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {onlinePeers.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-500 space-y-1">
                  <p className="font-semibold">No other classmates currently online.</p>
                  <p className="text-[10px] text-stone-400">Play against the Bot below to practice right now!</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {onlinePeers.map((peer) => (
                    <div
                      key={peer.uid}
                      className="p-2.5 rounded-2xl bg-stone-50 hover:bg-sky-50 border border-stone-200 flex items-center justify-between transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                          {peer.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black text-stone-900">{peer.name}</div>
                          <div className="text-[10px] text-stone-500">{peer.ilm}% Ilm · Juz {peer.hifzJuz}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartFriend(peer)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs cursor-pointer shadow-xs transition"
                      >
                        Challenge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Field Flow: Default Big Buttons matching user reference */
            <div className="flex flex-col gap-3 pt-1">
              {/* PLAY VS. FRIEND Button */}
              <button
                type="button"
                onClick={() => {
                  sound.playWalaahTap();
                  setPickingFriend(true);
                }}
                className="w-full py-3.5 px-5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 flex items-center gap-4 cursor-pointer transition active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-white fill-current" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-extrabold text-sky-100 tracking-wider uppercase">
                    PLAY VS.
                  </div>
                  <div className="text-xl font-black text-white tracking-wide">
                    FRIEND
                  </div>
                </div>
              </button>

              {/* PLAY VS. BOT Button */}
              <button
                type="button"
                onClick={handleStartBot}
                className="w-full py-3.5 px-5 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/25 flex items-center gap-4 cursor-pointer transition active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-white fill-current" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-extrabold text-sky-100 tracking-wider uppercase">
                    PLAY VS. {game.botName.toUpperCase()}
                  </div>
                  <div className="text-xl font-black text-white tracking-wide">
                    BOT
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Back Button matching screenshot */}
        <button
          type="button"
          onClick={() => {
            sound.playWalaahTap();
            onBack();
          }}
          className="mt-4 px-8 py-2.5 rounded-2xl bg-[#cb7b58] hover:bg-[#b86947] text-white font-black text-sm tracking-wide shadow-md cursor-pointer transition active:scale-95"
        >
          Back
        </button>
      </div>
    </div>
  );
};
