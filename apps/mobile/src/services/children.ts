import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { getDb, isFirebaseConfigured } from './firebase';
import { simpleHash } from '@/utils/hash';
import type { ChildProfile } from '@/types';

const COLOR_POOL = [
  '#10B981',
  '#F59E0B',
  '#3B82F6',
  '#A855F7',
  '#EC4899',
  '#14B8A6',
  '#EF4444',
];

const newId = (): string =>
  `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const generatePin = (): string => {
  const n = Math.floor(1000 + Math.random() * 9000);
  return String(n);
};

export const createChild = async (
  parentUid: string,
  name: string,
  pin: string,
): Promise<ChildProfile> => {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured');
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be 4 digits');
  const id = newId();
  const profile: ChildProfile = {
    id,
    parentUid,
    name,
    pinHash: simpleHash(`${id}:${pin}`),
    avatarColor: COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)],
    createdAt: Date.now(),
    dailyLimitMinutes: 120,
  };
  const db = getDb();
  await setDoc(doc(db, 'children', id), {
    ...profile,
    createdAt: serverTimestamp(),
  });
  return profile;
};

export const listChildren = async (
  parentUid: string,
): Promise<ChildProfile[]> => {
  if (!isFirebaseConfigured) return [];
  const db = getDb();
  const q = query(
    collection(db, 'children'),
    where('parentUid', '==', parentUid),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChildProfile);
};

export const updateChild = async (
  childId: string,
  patch: Partial<ChildProfile>,
): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  await updateDoc(doc(db, 'children', childId), patch);
};

export interface ChildLogin {
  childId: string;
  parentUid: string;
  name: string;
}

export const childLoginByPin = async (
  pin: string,
  // Optional scoping when parent has issued the PIN to a known child id
  hint?: { childId?: string },
): Promise<ChildLogin | null> => {
  if (!isFirebaseConfigured) return null;
  if (!/^\d{4}$/.test(pin)) return null;
  const db = getDb();

  if (hint?.childId) {
    const snap = await getDoc(doc(db, 'children', hint.childId));
    if (!snap.exists()) return null;
    const data = snap.data() as ChildProfile;
    if (data.pinHash === simpleHash(`${data.id}:${pin}`)) {
      return { childId: data.id, parentUid: data.parentUid, name: data.name };
    }
    return null;
  }

  // Fallback: scan all children belonging to any parent.
  // (Firestore rules will limit this in production.)
  const snap = await getDocs(collection(db, 'children'));
  for (const d of snap.docs) {
    const data = d.data() as ChildProfile;
    if (data.pinHash === simpleHash(`${data.id}:${pin}`)) {
      return { childId: data.id, parentUid: data.parentUid, name: data.name };
    }
  }
  return null;
};
