import { useState, useEffect, useCallback, useRef } from 'react';
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
  const markReadTick = useChatStore((s) => s.markReadTick);
  const setConversationUnreadRef = useRef(setConversationUnread);
  setConversationUnreadRef.current = setConversationUnread;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await conversationsApi.list();
      const convs: Conversation[] = res.data.data;
      setConversations(convs);
      convs.forEach((c) => setConversationUnreadRef.current(c.id, c.unreadCount));
      setError(null);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setIsLoading(false);
    }
  }, []); // stable — uses ref for setConversationUnread

  // Initial load
  useEffect(() => {
    void load();
  }, [load]);

  // Re-fetch when a conversation is marked read (from ChatPage)
  useEffect(() => {
    if (markReadTick === 0) return;
    void load();
  }, [markReadTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a new message arrives on any conversation, bump its lastMessageAt + unreadCount
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message: Message) {
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c.id !== message.conversationId) return c;
            const newCount = c.unreadCount + 1;
            setConversationUnreadRef.current(c.id, newCount);
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
