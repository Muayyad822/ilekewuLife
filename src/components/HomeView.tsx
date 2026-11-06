'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { HOUSING_TIERS, LIFESTYLE_ASSETS } from '@/data/shop';
import { EventCard } from '@/components/EventCard';
import {
  Home as HomeIcon,
  Moon,
  Sparkles,
  KeyRound,
  CheckCircle2,
  ArrowUpRight,
  Zap,
  BookOpen,
  Coins,
  Building2,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const housing = useGameStore((s) => s.housing);
  const restAtHome = useGameStore((s) => s.restAtHome);
  const payRent = useGameStore((s) => s.payRent);
  const rentOrBuyHousing = useGameStore((s) => s.rentOrBuyHousing);
  const buyLifestyleAsset = useGameStore((s) => s.buyLifestyleAsset);
  const setRoomOverlay = useGameStore((s) => s.setRoomOverlay);

  const [tab, setTab] = useState<'room' | 'houses' | 'furnish'>('room');
  const [toast, setToast] = useState<string | null>(null);

  const currentProp = HOUSING_TIERS.find((h) => h.id === housing.tier) ?? HOUSING_TIERS[0];
  const installedUpgrades = LIFESTYLE_ASSETS.filter((a) => housing.upgrades.includes(a.id));

  const bonusEnergy = installedUpgrades.reduce((acc, a) => acc + (a.energyBonus || 0), 0);
  const totalNightlyEnergy = Math.min(100, currentProp.energyRecovery + bonusEnergy);
  const totalPassiveIncome =
    currentProp.dailyPassiveIncome +
    installedUpgrades.reduce((acc, a) => acc + (a.dailyPassiveNaira || 0), 0);

  return (
    <div className="p-4 sm:p-5 space-y-4">
      {/* Compact Header & Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {([
            ['room', '🛏️ My Room'],
            ['houses', '🏠 Rent / Buy House'],
            ['furnish', '🪑 3D Furnishings'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setToast(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition ${
                tab === id
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-stone-900 text-emerald-300 font-mono font-extrabold text-xs">
          ₦{player.stats.naira.toLocaleString()}
        </div>
      </div>

      {toast && (
        <div className="text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950 px-3.5 py-2.5 rounded-xl flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-stone-500 hover:text-stone-800 ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {tab === 'room' && (
        <>
          <div className="rounded-2xl border-2 border-amber-300/80 bg-linear-to-br from-stone-900 via-stone-900 to-amber-950 text-white p-4 sm:p-5 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
                  {currentProp.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                      {housing.ownership === 'boarding'
                        ? 'Boarding'
                        : housing.ownership === 'rented'
                          ? `Rented · ${housing.rentDueInDays}d`
                          : 'Owned'}
                    </span>
                    <span dir="rtl" className="font-serif text-xs text-amber-200">
                      {currentProp.arabicName}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold mt-0.5">{currentProp.name}</h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {housing.ownership === 'rented' && (
                  <button
                    onClick={() => setToast(payRent().msg)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-amber-200 cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Renew (₦{currentProp.rentPrice.toLocaleString()})
                  </button>
                )}
                <button
                  onClick={() => setTab('houses')}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer flex items-center gap-1"
                >
                  <HomeIcon className="w-3.5 h-3.5" />
                  Upgrade
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setToast(restAtHome().msg)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Moon className="w-4 h-4" />
                  Sleep (+{totalNightlyEnergy}⚡)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs font-extrabold text-white">+{totalNightlyEnergy} Energy</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="text-xs font-extrabold text-white">+{currentProp.ilmBonusPct}% Ilm</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs font-extrabold text-white">₦{totalPassiveIncome.toLocaleString()}/d</div>
              </div>
            </div>

            {installedUpgrades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {installedUpgrades.map((up) => (
                  <span
                    key={up.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs font-bold text-white"
                  >
                    <span>{up.icon}</span> {up.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'houses' && (
        <div className="grid grid-cols-1 gap-3">
          {HOUSING_TIERS.map((prop) => {
            const isCurrent = housing.tier === prop.id;
            const isOwned = isCurrent && housing.ownership === 'owned';
            return (
              <div
                key={prop.id}
                className={`p-4 rounded-2xl border-2 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent ? 'border-emerald-600 bg-emerald-50/30' : 'border-stone-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                    {prop.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-stone-900">{prop.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-700 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">{prop.subtitle}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        +{prop.energyRecovery}⚡
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900">
                        +{prop.ilmBonusPct}% Ilm
                      </span>
                      {prop.dailyPassiveIncome > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                          +₦{prop.dailyPassiveIncome.toLocaleString()}/d
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {prop.id === 'ruwaq' ? (
                    !isCurrent && (
                      <button
                        onClick={() => {
                          const r = rentOrBuyHousing('ruwaq', 'rent');
                          setToast(r.msg);
                          if (r.ok) setRoomOverlay('none');
                        }}
                        className="px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 cursor-pointer"
                      >
                        Move to Ruwaq (Free)
                      </button>
                    )
                  ) : (
                    <>
                      {!isOwned && (
                        <button
                          onClick={() => {
                            const r = rentOrBuyHousing(prop.id, 'rent');
                            setToast(r.msg);
                            if (r.ok) setRoomOverlay('none');
                          }}
                          className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs cursor-pointer"
                        >
                          Rent ₦{prop.rentPrice.toLocaleString()}
                        </button>
                      )}
                      {prop.buyPrice && !isOwned && (
                        <button
                          onClick={() => {
                            const r = rentOrBuyHousing(prop.id, 'buy');
                            setToast(r.msg);
                            if (r.ok) setRoomOverlay('none');
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          Buy ₦{prop.buyPrice.toLocaleString()}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'furnish' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LIFESTYLE_ASSETS.map((asset) => {
            const ownedAsset = housing.upgrades.includes(asset.id);
            return (
              <div
                key={asset.id}
                className={`p-3.5 rounded-2xl border-2 bg-white flex flex-col justify-between gap-2.5 ${
                  ownedAsset ? 'border-emerald-600 bg-emerald-50/30' : 'border-stone-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-xl shrink-0">
                    {asset.icon}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm text-stone-900">{asset.name}</div>
                    <div className="text-[11px] font-bold text-emerald-800 mt-0.5">
                      {asset.benefitLabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="font-mono font-extrabold text-xs text-stone-900">
                    ₦{asset.price.toLocaleString()}
                  </span>
                  {ownedAsset ? (
                    <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> In 3D Room
                    </span>
                  ) : (
                    <button
                      onClick={() => setToast(buyLifestyleAsset(asset.id).msg)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs cursor-pointer"
                    >
                      Buy &amp; Place
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

