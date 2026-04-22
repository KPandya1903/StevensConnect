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
 */

import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/auth';
import { api, registerAuthHandlers } from '../api/index';

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
      const existingToken = useAuthStore.getState().accessToken;
      if (existingToken) {
        try {
          const profileRes = await api.get<{ data: import('@stevensconnect/shared').AuthUser }>(
            '/users/me',
            { headers: { Authorization: `Bearer ${existingToken}` } },
          );
          if (cancelled) return;
          setAuth(profileRes.data.data, existingToken);
          setInitializing(false);
          return;
        } catch {
          // Token expired or invalid — fall through to refresh
        }
      }

      try {
        const { data } = await authApi.refresh();
        if (cancelled) return;

        const newToken = data.data.accessToken;
        setAccessToken(newToken);

        const profileRes = await api.get<{ data: import('@stevensconnect/shared').AuthUser }>(
          '/users/me',
          { headers: { Authorization: `Bearer ${newToken}` } },
        );
        if (cancelled) return;
        setAuth(profileRes.data.data, newToken);
      } catch {
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

    async loginWithGoogle(credential: string): Promise<{ isNewUser: boolean }> {
      const { data } = await authApi.loginWithGoogle(credential);
      setAuth(data.data.user, data.data.accessToken);
      return { isNewUser: data.data.isNewUser };
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
  };
}
