import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@stevensconnect/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isInitializing: boolean;

  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isInitializing: true,

      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      clearAuth: () => set({ user: null, accessToken: null }),
      setInitializing: (value) => set({ isInitializing: value }),
    }),
    {
      name: 'sc-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);
