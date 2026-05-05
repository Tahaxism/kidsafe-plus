import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

import { Native, type UsageEntry } from '@/services/native';
import { getDb, isFirebaseConfigured } from '@/services/firebase';

const todayLocal = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface UsageDoc {
  childId: string;
  date: string;
  totalMinutes: number;
  perAppMinutes: Record<string, number>;
  topApps: Array<{ packageName: string; appLabel: string; minutes: number }>;
  updatedAt: number;
}

/**
 * Read today's per-app foreground time from the native UsageStatsManager,
 * aggregate into a daily document, and write to Firestore at
 * `/usage/{childId}_{date}`. The backend's `/report/daily` endpoint reads
 * from this collection.
 *
 * No-op if not running on Android, if usage-access permission isn't granted,
 * or if Firebase isn't configured.
 */
export const reportTodayUsage = async (childId: string): Promise<UsageDoc | null> => {
  if (Platform.OS !== 'android') return null;
  if (!isFirebaseConfigured) return null;
  if (!(await Native.hasUsageAccess())) return null;

  const entries: UsageEntry[] = await Native.getTodayUsage();
  if (!entries.length) return null;

  const date = todayLocal();
  const perApp: Record<string, number> = {};
  const labelToPkg: Record<string, string> = {};
  let total = 0;
  for (const e of entries) {
    perApp[e.appLabel] = (perApp[e.appLabel] ?? 0) + e.totalTimeForegroundMin;
    if (!labelToPkg[e.appLabel]) labelToPkg[e.appLabel] = e.packageName;
    total += e.totalTimeForegroundMin;
  }
  const top = Object.entries(perApp)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, mins]) => ({
      packageName: labelToPkg[label] ?? label,
      appLabel: label,
      minutes: Math.round(mins),
    }));

  const docPayload: UsageDoc = {
    childId,
    date,
    totalMinutes: Math.round(total),
    perAppMinutes: Object.fromEntries(
      Object.entries(perApp).map(([k, v]) => [k, Math.round(v)]),
    ),
    topApps: top,
    updatedAt: Date.now(),
  };

  await setDoc(doc(getDb(), 'usage', `${childId}_${date}`), docPayload, { merge: true });
  return docPayload;
};

let _interval: ReturnType<typeof setInterval> | null = null;

/** Run reportTodayUsage immediately and again every 15 minutes. */
export const startUsageReporting = (childId: string): (() => void) => {
  void reportTodayUsage(childId);
  if (_interval) clearInterval(_interval);
  _interval = setInterval(
    () => void reportTodayUsage(childId),
    15 * 60_000,
  );
  return () => {
    if (_interval) clearInterval(_interval);
    _interval = null;
  };
};
