import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

import { getDb } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const ensureNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'KidSafe+ alerts',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#10B981',
    vibrationPattern: [0, 200, 250, 200],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!Device.isDevice) return false;
  const settings = await Notifications.getPermissionsAsync();
  let status = settings.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  return status === 'granted';
};

export const getDevicePushToken = async (): Promise<string | null> => {
  if (!Device.isDevice) return null;
  try {
    // For FCM on Android we need the native device token, not Expo's.
    const token = await Notifications.getDevicePushTokenAsync();
    return typeof token.data === 'string' ? token.data : null;
  } catch {
    return null;
  }
};

export const registerParentDevice = async (parentUid: string): Promise<void> => {
  await ensureNotificationChannel();
  const granted = await requestNotificationPermission();
  if (!granted) return;
  const token = await getDevicePushToken();
  if (!token) return;
  try {
    await setDoc(
      doc(getDb(), 'parents', parentUid, 'devices', token),
      {
        token,
        platform: Platform.OS,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch {
    // best-effort
  }
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  });
};

export const addNotificationReceivedListener = (
  cb: (n: Notifications.Notification) => void,
): { remove: () => void } => Notifications.addNotificationReceivedListener(cb);

export const addNotificationResponseListener = (
  cb: (r: Notifications.NotificationResponse) => void,
): { remove: () => void } =>
  Notifications.addNotificationResponseReceivedListener(cb);
