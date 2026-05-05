import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error - getReactNativePersistence is exported from firebase/auth at runtime
  getReactNativePersistence,
  Auth,
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

type FirebaseExtra = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const cfg = (Constants.expoConfig?.extra?.firebase ?? {}) as Partial<FirebaseExtra>;

export const isFirebaseConfigured = Boolean(cfg.apiKey && cfg.projectId);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

const ensureApp = (): FirebaseApp => {
  if (_app) return _app;
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase is not configured. Fill in extra.firebase in app.json.',
    );
  }
  _app = getApps().length
    ? getApps()[0]
    : initializeApp({
        apiKey: cfg.apiKey!,
        authDomain: cfg.authDomain!,
        projectId: cfg.projectId!,
        storageBucket: cfg.storageBucket!,
        messagingSenderId: cfg.messagingSenderId!,
        appId: cfg.appId!,
      });
  return _app;
};

export const getFirebaseAuth = (): Auth => {
  if (_auth) return _auth;
  const app = ensureApp();
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Already initialized — fall back to getAuth
    _auth = getAuth(app);
  }
  return _auth!;
};

export const getDb = (): Firestore => {
  if (_db) return _db;
  _db = getFirestore(ensureApp());
  return _db;
};

export const getBucket = (): FirebaseStorage => {
  if (_storage) return _storage;
  _storage = getStorage(ensureApp());
  return _storage;
};
