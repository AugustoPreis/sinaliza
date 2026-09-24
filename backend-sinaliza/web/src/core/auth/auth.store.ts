import { create } from 'zustand';

import type { MeResponseDTO } from '@core/api/generated/sinalizaAPI.schemas';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface IAuthStore {
  user: MeResponseDTO | null;
  status: AuthStatus;
  setUser: (user: MeResponseDTO) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

export const useAuthStore = create<IAuthStore>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));
