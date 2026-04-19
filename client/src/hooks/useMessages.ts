import { useState, useEffect, useCallback, useRef } from 'react';
import { conversationsApi } from '../api/conversations';
import { useSocket } from './useSocket';
import type { Message } from '@stevensconnect/shared';

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socket = useSocket();
  const joinedRef = useRef(false);

  // Initial load
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await conversationsApi.getMessages(conversationId);
      const { messages: msgs, hasMore: more, nextCursor: cursor } = res.data.data;
      // API returns newest-first; reverse so oldest is at top
      setMessages([...msgs].reverse());
      setHasMore(more);
      setNextCursor(cursor);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Join socket room for this conversation
  useEffect(() => {
    if (!socket || joinedRef.current) return;
    socket.emit('join_conversation', { conversationId });
    joinedRef.current = true;

    return () => {
      socket.emit('leave_conversation', { conversationId });
      joinedRef.current = false;
    };
  }, [socket, conversationId]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(message: Message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    function handleTyping({ username }: { userId: string; username: string }) {
      setTypingUsers((prev) => new Set([...prev, username]));
    }

    function handleStopTyping({ username }: { username: string }) {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    }

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, conversationId]);

  // Load older messages (scroll up)
  async function loadMore() {
    if (!hasMore || !nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await conversationsApi.getMessages(conversationId, { before: nextCursor });
      const { messages: older, hasMore: more, nextCursor: cursor } = res.data.data;
      setMessages((prev) => [...[...older].reverse(), ...prev]);
      setHasMore(more);
      setNextCursor(cursor);
    } finally {
      setIsFetchingMore(false);
    }
  }

  function sendMessage(content: string) {
    if (!socket) return;
    socket.emit('send_message', { conversationId, content });
  }

  function emitTyping() {
    socket?.emit('typing', { conversationId });
  }

  function emitStopTyping() {
    socket?.emit('stop_typing', { conversationId });
  }

  function emitMarkRead() {
    socket?.emit('mark_read', { conversationId });
  }

  return {
    messages,
    isLoading,
    isFetchingMore,
    hasMore,
    typingUsers: [...typingUsers],
    sendMessage,
    loadMore,
    emitTyping,
    emitStopTyping,
    emitMarkRead,
  };
}
