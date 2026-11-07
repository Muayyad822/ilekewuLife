'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { HOUSING_TIERS, LIFESTYLE_ASSETS, SHOP_ITEMS } from '@/data/shop';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  loadCloudState,
  uploadMediaFree,
} from '@/lib/firebase';
import { requestNotificationPermission, scheduleDailyMadrasahReminder } from '@/lib/reminders';
import { SkillTree } from '@/components/SkillTree';
import {
  User,
  Cloud,
  Home,
  ShoppingBag,
  CheckCircle2,
  Sparkles,
  LogOut,
  Upload,
  ShieldCheck,
  KeyRound,
  Building2,
  Bell,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const player = useGameStore((s) => s.player);
  const housing = useGameStore((s) => s.housing);
  const education = useGameStore((s) => s.education);
  const owned = useGameStore((s) => s.owned);
  const authUser = useGameStore((s) => s.authUser);
  const cloudSynced = useGameStore((s) => s.cloudSynced);
  const updateProfileInfo = useGameStore((s) => s.updateProfileInfo);
  const rentOrBuyHousing = useGameStore((s) => s.rentOrBuyHousing);
  const buyLifestyleAsset = useGameStore((s) => s.buyLifestyleAsset);
  const buyOrEquip = useGameStore((s) => s.buyOrEquip);
  const syncToCloud = useGameStore((s) => s.syncToCloud);
  const hydrateFromCloud = useGameStore((s) => s.hydrateFromCloud);

  const [section, setSection] = useState<'overview' | 'housing' | 'acquisitions' | 'wardrobe'>('overview');
  const [nameInput, setNameInput] = useState(player.name);
  const [madrasahInput, setMadrasahInput] = useState(player.madrasahName);
  const [genderInput, setGenderInput] = useState<'male' | 'female'>(player.gender);

  React.useEffect(() => {
    setNameInput(player.name);
    setMadrasahInput(player.madrasahName);
    setGenderInput(player.gender);
  }, [player.name, player.madrasahName, player.gender]);

  // Firebase Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileInfo({
      name: nameInput,
      gender: genderInput,
      madrasahName: madrasahInput,
    });
    setFeedback('✓ Scholar profile updated!');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setFeedback('Uploading avatar...');
      const url = await uploadMediaFree(file);
      updateProfileInfo({ avatarUrl: url });
      setFeedback('✓ Profile photo updated!');
    } catch {
      setFeedback('Could not upload image. Try a smaller photo.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setAuthBusy(true);
    setFeedback(null);
    try {
      if (authMode === 'signup') {
        const u = await signUpWithEmail(email.trim(), password, player.name);
        await syncToCloud();
        setFeedback(`Account created for ${u.email}!`);
      } else {
        const u = await signInWithEmail(email.trim(), password);
        const cloudData = await loadCloudState(u.uid);
        if (cloudData) {
          hydrateFromCloud(cloudData);
          setFeedback(`Welcome back, ${cloudData.player.name}!`);
        } else {
          await syncToCloud();
          setFeedback(`Signed in as ${u.email}.`);
        }
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.';
      setFeedback(msg.replace('Firebase: ', ''));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthBusy(true);
    setFeedback(null);
    try {
      const u = await signInWithGoogle();
      const cloudData = await loadCloudState(u.uid);
      if (cloudData) {
        hydrateFromCloud(cloudData);
        setFeedback(`Welcome back, ${cloudData.player.name}!`);
      } else {
        if (u.displayName) updateProfileInfo({ name: u.displayName });
        await syncToCloud();
        setFeedback(`Signed in as ${u.email}.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in could not complete.';
      setFeedback(msg.replace('Firebase: ', ''));
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Top Wallet & Scholar Header */}
      <div className="rounded-2xl bg-stone-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-700">
        <div className="flex items-center gap-3.5">
          <label className="relative w-14 h-14 rounded-2xl bg-linear-to-b from-amber-300 to-amber-500 text-stone-950 flex items-center justify-center font-extrabold text-2xl cursor-pointer overflow-hidden shrink-0 shadow-inner">
            {player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatarUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              player.name.charAt(0)
            )}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white text-center py-0.5 flex items-center justify-center gap-0.5">
              <Upload className="w-2.5 h-2.5" /> Photo
            </span>
          </label>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-extrabold">{player.name}</h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                {education.learnerTier === 'advanced'
                  ? 'Senior Faqih'
                  : education.learnerTier === 'standard'
                  ? 'Madrasah Scholar'
                  : 'Starter Student'}
              </span>
            </div>
            <p className="text-xs text-stone-300">
              {player.madrasahName}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              {authUser ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {authUser.email || 'Signed In'}
                </span>
              ) : (
                <span className="text-amber-300 font-semibold">● Guest Profile</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">Balance</div>
          <div className="text-xl font-extrabold font-mono text-emerald-300">
            ₦{player.stats.naira.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sub-navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {([
          ['overview', '👤 Profile', User],
          ['housing', '🏠 Real Estate', Building2],
          ['acquisitions', '🛵 Furnishings', Sparkles],
          ['wardrobe', '🛍️ Store & Bag', ShoppingBag],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setSection(id);
              setFeedback(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer shrink-0 transition ${
              section === id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="text-xs font-bold bg-amber-50 border border-amber-300 text-amber-950 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-stone-500 hover:text-stone-800 ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: OVERVIEW, EDIT PROFILE & ACCOUNT */}
      {section === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Edit Personal Info */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5 shadow-2xs"
          >
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
              <User className="w-4 h-4 text-emerald-700" /> Scholar Identity
            </h4>

            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Madrasah</label>
              <input
                type="text"
                value={madrasahInput}
                onChange={(e) => setMadrasahInput(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-sm font-semibold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGenderInput(g)}
                    className={`py-2 rounded-xl border text-xs font-extrabold capitalize cursor-pointer ${
                      genderInput === g
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-stone-200 bg-stone-50 text-stone-600'
                    }`}
                  >
                    {g === 'male' ? '👳🏾‍♂️ Male' : '🧕🏾 Female'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer"
            >
              Save Profile
            </button>

            {/* Daily Madrasah Reminder Toggle */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" /> Daily Lesson Reminders
                </div>
                <div className="text-[10px] text-stone-500">Alerts to maintain your learning streak</div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) {
                    scheduleDailyMadrasahReminder(16, 0);
                    setFeedback('✓ Daily reminders enabled! You will be notified for daily lessons.');
                  } else {
                    setFeedback('Notification permission not granted in browser settings.');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] cursor-pointer transition shrink-0"
              >
                Enable
              </button>
            </div>
          </form>

          {/* Account Sign-In */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5 shadow-2xs">
            <h4 className="font-extrabold text-sm text-stone-900 flex items-center gap-2 border-b border-stone-100 pb-2">
              <KeyRound className="w-4 h-4 text-emerald-700" /> Scholar Account
            </h4>

            {authUser ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="text-xs font-extrabold text-emerald-950">
                    {authUser.email || authUser.displayName || 'Signed In'}
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    {cloudSynced ? '✓ Progress saved' : '● Active session'}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
    
                  <button
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      useGameStore.getState().setAuthUser(null);
                      setFeedback('Signed out.');
                    }}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs cursor-pointer flex items-center gap-1 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-3">
                <p className="text-xs text-stone-600">
                  Sign in to save your progress and appear online with other students.
                </p>

                <div className="flex rounded-xl bg-stone-100 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                      authMode === 'login' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`flex-1 py-1.5 rounded-lg cursor-pointer ${
                      authMode === 'signup' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                <input
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-900"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-900"
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    disabled={authBusy}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {authBusy ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    disabled={authBusy}
                    onClick={handleGoogleLogin}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs cursor-pointer"
                  >
                    Google
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Academic Record & Recent Log History */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-stone-950 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 shadow-inner">
              <SkillTree subjectMastery={education.subjectMastery} />
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h4 className="font-extrabold text-sm text-stone-900">
                  📜 Scholar Record ({education.totalLessonsCompleted} Classroom Lessons Completed)
                </h4>
                <span className="text-xs font-bold text-emerald-700">
                  Streak: {player.streakDays} Days
                </span>
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {player.logHistory.map((entry, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-stone-700 bg-stone-50 border border-stone-200/80 rounded-xl px-3 py-2 flex items-start gap-2"
                  >
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: REAL ESTATE & HOUSING PROGRESSION (RUWAQ -> RENT ROOM -> MINI-FLAT -> BUY HOUSE) */}
      {section === 'housing' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                <Home className="w-4 h-4 text-amber-700" /> Madrasah &amp; Lagos Real Estate Market
              </h4>
              <p className="text-xs text-amber-900/80">
                Every student begins in <b>Ruwaq</b> (the Madrasah boarding house). Save your stipends, Home Lesson fees, and monitor pay to rent an off-campus room or buy your own permanent house!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {HOUSING_TIERS.map((prop) => {
              const isCurrent = housing.tier === prop.id;
              const isOwned = isCurrent && housing.ownership === 'owned';
              const isRented = isCurrent && housing.ownership === 'rented';

              return (
                <div
                  key={prop.id}
                  className={`p-4 sm:p-5 rounded-2xl border-2 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    isCurrent ? 'border-emerald-600 bg-emerald-50/30 shadow-sm' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                      {prop.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base text-stone-900">{prop.name}</span>
                        <span dir="rtl" className="text-xs font-serif text-stone-500">
                          {prop.arabicName}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                            {isOwned ? '✓ Owned Residence' : isRented ? `✓ Rented (${housing.rentDueInDays}d)` : '✓ Current Boarding'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-stone-500">{prop.subtitle}</p>
                      <p className="text-xs text-stone-600 leading-relaxed">{prop.description}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {prop.perks.map((p, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-stretch sm:items-end justify-end gap-2 shrink-0">
                    {prop.id === 'ruwaq' ? (
                      <button
                        disabled={isCurrent}
                        onClick={() => {
                          const res = rentOrBuyHousing('ruwaq', 'rent');
                          setFeedback(res.msg);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                          isCurrent
                            ? 'bg-stone-100 text-stone-400 cursor-default'
                            : 'bg-stone-800 hover:bg-stone-900 text-white'
                        }`}
                      >
                        {isCurrent ? 'Living Here' : 'Return to Ruwaq (₦0)'}
                      </button>
                    ) : (
                      <>
                        {prop.rentPrice > 0 && !isOwned && (
                          <button
                            onClick={() => {
                              const res = rentOrBuyHousing(prop.id, 'rent');
                              setFeedback(res.msg);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold text-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            {isRented ? 'Move In / Reset Lease' : `Rent (₦${prop.rentPrice.toLocaleString()}/wk)`}
                          </button>
                        )}
                        {prop.buyPrice && (
                          <button
                            disabled={isOwned}
                            onClick={() => {
                              const res = rentOrBuyHousing(prop.id, 'buy');
                              setFeedback(res.msg);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                              isOwned
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            }`}
                          >
                            {isOwned ? '✓ Owned Forever' : `Buy Outright (₦${prop.buyPrice.toLocaleString()})`}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: LIFESTYLE ACQUISITIONS & ASSETS (APART FROM MALLAM STORE) */}
      {section === 'acquisitions' && (
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <h4 className="font-extrabold text-sm text-sky-950">
              🛵 Room Furnishings, Transport &amp; Income Assets
            </h4>
            <p className="text-xs text-sky-900/80 mt-0.5">
              Acquire beds, study desks, standing fans, solar power, bicycles, and commercial motorcycles to boost your daily energy, cut Danfo bus fares, and generate passive income!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {LIFESTYLE_ASSETS.map((asset) => {
              const has = housing.upgrades.includes(asset.id);
              return (
                <div
                  key={asset.id}
                  className={`p-4 rounded-2xl border bg-white flex flex-col justify-between gap-3 shadow-2xs ${
                    has ? 'border-emerald-500 bg-emerald-50/20' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                      {asset.icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-stone-900">{asset.name}</div>
                      <p className="text-xs text-stone-500 mt-0.5 leading-snug">{asset.description}</p>
                      <div className="mt-2 inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                        {asset.benefitLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                    <span className="font-mono text-xs font-extrabold text-stone-800">
                      {has ? '✓ Acquired' : `₦${asset.price.toLocaleString()}`}
                    </span>
                    <button
                      disabled={has}
                      onClick={() => {
                        const res = buyLifestyleAsset(asset.id);
                        setFeedback(res.msg);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                        has
                          ? 'bg-stone-100 text-stone-400 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                      }`}
                    >
                      {has ? 'Owned' : 'Acquire Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: MALLAM IDRIS BOOKS & WARDROBE */}
      {section === 'wardrobe' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHOP_ITEMS.filter((it) => !it.gender || it.gender === player.gender).map((it) => {
            const has = owned.includes(it.id);
            return (
              <div
                key={it.id}
                className="p-3.5 rounded-2xl border border-stone-200 bg-white flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                    {it.icon}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-stone-900">{it.name}</div>
                    <div className="text-xs text-stone-500 mt-0.5">{it.desc}</div>
                    <div className="mt-1.5 text-xs font-mono font-bold text-emerald-700">
                      {has ? '✓ Owned' : `₦${it.price.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const res = buyOrEquip(it.id);
                    setFeedback(res.msg);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-stone-950 cursor-pointer shrink-0"
                >
                  {has ? (it.kind === 'book' ? 'In Bag' : 'Equip') : 'Buy'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

