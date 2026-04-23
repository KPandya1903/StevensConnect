import { create } from 'zustand';

interface ChatState {
  totalUnread: number;
  unreadByConversation: Record<string, number>;
  setConversationUnread: (conversationId: string, count: number) => void;
  clearConversationUnread: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  totalUnread: 0,
  unreadByConversation: {},

  setConversationUnread: (conversationId, count) => {
    const prev = get().unreadByConversation;
    const prevCount = prev[conversationId] ?? 0;
    set({
      unreadByConversation: { ...prev, [conversationId]: count },
      totalUnread: Math.max(0, get().totalUnread - prevCount + count),
    });
  },

  clearConversationUnread: (conversationId) => {
    const prev = get().unreadByConversation;
    const prevCount = prev[conversationId] ?? 0;
    set({
      unreadByConversation: { ...prev, [conversationId]: 0 },
      totalUnread: Math.max(0, get().totalUnread - prevCount),
    });
  },
}));
