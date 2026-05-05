import { create } from 'zustand';

import { listChildren, createChild, generatePin } from '@/services/children';
import { simpleHash } from '@/utils/hash';
import type { ChildProfile } from '@/types';

interface ChildrenState {
  loading: boolean;
  children: ChildProfile[];
  selectedId: string | null;
  refresh: (parentUid: string) => Promise<void>;
  add: (parentUid: string, name: string) => Promise<{ child: ChildProfile; pin: string }>;
  select: (id: string) => void;
}

export const useChildrenStore = create<ChildrenState>((set, get) => ({
  loading: false,
  children: [],
  selectedId: null,

  refresh: async (parentUid) => {
    set({ loading: true });
    try {
      const list = await listChildren(parentUid);
      set({
        children: list,
        selectedId: get().selectedId ?? list[0]?.id ?? null,
      });
    } finally {
      set({ loading: false });
    }
  },

  add: async (parentUid, name) => {
    const pin = generatePin();
    const child = await createChild(parentUid, name, pin);
    set((s) => ({
      children: [...s.children, child],
      selectedId: s.selectedId ?? child.id,
    }));
    return { child, pin };
  },

  select: (id) => set({ selectedId: id }),
}));

export const verifyChildPin = (child: ChildProfile, pin: string): boolean => {
  return child.pinHash === simpleHash(`${child.id}:${pin}`);
};
