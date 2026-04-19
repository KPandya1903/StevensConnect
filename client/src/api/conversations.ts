import { api } from './index';
import type { Conversation, MessagesPage } from '@stevensconnect/shared';

export const conversationsApi = {
  start(targetUserId: string, listingId?: string | null) {
    return api.post<{ data: { conversationId: string } }>('/conversations', { targetUserId, listingId });
  },

  list() {
    return api.get<{ data: Conversation[] }>('/conversations');
  },

  getMessages(conversationId: string, params?: { before?: string; limit?: number }) {
    return api.get<{ data: MessagesPage }>(`/conversations/${conversationId}/messages`, { params });
  },
};
