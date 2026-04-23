import { useState, useEffect, useCallback, useRef } from 'react';
import { conversationsApi } from '../api/conversations';
import { useSocket } from './useSocket';
import type { Message, MessageDeliveredEvent, MessageReadEvent } from '@stevensconnect/shared';

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const socket = useSocket();
  const joinedRef = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await conversationsApi.getMessages(conversationId);
      const { messages: msgs, hasMore: more, nextCursor: cursor } = res.data.data;
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

  useEffect(() => {
    if (!socket || joinedRef.current) return;
    socket.emit('join_conversation', { conversationId });
    joinedRef.current = true;

    return () => {
      socket.emit('leave_conversation', { conversationId });
      joinedRef.current = false;
    };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;

    function handleMessageNew(message: Message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    function handleMessageAck(message: Message) {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    function handleMessageDelivered({ messageId, deliveredAt }: MessageDeliveredEvent) {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, deliveredAt } : m),
      );
    }

    function handleMessageRead({ messageIds, readAt }: MessageReadEvent) {
      setMessages((prev) =>
        prev.map((m) => messageIds.includes(m.id) ? { ...m, readAt } : m),
      );
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

    socket.on('message:new', handleMessageNew);
    socket.on('message:ack', handleMessageAck);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('message:read', handleMessageRead);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('message:ack', handleMessageAck);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('message:read', handleMessageRead);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [socket, conversationId]);

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

  function emitMessagesRead() {
    socket?.emit('messages:read', { conversationId });
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
    emitMessagesRead,
  };
}
