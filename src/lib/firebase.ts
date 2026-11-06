import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import {
  OnlinePeer,
  GameChallenge,
  MinbarPost,
  PlayerProfile,
  PlayerHousing,
  PlayerEducation,
  Outfit,
} from '@/types/game';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ilekewu-life.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ilekewu-life',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ilekewu-life.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '620681574875',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:620681574875:web:8b3870ee631fa493364ffe',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-KM0HSXGXFG',
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined' && firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    isAnalyticsSupported()
      .then((yes) => {
        if (yes && app) analytics = getAnalytics(app);
      })
      .catch(() => {
        // Ignore analytics blocker in strict browsers
      });
  } catch (error) {
    console.warn('Firebase initialized in offline fallback mode:', error);
  }
}

export interface CloudSavePayload {
  player: PlayerProfile;
  housing: PlayerHousing;
  education: PlayerEducation;
  owned: string[];
  outfit: Outfit;
  updatedAt: number;
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase Auth is not initialized.');
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

/**
 * Saves player profile, housing, and curriculum progress to Firestore.
 * Uses `{ merge: true }` on a single document per user to stay well within Firebase Free Spark limits.
 */
export async function saveCloudState(uid: string, payload: CloudSavePayload): Promise<boolean> {
  if (!db || !uid) return false;
  try {
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
    // Also update lightweight presence/leaderboard summary
    await setDoc(
      doc(db, 'presence', uid),
      {
        uid,
        name: payload.player.name,
        stage: payload.player.stage,
        madrasahName: payload.player.madrasahName,
        ilm: payload.player.stats.ilm,
        hifzJuz: payload.player.hifzJuz,
        housingTier: payload.housing.tier,
        currentTab: 'compound',
        lastSeen: Date.now(),
        outfit: payload.outfit,
      } satisfies OnlinePeer,
      { merge: true },
    );
    return true;
  } catch (err) {
    console.warn('Could not save state to Firestore (check rules or network):', err);
    return false;
  }
}

export async function loadCloudState(uid: string): Promise<CloudSavePayload | null> {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as CloudSavePayload;
    }
    return null;
  } catch (err) {
    console.warn('Could not load state from Firestore:', err);
    return null;
  }
}

export async function updatePresenceStatus(peer: OnlinePeer): Promise<void> {
  if (!db || !peer.uid) return;
  try {
    await setDoc(
      doc(db, 'presence', peer.uid),
      { ...peer, lastSeen: Date.now() },
      { merge: true },
    );
  } catch {
    // Non-fatal if rules restrict unauthenticated presence writes
  }
}

export function subscribeOnlinePeers(cb: (peers: OnlinePeer[]) => void): () => void {
  if (!db) {
    cb([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'presence'), orderBy('lastSeen', 'desc'), limit(25));
    return onSnapshot(
      q,
      (snap) => {
        const list: OnlinePeer[] = [];
        const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7; // Show recent active scholars
        snap.forEach((docSnap) => {
          const data = docSnap.data() as OnlinePeer;
          if (data.lastSeen >= cutoff) {
            list.push({
              ...data,
              isLive: Date.now() - data.lastSeen < 1000 * 60 * 15, // Active in last 15 mins
            });
          }
        });
        cb(list);
      },
      () => {
        cb([]);
      },
    );
  } catch {
    cb([]);
    return () => {};
  }
}

export async function sendGameChallengeToCloud(
  challenge: Omit<GameChallenge, 'id'>,
): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'challenges'), challenge);
    return ref.id;
  } catch {
    return null;
  }
}

export function subscribeChallenges(cb: (challenges: GameChallenge[]) => void): () => void {
  if (!db) {
    cb([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'), limit(15));
    return onSnapshot(
      q,
      (snap) => {
        const items: GameChallenge[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<GameChallenge, 'id'>) }));
        cb(items);
      },
      () => cb([]),
    );
  } catch {
    cb([]);
    return () => {};
  }
}

export async function publishMinbarPostToCloud(post: Omit<MinbarPost, 'id'>): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'minbar_posts'), post);
  } catch {
    // Fallback to local state
  }
}

export function subscribeMinbarPosts(cb: (posts: MinbarPost[]) => void): () => void {
  if (!db) return () => {};
  try {
    const q = query(collection(db, 'minbar_posts'), orderBy('timestamp', 'desc'), limit(25));
    return onSnapshot(
      q,
      (snap) => {
        if (snap.empty) return;
        const posts: MinbarPost[] = [];
        snap.forEach((d) => posts.push({ id: d.id, ...(d.data() as Omit<MinbarPost, 'id'>) }));
        cb(posts);
      },
      () => {},
    );
  } catch {
    return () => {};
  }
}

/**
 * Free-tier media upload via Cloudinary unsigned preset (if configured in .env.local),
 * with automatic fallback to compressed data URL for avatars so zero paid Firebase Storage is needed.
 */
export async function uploadMediaFree(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: 'POST',
      body: form,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.secure_url) return json.secure_url as string;
    }
  }

  // Fallback: read as compact Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export { app, auth, db, analytics };
