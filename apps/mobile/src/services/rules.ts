import {
  collection,
  doc,
  setDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  getDocs,
  orderBy,
} from 'firebase/firestore';

import { getDb, isFirebaseConfigured } from './firebase';
import type { Rule, SafetyAlert, RecitationAttempt } from '@/types';

const newId = (): string =>
  `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const addRule = async (
  childId: string,
  partial: Omit<Rule, 'id' | 'childId' | 'createdAt' | 'active'> & {
    active?: boolean;
  },
): Promise<Rule> => {
  if (!isFirebaseConfigured) throw new Error('Firebase not configured');
  const id = newId();
  const rule: Rule = {
    id,
    childId,
    active: partial.active ?? true,
    createdAt: Date.now(),
    ...partial,
  };
  const db = getDb();
  await setDoc(doc(db, 'rules', id), {
    ...rule,
    createdAt: serverTimestamp(),
  });
  return rule;
};

export const setRuleActive = async (
  ruleId: string,
  active: boolean,
): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  await updateDoc(doc(db, 'rules', ruleId), { active });
};

export const subscribeChildRules = (
  childId: string,
  cb: (rules: Rule[]) => void,
): (() => void) => {
  if (!isFirebaseConfigured) {
    cb([]);
    return () => undefined;
  }
  const db = getDb();
  const q = query(collection(db, 'rules'), where('childId', '==', childId));
  return onSnapshot(q, (snap) => {
    const out = snap.docs.map((d) => d.data() as Rule);
    out.sort((a, b) => b.createdAt - a.createdAt);
    cb(out);
  });
};

export const listAlerts = async (
  parentUid: string,
  childIds: string[],
): Promise<SafetyAlert[]> => {
  if (!isFirebaseConfigured || childIds.length === 0) return [];
  const db = getDb();
  const q = query(
    collection(db, 'alerts'),
    where('childId', 'in', childIds.slice(0, 10)),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SafetyAlert);
};

export const subscribeAlerts = (
  childIds: string[],
  cb: (alerts: SafetyAlert[]) => void,
): (() => void) => {
  if (!isFirebaseConfigured || childIds.length === 0) {
    cb([]);
    return () => undefined;
  }
  const db = getDb();
  const q = query(
    collection(db, 'alerts'),
    where('childId', 'in', childIds.slice(0, 10)),
  );
  return onSnapshot(q, (snap) => {
    const out = snap.docs.map((d) => d.data() as SafetyAlert);
    out.sort((a, b) => b.createdAt - a.createdAt);
    cb(out);
  });
};

export const addAlert = async (
  partial: Omit<SafetyAlert, 'id' | 'createdAt' | 'read'>,
): Promise<SafetyAlert> => {
  const id = `a_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const alert: SafetyAlert = {
    id,
    createdAt: Date.now(),
    read: false,
    ...partial,
  };
  if (isFirebaseConfigured) {
    const db = getDb();
    await setDoc(doc(db, 'alerts', id), {
      ...alert,
      createdAt: serverTimestamp(),
    });
  }
  return alert;
};

export const markAlertRead = async (alertId: string): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  await updateDoc(doc(db, 'alerts', alertId), { read: true });
};

export const recordRecitationAttempt = async (
  attempt: Omit<RecitationAttempt, 'id' | 'createdAt'>,
): Promise<RecitationAttempt> => {
  const id = `ra_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const full: RecitationAttempt = {
    id,
    createdAt: Date.now(),
    ...attempt,
  };
  if (isFirebaseConfigured) {
    const db = getDb();
    await setDoc(doc(db, 'recitations', id), {
      ...full,
      createdAt: serverTimestamp(),
    });
  }
  return full;
};
