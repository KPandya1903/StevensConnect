import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChatStore } from '../../store/chatStore';
import toast from 'react-hot-toast';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const totalUnread = useChatStore((s) => s.totalUnread);

  async function handleLogout() {
    try {
      await logout();
      navigate('/');
    } catch {
      toast.error('Logout failed.');
    }
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-brand-100 text-brand-700'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">

        {/* Logo */}
        <Link
          to="/marketplace"
          className="bg-gradient-to-r from-brand-700 to-violet-500 bg-clip-text text-lg font-extrabold tracking-tight text-transparent"
        >
          House-Mate
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/marketplace" className={linkCls}>Marketplace</NavLink>
          <NavLink to="/housing" className={linkCls}>Housing</NavLink>
          <NavLink to="/roommates" className={linkCls}>Roommates</NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/listings/new"
            className="hidden rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-lift sm:inline-block"
          >
            + Post listing
          </Link>

          {user && (
            <div className="flex items-center gap-2.5">
              {/* Inbox */}
              <Link
                to="/messages"
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                Inbox
                {totalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <Link to="/profile/me" className="hidden items-center gap-2 sm:flex">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-400 text-xs font-bold text-white shadow-sm">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-gray-500">@{user.username}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
