export type Role = 'parent' | 'child';

export interface ParentProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: number;
  language: 'fr' | 'ar' | 'en';
}

export interface ChildProfile {
  id: string;
  parentUid: string;
  name: string;
  pinHash: string;
  avatarColor: string;
  createdAt: number;
  deviceId?: string;
  lastSeenAt?: number;
  // Settings
  dailyLimitMinutes?: number;
  bedtimeStart?: string; // 'HH:mm'
  bedtimeEnd?: string;
}

export type RuleKind =
  | 'block_app'
  | 'block_category'
  | 'block_schedule'
  | 'unblock_app'
  | 'screen_time_limit'
  | 'require_recitation'
  | 'web_blocklist'
  | 'web_blocklist_add'
  | 'web_blocklist_remove'
  | 'bedtime'
  | 'bedtime_mode'
  | 'homework'
  | 'homework_mode'
  | 'reward'
  | 'remote_lock';

export interface Rule {
  id: string;
  childId: string;
  kind: RuleKind;
  payload: Record<string, unknown>;
  active: boolean;
  createdAt: number;
  createdBy: 'parent' | 'ai' | 'system';
  expiresAt?: number;
  reasonText?: string;
  recitationText?: string;
  recitationMinScore?: number;
}

export type AlertKind =
  | 'bullying'
  | 'time_limit'
  | 'geofence'
  | 'recite_fail'
  | 'recite_ok'
  | 'sos'
  | 'app_blocked'
  | 'web_blocked'
  | 'risky_url';

export interface SafetyAlert {
  id: string;
  childId: string;
  kind: AlertKind;
  title: string;
  description: string;
  severity: 'info' | 'warn' | 'high';
  createdAt: number;
  read: boolean;
  metadata?: Record<string, unknown>;
}

export interface RecitationAttempt {
  id: string;
  childId: string;
  ruleId?: string;
  expectedText: string;
  transcript: string;
  score: number;
  passed: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: number;
  appliedRuleIds?: string[];
}

export interface UsageSample {
  childId: string;
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  perAppMinutes: Record<string, number>;
}

export interface LocationPing {
  childId: string;
  lat: number;
  lon: number;
  accuracy: number;
  ts: number;
}

export interface Geofence {
  id: string;
  childId: string;
  name: string;
  centerLat: number;
  centerLon: number;
  radiusM: number;
  alertOnExit: boolean;
  alertOnEnter: boolean;
}
