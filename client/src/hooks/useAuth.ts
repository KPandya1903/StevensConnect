/**
 * useAuth hook
 *
 * The single interface for auth in the entire app.
 * Components never import authStore directly — they use this hook.
 *
 * On mount (once per app lifetime), it attempts to restore the session
 * by calling /auth/refresh. This is how the app handles page reloads:
 *   - If the HttpOnly cookie is valid → session restored silently
 *   - If the cookie is missing/expired → isInitializing set to false, user stays null
 *
 * Wires up the Axios interceptor handlers so the interceptor can access
 * the latest token without creating a circular dependency.
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { api, registerAuthHandlers } from '../api/index';
import toast from 'react-hot-toast';

// Wire Axios interceptor to the store — called once at app level
let handlersRegistered = false;

export function useAuth() {
  const { user, accessToken, isInitializing, setAuth, setAccessToken, clearAuth, setInitializing } =
    useAuthStore();

  // Register interceptor handlers once
  if (!handlersRegistered) {
    handlersRegistered = true;
    registerAuthHandlers({
      getAccessToken: () => useAuthStore.getState().accessToken,
      setAccessToken: (token) => useAuthStore.getState().setAccessToken(token),
      clearAuth: () => useAuthStore.getState().clearAuth(),
    });
  }

  // Restore session on page load
  useEffect(() => {
    let cancelled = false;

    async function restoreSession(): Promise<void> {
      try {
        const { data } = await authApi.refresh();
        if (cancelled) return;

        const newToken = data.data.accessToken;
        setAccessToken(newToken);

        // Fetch the current user with the new token
        const profileRes = await api.get<{ data: import('@stevensconnect/shared').AuthUser }>(
          '/users/me',
          { headers: { Authorization: `Bearer ${newToken}` } },
        );
        if (cancelled) return;
        setAuth(profileRes.data.data, newToken);
      } catch {
        // No valid session — that's fine, user is just logged out
        clearAuth();
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void restoreSession();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    accessToken,
    isInitializing,
    isAuthenticated: !!user,
    isVerified: user?.isVerified ?? false,

    async login(email: string, password: string): Promise<void> {
      const { data } = await authApi.login({ email, password });
      setAuth(data.data.user, data.data.accessToken);
    },

    async logout(): Promise<void> {
      try {
        await authApi.logout();
      } catch {
        // Ignore errors — clear local state regardless
      } finally {
        clearAuth();
      }
    },

    async register(input: {
      email: string;
      password: string;
      displayName: string;
      username: string;
    }): Promise<void> {
      await authApi.register(input);
      toast.success('Account created! Check your @stevens.edu email to verify.');
    },
  };
}
