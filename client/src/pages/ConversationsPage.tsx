import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { useConversations } from '../hooks/useConversations';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import { conversationsApi } from '../api/conversations';
import { timeAgo } from '../utils/format';
import toast from 'react-hot-toast';

export function ConversationsPage() {
  const { conversations, isLoading, error } = useConversations();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  async function handleStartChat() {
    const username = usernameInput.trim().replace(/^@/, '');
    if (!username) return;
    setIsSearching(true);
    try {
      const res = await usersApi.getByUsername(username);
      const targetUser = res.data.data;
      if (targetUser.id === user?.id) {
        toast.error("You can't message yourself.");
        return;
      }
      setIsStarting(true);
      const convRes = await conversationsApi.start(targetUser.id);
      setNewChatOpen(false);
      setUsernameInput('');
      navigate(`/messages/${convRes.data.data.conversationId}`);
    } catch {
      toast.error('User not found. Check the username and try again.');
    } finally {
      setIsSearching(false);
      setIsStarting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inbox</h1>
          <button
            onClick={() => setNewChatOpen(true)}
            className="flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-lift"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New message
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center pt-12">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="rounded-2xl border border-gray-200/80 bg-white py-16 text-center shadow-card">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p className="text-base font-semibold text-gray-700">No conversations yet</p>
            <p className="mt-1 text-sm text-gray-400">Start one by clicking "New message" above.</p>
          </div>
        )}

        {!isLoading && conversations.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-card divide-y divide-gray-100/80">
            {conversations.map((conv) => {
              const other = conv.participants[0];
              const isUnread = conv.unreadCount > 0;
              const lastMsg = conv.lastMessage;
              const isMine = lastMsg?.senderId === user?.id;

              return (
                <li key={conv.id}>
                  <Link
                    to={`/messages/${conv.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/80"
                  >
                    {/* Avatar */}
                    {other?.avatarUrl ? (
                      <img
                        src={other.avatarUrl}
                        alt={other.displayName}
                        className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-gray-100"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-400 text-base font-bold text-white shadow-sm">
                        {other?.displayName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {other?.displayName ?? 'Unknown user'}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        <p className={`truncate text-sm ${isUnread ? 'font-medium text-gray-800' : 'text-gray-400'}`}>
                          {lastMsg
                            ? lastMsg.isDeleted
                              ? 'Message deleted'
                              : `${isMine ? 'You: ' : ''}${lastMsg.content}`
                            : 'No messages yet'}
                        </p>
                        {isUnread && (
                          <span className="ml-auto shrink-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* New message modal */}
      <Modal open={newChatOpen} onClose={() => { setNewChatOpen(false); setUsernameInput(''); }} title="New message">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleStartChat(); }}
              placeholder="@username"
              autoFocus
              className="block w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setNewChatOpen(false); setUsernameInput(''); }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleStartChat()}
              disabled={!usernameInput.trim() || isSearching || isStarting}
              className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {isSearching || isStarting ? 'Opening…' : 'Open chat'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
