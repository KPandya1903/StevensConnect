import { create } from 'zustand';

interface ChatState {
  totalUnread: number;
  unreadByConversation: Record<string, number>;
  setTotalUnread: (n: number) => void;
  setConversationUnread: (conversationId: string, count: number) => void;
  markConversationRead: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  totalUnread: 0,
  unreadByConversation: {},
  setTotalUnread: (n) => set({ totalUnread: n }),
  setConversationUnread: (conversationId, count) => {
    const prev = get().unreadByConversation;
    const prevCount = prev[conversationId] ?? 0;
    set({
      unreadByConversation: { ...prev, [conversationId]: count },
      totalUnread: Math.max(0, get().totalUnread - prevCount + count),
    });
  },
  markConversationRead: (conversationId) => {
    const prev = get().unreadByConversation;
    const prevCount = prev[conversationId] ?? 0;
    set({
      unreadByConversation: { ...prev, [conversationId]: 0 },
      totalUnread: Math.max(0, get().totalUnread - prevCount),
    });
  },
}));
