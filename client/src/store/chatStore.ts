/**
 * Lightweight store for the total unread message count.
 * Updated by useConversations whenever conversations load or a new message arrives.
 * Read by the Navbar to show the badge without prop-drilling.
 */

import { create } from 'zustand';

interface ChatState {
  totalUnread: number;
  setTotalUnread: (n: number) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  totalUnread: 0,
  setTotalUnread: (n) => set({ totalUnread: n }),
}));
