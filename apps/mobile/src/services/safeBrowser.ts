import { api } from './api';

// Conservative, opinionated starter blocklist.
// Augmented at runtime by per-child rules of kind "web_blocklist_add".
const STATIC_DENYLIST: string[] = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'xhamster.com',
  'onlyfans.com',
  'chaturbate.com',
  'spankbang.com',
  'eporner.com',
  'tnaflix.com',
  'cam4.com',
  'stripchat.com',
  'omegle.com',
  'tinder.com',
  '4chan.org',
  'discord.gg',
];

const ADULT_HINT_WORDS = [
  'porn',
  'xxx',
  'sex',
  'nude',
  'naked',
  'fetish',
  'escort',
  'cam',
  'erotic',
];

export const SAFE_SEARCH_DEFAULTS: Record<string, string> = {
  // Force Google SafeSearch
  'google.com': 'safe=active',
  // Force Bing strict mode
  'bing.com': 'adlt=strict',
  // Force YouTube Restricted Mode
  'youtube.com': 'restricted=1',
  // Force DuckDuckGo strict
  'duckduckgo.com': 'kp=1',
};

export const normalizeHost = (raw: string): string => {
  try {
    const u = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    let h = u.hostname.toLowerCase();
    if (h.startsWith('www.')) h = h.slice(4);
    return h;
  } catch {
    return raw.toLowerCase().trim();
  }
};

export const isHostBlocked = (host: string, customBlocklist: string[]): boolean => {
  const h = normalizeHost(host);
  const all = [...STATIC_DENYLIST, ...customBlocklist.map(normalizeHost)];
  return all.some((bad) => h === bad || h.endsWith(`.${bad}`));
};

export const hasAdultHint = (url: string): boolean => {
  const lower = url.toLowerCase();
  return ADULT_HINT_WORDS.some((w) => lower.includes(w));
};

export interface ClassifyUrlResult {
  flagged: boolean;
  reason: string;
}

export const classifyUrlViaLLM = async (url: string): Promise<ClassifyUrlResult> => {
  // Reuse the cyberbullying classifier — same shape, different prompt context
  // would be ideal; for v1 we just send the URL and ask the LLM.
  try {
    const res = await api.post<{
      flagged: boolean;
      category: string;
      severity: string;
      reason: string;
    }>('/ai/classify', {
      text: `Is the website at this URL safe for a child to view? Consider category, content, and known reputation. URL: ${url}`,
    });
    return {
      flagged: Boolean(res.data.flagged) || res.data.category !== 'safe',
      reason: res.data.reason || res.data.category,
    };
  } catch {
    return { flagged: false, reason: 'classifier_unavailable' };
  }
};

// Inject SafeSearch query parameters where supported.
export const enforceSafeSearch = (rawUrl: string): string => {
  try {
    const u = new URL(rawUrl);
    const host = normalizeHost(u.hostname);
    const knob = SAFE_SEARCH_DEFAULTS[host];
    if (!knob) return rawUrl;
    const [k, v] = knob.split('=');
    u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return rawUrl;
  }
};
