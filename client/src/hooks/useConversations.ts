import { useState, useEffect, useCallback, useRef } from 'react';
import { conversationsApi } from '../api/conversations';
import { useSocket } from './useSocket';
import { useChatStore } from '../store/chatStore';
import type { Conversation, Message, UnreadUpdateEvent, UnreadClearedEvent } from '@stevensconnect/shared';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socket = useSocket();
  const setConversationUnread = useChatStore((s) => s.setConversationUnread);
  const clearConversationUnread = useChatStore((s) => s.clearConversationUnread);
  const setConversationUnreadRef = useRef(setConversationUnread);
  const clearConversationUnreadRef = useRef(clearConversationUnread);
  setConversationUnreadRef.current = setConversationUnread;
  clearConversationUnreadRef.current = clearConversationUnread;

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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;

    function handleMessageNew(message: Message) {
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

    function handleMessageAck(message: Message) {
      setConversations((prev) =>
        prev
          .map((c) => {
            if (c.id !== message.conversationId) return c;
            return { ...c, lastMessageAt: message.createdAt, lastMessage: message };
          })
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
      );
    }

    function handleUnreadUpdate({ conversationId, count }: UnreadUpdateEvent) {
      setConversationUnreadRef.current(conversationId, count);
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId ? { ...c, unreadCount: count } : c),
      );
    }

    function handleUnreadCleared({ conversationId }: UnreadClearedEvent) {
      clearConversationUnreadRef.current(conversationId);
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId ? { ...c, unreadCount: 0 } : c),
      );
    }

    socket.on('message:new', handleMessageNew);
    socket.on('message:ack', handleMessageAck);
    socket.on('unread:update', handleUnreadUpdate);
    socket.on('unread:cleared', handleUnreadCleared);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('message:ack', handleMessageAck);
      socket.off('unread:update', handleUnreadUpdate);
      socket.off('unread:cleared', handleUnreadCleared);
    };
  }, [socket]);

  return { conversations, isLoading, error, reload: load };
}
