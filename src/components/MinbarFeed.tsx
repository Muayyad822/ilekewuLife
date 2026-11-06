'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { GameChallenge, OnlinePeer } from '@/types/game';
import { Leaderboard } from '@/components/Leaderboard';
import {
  Mic,
  Radio,
  Send,
  Heart,
  Flame,
  Users,
  Hand,
  Swords,
  Trophy,
  Gamepad2,
} from 'lucide-react';
import { sound } from '@/lib/audio';

export const MinbarFeed: React.FC = () => {
  const minbarPosts = useGameStore((s) => s.minbarPosts);
  const addMinbarPost = useGameStore((s) => s.addMinbarPost);
  const onlinePeers = useGameStore((s) => s.onlinePeers);
  const challenges = useGameStore((s) => s.challenges);
  const sendSalaamToPeer = useGameStore((s) => s.sendSalaamToPeer);
  const organizeGameWithPeer = useGameStore((s) => s.organizeGameWithPeer);

  const [tab, setTab] = useState<'online' | 'radio' | 'ranks'>('online');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<OnlinePeer | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  const startPeerGame = (peer: OnlinePeer, gameType: GameChallenge['gameType'], wager: number) => {
    const res = organizeGameWithPeer(peer, gameType, wager);
    setToast(res.msg);
    setSelectedPeer(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTab('online')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 ${
              tab === 'online'
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4" /> Online Scholars ({onlinePeers.length + 1})
          </button>
          <button
            onClick={() => setTab('radio')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 ${
              tab === 'radio'
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Radio className="w-4 h-4" /> Minbar Broadcast
          </button>
          <button
            onClick={() => setTab('ranks')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer flex items-center gap-1.5 ${
              tab === 'ranks'
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Trophy className="w-4 h-4" /> Roll of Honour
          </button>
        </div>

        <span className="text-xs bg-emerald-100 text-emerald-900 font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          {onlinePeers.length + 1} Active Now
        </span>
      </div>

      {toast && (
        <div className="text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-stone-500 hover:text-stone-800 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: LIVE ONLINE STUDENTS & ORGANIZE GAMES */}
      {tab === 'online' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-stone-900 text-white p-4 sm:p-5 space-y-1">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-amber-400" /> Live Madrasah Lobby — Greet &amp; Organize Games
            </h3>
            <p className="text-xs text-stone-300">
              See fellow students who are online right now! Exchange Salaam for Barakah or organize a live match (Musabaqah Quiz Duel, Ayo Olopon, Ping-Pong Football, or Tinko-Tinko).
            </p>
          </div>

          {/* Match Organizer Modal Card when a peer is clicked */}
          {selectedPeer && (
            <div className="rounded-2xl border-2 border-amber-500 bg-amber-50/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase text-amber-900">
                    Organize a Friendly Match vs. {selectedPeer.name}
                  </div>
                  <p className="text-xs text-stone-600">
                    Choose a game below to enter the arena immediately with {selectedPeer.name}:
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPeer(null)}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={() => startPeerGame(selectedPeer, 'quiz_duel', 200)}
                  className="p-3 rounded-xl border border-emerald-400 bg-white hover:bg-emerald-50 text-left cursor-pointer"
                >
                  <div className="font-extrabold text-xs text-stone-900">📖 Classroom Musabaqah Duel</div>
                  <div className="text-[11px] text-stone-500">Test today&apos;s subject knowledge head-to-head</div>
                </button>
                <button
                  onClick={() => startPeerGame(selectedPeer, 'football', 300)}
                  className="p-3 rounded-xl border border-sky-400 bg-white hover:bg-sky-50 text-left cursor-pointer"
                >
                  <div className="font-extrabold text-xs text-stone-900">⚽ Kewu F.C. Table Soccer</div>
                  <div className="text-[11px] text-stone-500">First to 3 goals on the compound pitch</div>
                </button>
                <button
                  onClick={() => startPeerGame(selectedPeer, 'ayo', 250)}
                  className="p-3 rounded-xl border border-amber-400 bg-white hover:bg-amber-50 text-left cursor-pointer"
                >
                  <div className="font-extrabold text-xs text-stone-900">🪵 Ayo Olopon (Yoruba Mancala)</div>
                  <div className="text-[11px] text-stone-500">Capture the most seeds on the carved board</div>
                </button>
                <button
                  onClick={() => startPeerGame(selectedPeer, 'tenten', 200)}
                  className="p-3 rounded-xl border border-rose-400 bg-white hover:bg-rose-50 text-left cursor-pointer"
                >
                  <div className="font-extrabold text-xs text-stone-900">👟 Tinko-Tinko Foot Duel</div>
                  <div className="text-[11px] text-stone-500">Rhythm &amp; reflex playground match</div>
                </button>
              </div>
            </div>
          )}

          {/* Online Students Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onlinePeers.map((peer) => (
              <div
                key={peer.uid}
                className="p-4 rounded-2xl border border-stone-200 bg-white flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-extrabold text-base relative shrink-0">
                      {peer.name.charAt(0)}
                      <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                        {peer.name}
                      </div>
                      <div className="text-[11px] text-stone-500">{peer.madrasahName}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-emerald-800">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 capitalize">
                          {peer.stage.replace('_', ' ')}
                        </span>
                        <span>Juz {peer.hifzJuz}/30</span>
                        <span>{peer.ilm}% Ilm</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      const res = sendSalaamToPeer(peer);
                      setToast(res.msg);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-bold text-stone-800 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Hand className="w-3.5 h-3.5 text-emerald-700" /> Send Salaam
                  </button>
                  <button
                    onClick={() => setSelectedPeer(peer)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" /> Organize Game
                  </button>
                </div>
              </div>
            ))}
          </div>

          {challenges.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
                Recent Organized Matches
              </div>
              <div className="space-y-1.5">
                {challenges.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 flex items-center justify-between"
                  >
                    <span>
                      <b>{c.fromName}</b> challenged <b>{c.toName}</b> to{' '}
                      <span className="uppercase font-bold text-emerald-700">{c.gameType.replace('_', ' ')}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-800">₦{c.wager}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MINBAR LIVE RADIO FEED */}
      {tab === 'radio' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500 animate-pulse" />
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-stone-900">
                  Minbar Live Radio (مِنْبَرُ الْحَيَاةِ)
                </h3>
                <p className="text-xs text-stone-500">
                  Share daily lessons, voice recitations, and Madrasah announcements across Nigeria.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Share a reflection from today's Classroom topic or invite students to a match..."
                className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:outline-hidden focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={handleSimulatedVoiceRecord}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center gap-1 ${
                  isRecording
                    ? 'bg-red-600 text-white border-red-700 animate-bounce'
                    : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span className="text-xs font-semibold hidden md:inline">
                  {isRecording ? 'Recording...' : 'Voice'}
                </span>
              </button>
              <button
                type="submit"
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                <span className="text-xs hidden md:inline">Broadcast</span>
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {minbarPosts.map((post) => (
              <div
                key={post.id}
                className="bg-stone-50 p-4 rounded-xl border border-stone-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                      {post.authorName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-stone-900">{post.authorName}</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-wide">
                        {post.authorStage.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-sm text-stone-800 mb-3 leading-relaxed">{post.text}</p>

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
      )}

      {/* TAB 3: NATIONAL ROLL OF HONOUR (LEADERBOARD) */}
      {tab === 'ranks' && <Leaderboard />}
    </div>
  );
};
