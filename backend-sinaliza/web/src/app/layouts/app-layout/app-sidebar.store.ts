import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ISidebarStore {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export const useSidebarStore = create<ISidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    { name: 'sidebar' },
  ),
);
