import { useState, useEffect, useCallback } from 'react';
import { conversationsApi } from '../api/conversations';
import { useSocket } from './useSocket';
import { useChatStore } from '../store/chatStore';
import type { Conversation, Message } from '@stevensconnect/shared';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const setTotalUnread = useChatStore((s) => s.setTotalUnread);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await conversationsApi.list();
      setConversations(res.data.data);
      setError(null);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // When a new message arrives on any conversation, bump its lastMessageAt + unreadCount
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message: Message) {
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c.id !== message.conversationId) return c;
            return {
              ...c,
              lastMessageAt: message.createdAt,
              lastMessage: message,
              unreadCount: c.unreadCount + 1,
            };
          })
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
      );
    }

    socket.on('new_message', handleNewMessage);
    return () => { socket.off('new_message', handleNewMessage); };
  }, [socket]);

  function markConversationRead(conversationId: string) {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Keep global store in sync so Navbar badge updates without prop drilling
  useEffect(() => { setTotalUnread(totalUnread); }, [totalUnread, setTotalUnread]);

  return { conversations, isLoading, error, reload: load, markConversationRead, totalUnread };
}
