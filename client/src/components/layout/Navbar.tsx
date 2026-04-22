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
    `text-sm font-medium transition ${
      isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link to="/marketplace" className="text-lg font-bold text-blue-700 tracking-tight">
          House-Mate
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink to="/marketplace" className={linkCls}>Marketplace</NavLink>
          <NavLink to="/housing" className={linkCls}>Housing</NavLink>
          <NavLink to="/roommates" className={linkCls}>Roommates</NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link
            to="/listings/new"
            className="hidden rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 sm:inline-block"
          >
            + Post listing
          </Link>

          {user && (
            <div className="flex items-center gap-3">
              {/* Inbox */}
              <Link to="/messages" className="relative flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                Inbox
                {totalUnread > 0 && (
                  <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>

              <Link
                to="/profile/me"
                className="hidden items-center gap-2 sm:flex"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-600">@{user.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-gray-800"
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
