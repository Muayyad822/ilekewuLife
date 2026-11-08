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
  setPersistence,
  browserLocalPersistence,
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
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  increment,
} from 'firebase/firestore';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import {
  OnlinePeer,
  GameChallenge,
  PeerInteraction,
  MultiplayerMatchRoom,
  MinbarPost,
  MinbarComment,
  PlayerProfile,
  PlayerHousing,
  PlayerEducation,
  Outfit,
  PrivateChatMessage,
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
    // Ensure tokens and user sessions persist indefinitely in browser local storage
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Could not set browserLocalPersistence:', err);
    });
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

export async function sendPeerInteractionToCloud(
  interaction: Omit<PeerInteraction, 'id'>,
): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'interactions'), interaction);
    return ref.id;
  } catch {
    return null;
  }
}

export function subscribeIncomingInteractions(
  targetUid: string,
  cb: (interaction: PeerInteraction) => void,
): () => void {
  if (!db || !targetUid) return () => {};
  try {
    const seenIds = new Set<string>();
    const sessionStartTime = Date.now() - 45000; // deliver interactions sent in last 45 seconds

    const q = query(
      collection(db, 'interactions'),
      where('toUid', '==', targetUid),
      limit(15),
    );

    return onSnapshot(
      q,
      (snap) => {
        snap.forEach((docSnap) => {
          const id = docSnap.id;
          if (seenIds.has(id)) return;
          const data = docSnap.data() as Omit<PeerInteraction, 'id'>;
          if (data.createdAt && data.createdAt >= sessionStartTime) {
            seenIds.add(id);
            cb({ id, ...data });
          }
        });
      },
      (err) => {
        console.warn('Interactions subscription notice:', err);
      },
    );
  } catch (err) {
    console.warn('Could not subscribe to incoming interactions:', err);
    return () => {};
  }
}

export function getPrivateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export async function sendPrivateChatMessage(
  message: Omit<PrivateChatMessage, 'id'>,
): Promise<string | null> {
  if (!db) return null;
  try {
    const msgRef = await addDoc(
      collection(db, 'chats', message.chatId, 'messages'),
      message,
    );
    // Update parent chat document with latest preview
    await setDoc(
      doc(db, 'chats', message.chatId),
      {
        chatId: message.chatId,
        participants: [message.senderUid, message.recipientUid],
        lastMessage: message.text || (message.audioUrl ? '🎙️ [Voice Note]' : ''),
        lastMessageAt: message.createdAt,
        lastSenderUid: message.senderUid,
      },
      { merge: true },
    );
    return msgRef.id;
  } catch (err) {
    console.warn('Could not send private chat message:', err);
    return null;
  }
}

