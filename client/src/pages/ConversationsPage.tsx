import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Spinner } from '../components/ui/Spinner';
import { useConversations } from '../hooks/useConversations';
import { useAuth } from '../hooks/useAuth';
import { timeAgo } from '../utils/format';

export function ConversationsPage() {
  const { conversations, isLoading, error } = useConversations();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Messages</h1>

        {isLoading && (
          <div className="flex justify-center pt-12">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
            <p className="text-base font-medium text-gray-700">No conversations yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Message a seller from any listing to get started.
            </p>
          </div>
        )}

        {!isLoading && conversations.length > 0 && (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {conversations.map((conv) => {
              const other = conv.participants[0];
              const isUnread = conv.unreadCount > 0;
              const lastMsg = conv.lastMessage;
              const isMine = lastMsg?.senderId === user?.id;

              return (
                <li key={conv.id}>
                  <Link
                    to={`/messages/${conv.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-700">
                      {other?.displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {other?.displayName ?? 'Unknown user'}
                        </span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {timeAgo(conv.lastMessageAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`truncate text-sm ${isUnread ? 'font-medium text-gray-800' : 'text-gray-500'}`}>
                          {lastMsg
                            ? lastMsg.isDeleted
                              ? 'Message deleted'
                              : `${isMine ? 'You: ' : ''}${lastMsg.content}`
                            : 'No messages yet'}
                        </p>
                        {isUnread && (
                          <span className="ml-auto shrink-0 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
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
    </div>
  );
}
