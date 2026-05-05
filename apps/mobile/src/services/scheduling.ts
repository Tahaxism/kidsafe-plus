import type { Rule } from '@/types';

interface BedtimePayload {
  startHHMM?: string; // e.g. "21:00"
  endHHMM?: string; // e.g. "07:00"
}

interface HomeworkPayload {
  startHHMM?: string;
  endHHMM?: string;
  allowList?: string[];
}

interface ScreenTimePayload {
  dailyLimitMin?: number;
}

interface RewardPayload {
  bonusMinutes?: number;
  expiresAt?: number;
}

const parseHHMM = (s: string | undefined): { h: number; m: number } | null => {
  if (!s) return null;
  const parts = s.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m };
};

const minutesNow = (now: Date): number => now.getHours() * 60 + now.getMinutes();

const isInWindow = (
  start: string | undefined,
  end: string | undefined,
  now: Date,
): boolean => {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (!s || !e) return false;
  const n = minutesNow(now);
  const sm = s.h * 60 + s.m;
  const em = e.h * 60 + e.m;
  if (sm === em) return false;
  // Overnight window e.g. 21:00 → 07:00
  if (sm > em) {
    return n >= sm || n < em;
  }
  return n >= sm && n < em;
};

export interface ScheduleStatus {
  bedtimeActive: boolean;
  homeworkActive: boolean;
  homeworkAllowList: string[];
  dailyLimitMin: number | null;
  bonusMinutes: number;
}

export const computeScheduleStatus = (
  rules: Rule[],
  now: Date = new Date(),
): ScheduleStatus => {
  let bedtimeActive = false;
  let homeworkActive = false;
  let homeworkAllowList: string[] = [];
  let dailyLimitMin: number | null = null;
  let bonusMinutes = 0;

  for (const r of rules) {
    if (!r.active) continue;
    switch (r.kind) {
      case 'bedtime': {
        const p = r.payload as BedtimePayload;
        if (isInWindow(p.startHHMM, p.endHHMM, now)) bedtimeActive = true;
        break;
      }
      case 'homework': {
        const p = r.payload as HomeworkPayload;
        if (isInWindow(p.startHHMM, p.endHHMM, now)) {
          homeworkActive = true;
          homeworkAllowList = p.allowList ?? [];
        }
        break;
      }
      case 'screen_time_limit': {
        const p = r.payload as ScreenTimePayload;
        if (typeof p.dailyLimitMin === 'number') {
          dailyLimitMin = p.dailyLimitMin;
        }
        break;
      }
      case 'reward': {
        const p = r.payload as RewardPayload;
        if (p.expiresAt && p.expiresAt < Date.now()) break;
        bonusMinutes += p.bonusMinutes ?? 0;
        break;
      }
      default:
        break;
    }
  }

  return {
    bedtimeActive,
    homeworkActive,
    homeworkAllowList,
    dailyLimitMin,
    bonusMinutes,
  };
};

export const formatRemaining = (
  usedMin: number,
  limitMin: number | null,
  bonusMin: number,
): string => {
  if (limitMin === null) return '—';
  const remaining = Math.max(0, limitMin + bonusMin - usedMin);
  const h = Math.floor(remaining / 60);
  const m = remaining % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m.toString().padStart(2, '0')}`;
};
