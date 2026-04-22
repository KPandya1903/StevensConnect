import { api } from './index';
import type { AuthUser } from '@stevensconnect/shared';

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

export const authApi = {
  loginWithGoogle: (credential: string) =>
    api.post<{ data: LoginResponse }>('/auth/google', { credential }),

  refresh: () =>
    api.post<{ data: { accessToken: string } }>('/auth/refresh'),

  logout: () =>
    api.post<{ data: { message: string } }>('/auth/logout'),
};
