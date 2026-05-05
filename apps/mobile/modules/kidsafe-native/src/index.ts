import { requireNativeModule, EventSubscription } from 'expo-modules-core';

export interface SmsEvent {
  sender: string;
  body: string;
  ts: number;
}

export interface UsageEntry {
  packageName: string;
  appLabel: string;
  totalTimeForegroundMin: number;
  lastTimeUsed: number;
}

export interface KidsafeNativeAndroid {
  hasUsageAccess(): Promise<boolean>;
  openUsageAccessSettings(): Promise<void>;

  /** Returns per-app foreground time for the current day. */
  getTodayUsage(): Promise<UsageEntry[]>;

  /** All installed launcher apps. */
  getInstalledApps(): Promise<
    Array<{ packageName: string; label: string; isSystem: boolean }>
  >;

  /** Device-Admin: prompt the user to enable our DeviceAdminReceiver. */
  requestDeviceAdmin(): Promise<boolean>;
  isDeviceAdminActive(): Promise<boolean>;
  lockNow(): Promise<void>;

  /** Accessibility-Service-based blocker: turn it on or off. */
  isAccessibilityEnabled(): Promise<boolean>;
  openAccessibilitySettings(): Promise<void>;

  /** Update the in-process blocklist used by the accessibility service. */
  setBlockedPackages(packages: string[]): Promise<void>;

  /** Bring up the system's overlay-permission settings (kiosk overlay). */
  openOverlaySettings(): Promise<void>;
  hasOverlayPermission(): Promise<boolean>;

  /** SMS monitoring (cyberbullying detection). */
  hasSmsPermission(): Promise<boolean>;
  startSmsListener(): Promise<boolean>;
  stopSmsListener(): Promise<boolean>;
  addListener?: (eventName: string) => void;
  removeListeners?: (count: number) => void;
}

// Lazy require so that on iOS / web the import doesn't crash.
const NativeMod: KidsafeNativeAndroid | null = (() => {
  try {
    return requireNativeModule<KidsafeNativeAndroid>('KidsafeNative');
  } catch {
    return null;
  }
})();

const stub = async <T>(value: T): Promise<T> => value;

export const KidsafeNative: KidsafeNativeAndroid =
  NativeMod ?? {
    hasUsageAccess: () => stub(false),
    openUsageAccessSettings: () => stub(undefined as void),
    getTodayUsage: () => stub([]),
    getInstalledApps: () => stub([]),
    requestDeviceAdmin: () => stub(false),
    isDeviceAdminActive: () => stub(false),
    lockNow: () => stub(undefined as void),
    isAccessibilityEnabled: () => stub(false),
    openAccessibilitySettings: () => stub(undefined as void),
    setBlockedPackages: () => stub(undefined as void),
    openOverlaySettings: () => stub(undefined as void),
    hasOverlayPermission: () => stub(false),
    hasSmsPermission: () => stub(false),
    startSmsListener: () => stub(false),
    stopSmsListener: () => stub(false),
  };

/**
 * Subscribe to incoming SMS events. Native side will only emit if the
 * `RECEIVE_SMS` runtime permission has been granted and `startSmsListener()`
 * has been called.
 */
export const addSmsListener = (
  cb: (e: SmsEvent) => void,
): EventSubscription => {
  const mod = NativeMod as unknown as {
    addListener?: (name: string, cb: (e: SmsEvent) => void) => EventSubscription;
  } | null;
  if (!mod?.addListener) {
    return { remove: () => {} } as EventSubscription;
  }
  return mod.addListener('onSmsReceived', cb);
};

export default KidsafeNative;
