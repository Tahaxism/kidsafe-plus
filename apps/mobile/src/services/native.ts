import { Platform } from 'react-native';

import KidsafeNative, {
  type UsageEntry,
  type KidsafeNativeAndroid,
} from 'kidsafe-native';

export type { UsageEntry };

const isAndroid = Platform.OS === 'android';

const noop = async <T>(v: T): Promise<T> => v;

const stub: KidsafeNativeAndroid = {
  hasUsageAccess: () => noop(false),
  openUsageAccessSettings: () => noop(undefined as void),
  getTodayUsage: () => noop([]),
  getInstalledApps: () => noop([]),
  requestDeviceAdmin: () => noop(false),
  isDeviceAdminActive: () => noop(false),
  lockNow: () => noop(undefined as void),
  isAccessibilityEnabled: () => noop(false),
  openAccessibilitySettings: () => noop(undefined as void),
  setBlockedPackages: () => noop(undefined as void),
  openOverlaySettings: () => noop(undefined as void),
  hasOverlayPermission: () => noop(false),
};

export const Native: KidsafeNativeAndroid = isAndroid ? KidsafeNative : stub;
