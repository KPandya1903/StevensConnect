/**
 * Auth store (Zustand)
 *
 * Holds authentication state in memory.
 * Access token is NEVER persisted to localStorage or sessionStorage.
 * On page reload, the app calls /auth/refresh via useAuth to restore the session
 * (the HttpOnly refresh cookie is sent automatically by the browser).
 */

import { create } from 'zustand';
import type { AuthUser } from '@stevensconnect/shared';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  // true during initial session restoration (page load)
  isInitializing: boolean;

  // Actions
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitializing: true,

  setAuth: (user, accessToken) => set({ user, accessToken }),

  setAccessToken: (token) => set({ accessToken: token }),

  clearAuth: () => set({ user: null, accessToken: null }),

  setInitializing: (value) => set({ isInitializing: value }),
}));
