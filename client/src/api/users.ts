import { api } from './index';
import type { AuthUser, PublicUser } from '@stevensconnect/shared';

export const usersApi = {
  getMe() {
    return api.get<{ data: AuthUser }>('/users/me');
  },

  updateMe(input: { displayName?: string; bio?: string | null; gradYear?: number | null; major?: string | null }) {
    return api.patch<{ data: AuthUser }>('/users/me', input);
  },

  uploadAvatar(file: File) {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<{ data: AuthUser }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getSaves(params?: { page?: number; limit?: number }) {
    return api.get('/users/me/saves', { params });
  },

  getByUsername(username: string) {
    return api.get<{ data: PublicUser }>(`/users/${username}`);
  },
};
