import { App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

import { env, hasFirebaseAdmin } from './env';

let _app: App | null = null;

const getApp = (): App | null => {
  if (!hasFirebaseAdmin()) return null;
  if (_app) return _app;
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }
  try {
    const json = JSON.parse(
      Buffer.from(env.firebaseServiceAccountBase64, 'base64').toString('utf8'),
    );
    _app = initializeApp({
      credential: cert(json),
      projectId: env.firebaseProjectId,
    });
    return _app;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] Failed to initialize Firebase Admin from base64 service account:',
      e,
    );
    try {
      _app = initializeApp({
        credential: applicationDefault(),
        projectId: env.firebaseProjectId,
      });
      return _app;
    } catch {
      return null;
    }
  }
};

export const firebaseMessaging = (): Messaging | null => {
  const app = getApp();
  if (!app) return null;
  return getMessaging(app);
};

interface FirebaseAdminBundle {
  firestore: () => Firestore;
  messaging: () => Messaging;
  auth: () => Auth;
}

export const firebaseAdmin = (): FirebaseAdminBundle => {
  const app = getApp();
  if (!app) {
    throw new Error('firebase_admin_not_configured');
  }
  return {
    firestore: () => getFirestore(app),
    messaging: () => getMessaging(app),
    auth: () => getAuth(app),
  };
};
