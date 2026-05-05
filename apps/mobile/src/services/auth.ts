import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';

import { getFirebaseAuth, getDb, isFirebaseConfigured } from './firebase';
import type { ParentProfile } from '@/types';

const SESSION_KEY = 'kidsafe.session';

export type Session =
  | { kind: 'parent'; uid: string; email: string; displayName: string }
  | { kind: 'child'; childId: string; parentUid: string; name: string };

export const persistSession = async (s: Session | null): Promise<void> => {
  if (!s) {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
};

export const loadSession = async (): Promise<Session | null> => {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
};

export const signUpParent = async (
  email: string,
  password: string,
  displayName: string,
): Promise<ParentProfile> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured');
  }
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (cred.user && displayName) {
    await updateProfile(cred.user, { displayName });
  }
  const profile: ParentProfile = {
    uid: cred.user.uid,
    email,
    displayName,
    createdAt: Date.now(),
    language: 'fr',
  };
  const db = getDb();
  await setDoc(doc(db, 'parents', cred.user.uid), {
    ...profile,
    createdAt: serverTimestamp(),
  });
  await persistSession({
    kind: 'parent',
    uid: cred.user.uid,
    email,
    displayName,
  });
  return profile;
};

export const signInParent = async (
  email: string,
  password: string,
): Promise<ParentProfile> => {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured');
  }
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const db = getDb();
  const snap = await getDoc(doc(db, 'parents', cred.user.uid));
  const data = snap.exists() ? (snap.data() as Partial<ParentProfile>) : {};
  const profile: ParentProfile = {
    uid: cred.user.uid,
    email,
    displayName: data.displayName ?? cred.user.displayName ?? email,
    createdAt: data.createdAt ?? Date.now(),
    language: data.language ?? 'fr',
  };
  await persistSession({
    kind: 'parent',
    uid: cred.user.uid,
    email,
    displayName: profile.displayName,
  });
  return profile;
};

export const signOutAll = async (): Promise<void> => {
  if (isFirebaseConfigured) {
    try {
      await signOut(getFirebaseAuth());
    } catch {
      // ignore
    }
  }
  await persistSession(null);
};

export const subscribeAuth = (cb: (u: User | null) => void): (() => void) => {
  if (!isFirebaseConfigured) return () => undefined;
  return onAuthStateChanged(getFirebaseAuth(), cb);
};
