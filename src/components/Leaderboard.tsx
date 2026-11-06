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

const NATIONAL_SCHOLARS: ScholarRanking[] = [
  {
    id: 'nat_1',
    name: 'Sheikh Ridwanullahi (Agege)',
    stage: 'Grand Mufti',
    madrasah: "Markaz Ta'leem, Agege",
    ilm: 99,
    hifzJuz: 30,
  },
  {
    id: 'nat_2',
    name: 'Ustadhah Khadijah (Ilorin)',
    stage: 'Senior Mufassirah',
    madrasah: 'Adabiyyah Arabic College',
    ilm: 97,
    hifzJuz: 30,
  },
  {
    id: 'nat_3',
    name: 'Alfa Qasim Al-Bukhari (Ibadan)',
    stage: 'Hadith Master',
    madrasah: 'Darul Uloom, Ibadan',
    ilm: 94,
    hifzJuz: 28,
  },
  {
    id: 'nat_4',
    name: 'Brother Abdul-Basit (Oshodi)',
    stage: 'Markaziy',
    madrasah: 'Mahad Arabic Academy',
    ilm: 82,
    hifzJuz: 18,
  },
];

export const Leaderboard: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const onlinePeers = useGameStore((s) => s.onlinePeers);

  const rankings = useMemo(() => {
    const map = new Map<string, ScholarRanking>();
    NATIONAL_SCHOLARS.forEach((s) => map.set(s.id, s));
    onlinePeers.forEach((p) => {
      map.set(p.uid, {
        id: p.uid,
        name: p.name,
        stage: p.stage.replace('_', ' '),
        madrasah: p.madrasahName,
        ilm: p.ilm,
        hifzJuz: p.hifzJuz,
        isLive: p.isLive,
      });
    });
    map.set('current_player', {
      id: 'current_player',
      name: player.name,
      stage: player.stage.replace('_', ' '),
      madrasah: player.madrasahName,
      ilm: player.stats.ilm,
      hifzJuz: player.hifzJuz,
      isPlayer: true,
      isLive: true,
    });

    return Array.from(map.values()).sort(
      (a, b) => b.hifzJuz * 3 + b.ilm - (a.hifzJuz * 3 + a.ilm),
    );
  }, [player, onlinePeers]);

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
