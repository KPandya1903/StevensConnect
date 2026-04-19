import { api } from './index';
import type { AuthUser } from '@stevensconnect/shared';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<{ data: { message: string } }>('/auth/register', input),

  verifyEmail: (token: string) =>
    api.post<{ data: { message: string } }>('/auth/verify-email', { token }),

  login: (input: LoginInput) =>
    api.post<{ data: LoginResponse }>('/auth/login', input),

  refresh: () =>
    api.post<{ data: { accessToken: string } }>('/auth/refresh'),

  logout: () =>
    api.post<{ data: { message: string } }>('/auth/logout'),

  resendVerification: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/resend-verification', { email }),
};
