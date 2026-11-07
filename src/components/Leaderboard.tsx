'use client';

import React, { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Trophy } from 'lucide-react';

interface ScholarRanking {
  id: string;
  name: string;
  stage: string;
  madrasah: string;
  ilm: number;
  hifzJuz: number;
  isPlayer?: boolean;
  isLive?: boolean;
}

export const Leaderboard: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const onlinePeers = useGameStore((s) => s.onlinePeers);
  const authUser = useGameStore((s) => s.authUser);

  const rankings = useMemo(() => {
    const list: ScholarRanking[] = [];
    const myUid = authUser?.uid || player.id;
    const seen = new Set<string>();

    onlinePeers.forEach((p) => {
      if (p.uid === myUid) return; // Add current player separately below
      if (seen.has(p.uid)) return;
      seen.add(p.uid);
      list.push({
        id: p.uid,
        name: p.name,
        stage: p.stage ? p.stage.replace('_', ' ') : 'Madrasah Scholar',
        madrasah: p.madrasahName || 'MAHD IQRA, Lagos',
        ilm: p.ilm ?? 15,
        hifzJuz: p.hifzJuz ?? 1,
        isLive: true,
      });
    });

    list.push({
      id: myUid,
      name: player.name,
      stage: player.stage ? player.stage.replace('_', ' ') : 'Madrasah Scholar',
      madrasah: player.madrasahName || 'MAHD IQRA, Lagos',
      ilm: player.stats.ilm,
      hifzJuz: player.hifzJuz,
      isPlayer: true,
      isLive: true,
    });

    return list.sort(
      (a, b) => b.hifzJuz * 3 + b.ilm - (a.hifzJuz * 3 + a.ilm),
    );
  }, [player, onlinePeers, authUser]);

  const playerRank = rankings.findIndex((r) => r.isPlayer) + 1;

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-stone-900">
              National Ile-Kewu Roll of Honour
            </h3>
            <p className="text-xs text-stone-500">
              Live ranking of Huffaz and Islamic scholars across Nigeria &amp; online classrooms.
            </p>
          </div>
        </div>
        <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full border border-amber-300">
          Your Rank: #{playerRank}
        </span>
      </div>

      <div className="space-y-2.5">
        {rankings.map((scholar, index) => {
          const rank = index + 1;
          const badge = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
          return (
            <div
              key={scholar.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                scholar.isPlayer
                  ? 'bg-emerald-50 border-emerald-500'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center font-extrabold text-sm text-stone-800 shrink-0">
                  {badge}
                </div>
                <div>
                  <div className="font-extrabold text-sm text-stone-900 flex items-center gap-1.5">
                    <span>{scholar.name}</span>
                    {scholar.isPlayer && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white">
                        You
                      </span>
                    )}
                    {scholar.isLive && !scholar.isPlayer && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online now" />
                    )}
                  </div>
                  <div className="text-xs text-stone-500">
                    {scholar.madrasah} · <span className="text-emerald-700 font-semibold capitalize">{scholar.stage}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-extrabold text-stone-900">
                  {scholar.hifzJuz}/30 Juz · {scholar.ilm}% Ilm
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