export function subscribePrivateChatMessages(
  chatId: string,
  cb: (messages: PrivateChatMessage[]) => void,
): () => void {
  if (!db || !chatId) {
    cb([]);
    return () => {};
  }
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(60),
    );
    return onSnapshot(
      q,
      (snap) => {
        const msgs: PrivateChatMessage[] = [];
        snap.forEach((d) => {
          msgs.push({ id: d.id, ...(d.data() as Omit<PrivateChatMessage, 'id'>) });
        });
        cb(msgs);
      },
      (err) => {
        console.warn('Could not subscribe to private chat messages:', err);
        cb([]);
      },
    );
  } catch (err) {
    console.warn('Private chat subscription error:', err);
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

export async function updateGameChallengeInCloud(
  challengeId: string,
  updates: Partial<GameChallenge>,
): Promise<void> {
  if (!db || !challengeId) return;
  try {
    await setDoc(doc(db, 'challenges', challengeId), updates, { merge: true });
  } catch {}
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

export async function createOrJoinMatchRoom(
  room: MultiplayerMatchRoom,
): Promise<void> {
  if (!db || !room.id) return;
  try {
    await setDoc(doc(db, 'match_rooms', room.id), room, { merge: true });
  } catch (err) {
    console.warn('Could not create or join match room:', err);
  }
}

export async function syncMatchRoomMove(
  roomId: string,
  state: Record<string, any>,
  turn: 'player1' | 'player2',
  winnerUid?: string,
): Promise<void> {
  if (!db || !roomId) return;
  try {
    await setDoc(
      doc(db, 'match_rooms', roomId),
      {
        state,
        turn,
        ...(winnerUid ? { winnerUid, status: 'completed' } : {}),
        lastMoveAt: Date.now(),
      },
      { merge: true },
    );
  } catch {}
}

export function subscribeMatchRoom(
  roomId: string,
  cb: (room: MultiplayerMatchRoom | null) => void,
): () => void {
  if (!db || !roomId) return () => {};
  try {
    return onSnapshot(
      doc(db, 'match_rooms', roomId),
      (snap) => {
        if (snap.exists()) {
          cb({ id: snap.id, ...(snap.data() as Omit<MultiplayerMatchRoom, 'id'>) });
        } else {
          cb(null);
        }
      },
      () => cb(null),
    );
  } catch {
    return () => {};
  }
}

export async function publishMinbarPostToCloud(post: Omit<MinbarPost, 'id'>): Promise<string | null> {
  if (!db) return null;
  try {
    const ref = await addDoc(collection(db, 'minbar_posts'), post);
    return ref.id;
  } catch {
    return null;
  }
}

export async function updateMinbarPostInCloud(
  postId: string,
  updates: Partial<MinbarPost>,
): Promise<void> {
  if (!db || !postId) return;
  try {
    await updateDoc(doc(db, 'minbar_posts', postId), updates);
  } catch (err) {
    console.warn('Could not update minbar post in cloud:', err);
  }
}

export async function deleteMinbarPostFromCloud(postId: string): Promise<void> {
  if (!db || !postId) return;
  try {
    await deleteDoc(doc(db, 'minbar_posts', postId));
  } catch (err) {
    console.warn('Could not delete minbar post from cloud:', err);
  }
}

export async function incrementMinbarReaction(
  postId: string,
  field: 'takbeers' | 'likes',
): Promise<void> {
  if (!db || !postId) return;
  try {
    await updateDoc(doc(db, 'minbar_posts', postId), {
      [field]: increment(1),
    });
  } catch (err) {
    console.warn('Could not increment minbar reaction:', err);
  }
}

export async function addCommentToMinbarPost(
  postId: string,
  comment: MinbarComment,
): Promise<void> {
  if (!db || !postId) return;
  try {
    await updateDoc(doc(db, 'minbar_posts', postId), {
      comments: arrayUnion(comment),
    });
  } catch (err) {
    console.warn('Could not add comment to minbar post:', err);
  }
}

export function subscribeMinbarPosts(cb: (posts: MinbarPost[]) => void): () => void {
  if (!db) return () => {};
  try {
    const q = query(collection(db, 'minbar_posts'), orderBy('timestamp', 'desc'), limit(25));
    return onSnapshot(
      q,
      (snap) => {
        const posts: MinbarPost[] = [];
        snap.forEach((d) => posts.push({ id: d.id, ...(d.data() as Omit<MinbarPost, 'id'>) }));
        cb(posts);
      },
      () => {
        cb([]);
      },
    );
  } catch {
    return () => {};
  }
}

/**
 * Resizes and compresses any avatar photo into a lightweight 192x192 JPEG (< 18 KB).
 * This fits safely within Firestore's 1MB document limit and localStorage limits.
 */
export async function compressAvatarImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 192;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          }
        } else {
          if (h > MAX) {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.82,
          );
        } else {
          resolve(file);
        }
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Free-tier media upload via Cloudinary unsigned preset (if configured in .env.local),
 * with automatic fallback to compressed data URL for avatars so zero paid Firebase Storage is needed.
 */
export async function uploadMediaFree(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Always compress avatar first to guarantee minimal payload size
  let blob: Blob = file;
  try {
    blob = await compressAvatarImage(file);
  } catch {
    blob = file;
  }

  if (cloudName && uploadPreset) {
    try {
      const form = new FormData();
      form.append('file', blob, 'avatar.jpg');
      form.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) return json.secure_url as string;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Cloudinary upload warning:', errJson);
      }
    } catch (err) {
      console.warn('Cloudinary upload error:', err);
    }
  }

  // Fallback: read compressed blob as compact Data URL (< 18 KB)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadAudioFree(audioBlob: Blob): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (cloudName && uploadPreset) {
    try {
      const form = new FormData();
      form.append('file', audioBlob, 'voice_note.webm');
      form.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) return json.secure_url as string;
      }
    } catch (err) {
      console.warn('Audio cloud upload warning:', err);
    }
  }

  // Fallback to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to encode voice note'));
    reader.readAsDataURL(audioBlob);
  });
}

export { app, auth, db, analytics };
