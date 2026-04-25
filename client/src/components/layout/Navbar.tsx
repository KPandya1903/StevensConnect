import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useChatStore } from '../../store/chatStore';
import toast from 'react-hot-toast';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const totalUnread = useChatStore((s) => s.totalUnread);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

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

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 font-semibold'
        : 'text-gray-700 hover:bg-gray-50'
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

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/marketplace" className={linkCls}>Marketplace</NavLink>
          <NavLink to="/housing" className={linkCls}>Housing</NavLink>
          <NavLink to="/roommates" className={linkCls}>Roommates</NavLink>
          <NavLink to="/map" className={linkCls}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0Z" />
            </svg>
            Map
          </NavLink>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <Link
            to="/listings/new"
            className="hidden rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-lift sm:inline-block"
          >
            + Post listing
          </Link>

          {user && (
            <>
              {/* Inbox — always visible */}
              <Link
                to="/messages"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5"
              >
                <svg className="h-5 w-5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
                <span className="hidden text-sm font-medium sm:inline">Inbox</span>
                {totalUnread > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white sm:-right-0.5 sm:-top-0.5">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </Link>

              {/* Desktop: profile + sign out */}
              <Link to="/profile/me" className="hidden items-center gap-2 sm:flex">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-400 text-xs font-bold text-white shadow-sm">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-medium text-gray-500">@{user.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="hidden rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 sm:block"
              >
                Sign out
              </button>

              {/* Mobile: hamburger */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 sm:hidden"
                aria-label="Menu"
              >
                {menuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:hidden">
          <nav className="space-y-0.5">
            <NavLink to="/marketplace" className={mobileLinkCls}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
              </svg>
              Marketplace
            </NavLink>
            <NavLink to="/housing" className={mobileLinkCls}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
              </svg>
              Housing
            </NavLink>
            <NavLink to="/roommates" className={mobileLinkCls}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              Roommates
            </NavLink>
            <NavLink to="/map" className={mobileLinkCls}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0Z" />
              </svg>
              Map
            </NavLink>
          </nav>

          <div className="my-3 border-t border-gray-100" />

          <Link
            to="/listings/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Post a listing
          </Link>

          {user && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5">
              <Link to="/profile/me" className="flex items-center gap-2.5">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-400 text-xs font-bold text-white shadow-sm">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-400">@{user.username}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
