'use client';

import React, { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  loadCloudState,
} from '@/lib/firebase';
import {
  Sparkles,
  LogIn,
  UserPlus,
  Compass,
  AlertCircle,
  GraduationCap,
  Building,
} from 'lucide-react';

export const AuthGate: React.FC = () => {
  const authUser = useGameStore((s) => s.authUser);
  const isGuest = useGameStore((s) => s.isGuest);
  const authChecked = useGameStore((s) => s.authChecked);
  const setIsGuest = useGameStore((s) => s.setIsGuest);
  const setAuthUser = useGameStore((s) => s.setAuthUser);
  const updateProfileInfo = useGameStore((s) => s.updateProfileInfo);
  const setLearnerTier = useGameStore((s) => s.setLearnerTier);
  const hydrateFromCloud = useGameStore((s) => s.hydrateFromCloud);
  const syncToCloud = useGameStore((s) => s.syncToCloud);

  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'starter' | 'standard' | 'advanced'>('starter');
  const [madrasah, setMadrasah] = useState('Markaz Agege, Lagos');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated or user chose guest mode, don't show the gate
  if (authUser || isGuest) {
    return null;
  }

  // Before auth check completes on initial mount, show a minimal loading backdrop
  if (!authChecked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 text-stone-200">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-wider uppercase text-amber-200/80">
            Connecting to Madrasah Portal...
          </p>
        </div>
      </div>
    );
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide your email and password.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please provide your scholar name.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const user = await signUpWithEmail(email.trim(), password, name.trim());
        const store = useGameStore.getState();
        store.resetGame(); // Ensure fresh new scholar state with clean ₦2,000 balance
        setAuthUser({
          uid: user.uid,
          email: user.email,
          displayName: name.trim(),
        });
        updateProfileInfo({
          name: name.trim(),
          gender,
          madrasahName: madrasah.trim(),
        });
        setLearnerTier(tier);
        await syncToCloud();
      } else {
        const user = await signInWithEmail(email.trim(), password);
        setAuthUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        const cloud = await loadCloudState(user.uid);
        if (cloud) {
          hydrateFromCloud(cloud);
        } else {
          await syncToCloud();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in could not be completed.';
      setError(
        msg
          .replace('Firebase: ', '')
          .replace('auth/user-not-found', 'No scholar account found with this email.')
          .replace('auth/wrong-password', 'Incorrect password.')
          .replace('auth/email-already-in-use', 'An account already exists with this email.')
          .replace('auth/weak-password', 'Password should be at least 6 characters.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleAuth = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      setAuthUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      const cloud = await loadCloudState(user.uid);
      if (cloud) {
        hydrateFromCloud(cloud);
      } else {
        if (user.displayName) {
          updateProfileInfo({
            name: user.displayName,
            avatarUrl: user.photoURL || undefined,
          });
        }
        await syncToCloud();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication cancelled.';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-md bg-stone-900 border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-7 text-stone-100 space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Madrasah Ile-Kewu Life
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {mode === 'signup' ? 'Enroll Your Scholar' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-stone-400 max-w-xs mx-auto">
            {mode === 'signup'
              ? 'Create your scholar profile to track your Hifz, earn Naira, and furnish your home.'
              : 'Sign in to restore your room, Naira wallet, and daily subject mastery.'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-stone-950 border border-stone-800 text-xs font-extrabold">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Enroll (New)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> Scholar Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muayyad Al-Ameen"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  Gender & Robe Selection
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      gender === 'male'
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span>👦</span> Brother (Kofia)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      gender === 'female'
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span>🧕</span> Sister (Hijab)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Learning Level & Placement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTier('starter')}
                    className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                      tier === 'starter'
                        ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300 font-extrabold'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="text-xs">🌱 Starter</div>
                    <div className="text-[9px] opacity-70">Letters & Words</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier('standard')}
                    className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                      tier === 'standard'
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300 font-extrabold'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="text-xs">📖 Standard</div>
                    <div className="text-[9px] opacity-70">Grammar & Fiqh</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier('advanced')}
                    className={`py-2 px-2 rounded-xl border text-center transition cursor-pointer ${
                      tier === 'advanced'
                        ? 'border-purple-400 bg-purple-400/10 text-purple-300 font-extrabold'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <div className="text-xs">✨ Advanced</div>
                    <div className="text-[9px] opacity-70">Texts & Irab</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-amber-400" /> Madrasah Name
                </label>
                <input
                  type="text"
                  value={madrasah}
                  onChange={(e) => setMadrasah(e.target.value)}
                  placeholder="e.g. Markaz Agege, Lagos"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="scholar@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-hidden focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" /> Enroll & Enter Madrasah
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In & Enter
              </>
            )}
          </button>
        </form>

        {/* Alternative Google Sign-In */}
        <div className="space-y-3 pt-1">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-800" />
            </div>
            <span className="relative px-3 bg-stone-900 text-[10px] font-bold uppercase text-stone-500 tracking-wider">
              Or continue with
            </span>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleAuth}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-800 text-stone-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Guest Preview Option */}
        <div className="text-center pt-1 border-t border-stone-800">
          <button
            type="button"
            onClick={() => setIsGuest(true)}
            className="text-stone-400 hover:text-amber-300 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
          >
            <Compass className="w-3.5 h-3.5" /> Continue as Guest (Offline Preview)
          </button>
        </div>
      </div>
    </div>
  );
};

