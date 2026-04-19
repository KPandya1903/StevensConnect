/**
 * Axios instance with automatic token refresh.
 *
 * All API calls in the app go through this instance — never raw axios.
 *
 * Token strategy:
 *   - Access token: stored in authStore (memory only, never localStorage)
 *   - Refresh token: HttpOnly cookie, managed by the browser — never touched by JS
 *
 * On 401 response:
 *   1. Attempt POST /api/auth/refresh (browser sends cookie automatically)
 *   2. If refresh succeeds: update authStore with new access token, retry original request
 *   3. If refresh fails: clear auth state, redirect to /login
 *
 * The queue prevents multiple simultaneous refresh attempts when several
 * requests 401 at the same time (common on tab focus after token expiry).
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// Import lazily to avoid circular dependency (authStore imports api)
let _getAccessToken: (() => string | null) | null = null;
let _setAccessToken: ((token: string | null) => void) | null = null;
let _clearAuth: (() => void) | null = null;

export function registerAuthHandlers(handlers: {
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
}): void {
  _getAccessToken = handlers.getAccessToken;
  _setAccessToken = handlers.setAccessToken;
  _clearAuth = handlers.clearAuth;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true, // Send cookies (refresh token) with every request
  headers: { 'Content-Type': 'application/json' },
});

// ---- Request interceptor: attach access token ----

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = _getAccessToken?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- Response interceptor: handle 401 with token refresh ----

let isRefreshing = false;
// Queue of { resolve, reject } for requests that arrived while refresh was in flight
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh for auth endpoints themselves (would cause loops)
    if (originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const { data } = await axios.post<{ data: { accessToken: string } }>(
        `${baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken = data.data.accessToken;

      _setAccessToken?.(newToken);
      processQueue(null, newToken);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      _clearAuth?.();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
