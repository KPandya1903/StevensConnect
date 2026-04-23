import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useMessages } from '../hooks/useMessages';
import { useAuth } from '../hooks/useAuth';
import { timeAgo } from '../utils/format';
import { getMessageStatus } from '@stevensconnect/shared';
import type { Message, MessageStatus } from '@stevensconnect/shared';

const TYPING_DEBOUNCE_MS = 1500;

function MessageTicks({ status }: { status: MessageStatus }) {
  if (status === 'sending') return null;
  const gray = '#9ca3af';
  const blue = '#2563eb';
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center ml-1">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M1 5l3 3 7-7" stroke={gray} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  const color = status === 'read' ? blue : gray;
  return (
    <span className="inline-flex items-center ml-1">
      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M1 5l3 3 7-7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 5l3 3 7-7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ChatPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const {
    messages, isLoading, isFetchingMore, hasMore,
    typingUsers, sendMessage, loadMore, emitTyping, emitStopTyping, emitMessagesRead,
  } = useMessages(conversationId!);

  // Scroll to bottom on initial load and mark read
  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      emitMessagesRead();
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark read + scroll when new messages arrive while viewing
  const prevLengthRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.senderId === user?.id) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // New message from the other person — mark read immediately since we're viewing
        emitMessagesRead();
      }
      prevLengthRef.current = messages.length;
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setDraft('');
    emitStopTyping();
    isTypingRef.current = false;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    if (!isTypingRef.current) {
      emitTyping();
      isTypingRef.current = true;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      emitStopTyping();
      isTypingRef.current = false;
    }, TYPING_DEBOUNCE_MS);
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    if (e.currentTarget.scrollTop < 80 && hasMore && !isFetchingMore) {
      void loadMore();
    }
  }

  if (!conversationId) {
    navigate('/messages');
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/messages')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        onScroll={handleScroll}
      >
        {isFetchingMore && (
          <div className="flex justify-center py-2">
            <Spinner size="sm" />
          </div>
        )}
        {hasMore && !isFetchingMore && (
          <button
            onClick={() => void loadMore()}
            className="w-full text-center text-xs text-blue-500 hover:underline py-1"
          >
            Load older messages
          </button>
        )}

        {isLoading ? (
          <div className="flex justify-center pt-20">
            <Spinner size="lg" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg: Message, i: number) => {
            const isMine = msg.senderId === user?.id;
            const prevMsg = messages[i - 1];
            const showTimestamp =
              !prevMsg ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <p className="my-3 text-center text-xs text-gray-400">
                    {timeAgo(msg.createdAt)}
                  </p>
                )}
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                      ${isMine
                        ? 'rounded-br-sm bg-blue-600 text-white'
                        : 'rounded-bl-sm bg-white text-gray-900 border border-gray-200 shadow-sm'
                      }
                      ${msg.isDeleted ? 'italic opacity-60' : ''}
                    `}
                  >
                    {msg.isDeleted ? 'This message was deleted' : msg.content}
                  </div>
                  {isMine && (
                    <div className="flex justify-end mt-0.5 pr-1">
                      <MessageTicks status={getMessageStatus(msg)} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex justify-start pt-1">
            <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
            className="flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm leading-relaxed placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0-7 7m7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-gray-400">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
