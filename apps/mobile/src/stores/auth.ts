import { create } from 'zustand';

import {
  loadSession,
  persistSession,
  signInParent,
  signOutAll,
  signUpParent,
  Session,
} from '@/services/auth';
import { childLoginByPin } from '@/services/children';

interface AuthState {
  ready: boolean;
  session: Session | null;
  bootstrap: () => Promise<void>;
  parentSignIn: (email: string, password: string) => Promise<void>;
  parentSignUp: (email: string, password: string, name: string) => Promise<void>;
  childSignIn: (pin: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ready: false,
  session: null,

  bootstrap: async () => {
    if (get().ready) return;
    const s = await loadSession();
    set({ session: s, ready: true });
  },

  parentSignIn: async (email, password) => {
    const profile = await signInParent(email, password);
    set({
      session: {
        kind: 'parent',
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
      },
    });
  },

  parentSignUp: async (email, password, name) => {
    const profile = await signUpParent(email, password, name);
    set({
      session: {
        kind: 'parent',
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
      },
    });
  },

  childSignIn: async (pin) => {
    const result = await childLoginByPin(pin);
    if (!result) return false;
    const s: Session = {
      kind: 'child',
      childId: result.childId,
      parentUid: result.parentUid,
      name: result.name,
    };
    await persistSession(s);
    set({ session: s });
    return true;
  },

  signOut: async () => {
    await signOutAll();
    set({ session: null });
  },
}));
