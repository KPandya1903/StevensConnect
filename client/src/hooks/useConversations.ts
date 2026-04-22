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
  const setConversationUnread = useChatStore((s) => s.setConversationUnread);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await conversationsApi.list();
      const convs: Conversation[] = res.data.data;
      setConversations(convs);
      convs.forEach((c) => setConversationUnread(c.id, c.unreadCount));
      setError(null);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setIsLoading(false);
    }
  }, [setConversationUnread]);

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
            const newCount = c.unreadCount + 1;
            setConversationUnread(c.id, newCount);
            return {
              ...c,
              lastMessageAt: message.createdAt,
              lastMessage: message,
              unreadCount: newCount,
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

  return { conversations, isLoading, error, reload: load, markConversationRead };
}
