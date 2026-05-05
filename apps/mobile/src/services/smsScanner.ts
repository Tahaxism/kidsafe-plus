import { Platform, PermissionsAndroid, type Permission } from 'react-native';

import { Native, addSmsListener, type SmsEvent } from './native';
import { classifyMessage } from './ai';
import { addAlert } from './rules';

interface Subscription {
  remove: () => void;
}

let _sub: Subscription | null = null;

/**
 * Request RECEIVE_SMS + READ_SMS at runtime. Returns true only if both
 * permissions are granted.
 */
export const requestSmsPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  try {
    const perms: Permission[] = [
      'android.permission.RECEIVE_SMS' as Permission,
      'android.permission.READ_SMS' as Permission,
    ];
    const result = await PermissionsAndroid.requestMultiple(perms);
    return perms.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
};

/**
 * Start listening for incoming SMS, classify each message via the backend,
 * and post a `bullying` alert to Firestore if the classifier flags it.
 *
 * Returns a stop function. Idempotent: calling startSmsScanner twice simply
 * tears down the previous subscription first.
 */
export const startSmsScanner = async (
  childId: string,
): Promise<(() => void) | null> => {
  if (Platform.OS !== 'android') return null;
  stopSmsScanner();

  const granted = await Native.hasSmsPermission();
  if (!granted) return null;

  const ok = await Native.startSmsListener();
  if (!ok) return null;

  const handler = async (e: SmsEvent): Promise<void> => {
    try {
      const verdict = await classifyMessage({
        text: e.body,
        language: 'auto',
      });
      if (!verdict.flagged) return;
      const severity =
        verdict.severity === 'high' ? 'high' : verdict.severity === 'medium' ? 'warn' : 'info';
      const preview = e.body.length > 140 ? `${e.body.slice(0, 140)}…` : e.body;
      await addAlert({
        childId,
        kind: 'bullying',
        title: `SMS de ${e.sender}`,
        description: `${preview}\n\n${verdict.reason}`,
        severity,
        metadata: {
          sender: e.sender,
          ts: e.ts,
          category: verdict.category,
        },
      });
    } catch {
      // best-effort: never crash the listener on classifier errors
    }
  };

  const sub = addSmsListener((e) => {
    void handler(e);
  });
  _sub = sub;
  return stopSmsScanner;
};

export const stopSmsScanner = (): void => {
  if (_sub) {
    try {
      _sub.remove();
    } catch {
      // ignore
    }
    _sub = null;
  }
  if (Platform.OS === 'android') {
    void Native.stopSmsListener();
  }
};
