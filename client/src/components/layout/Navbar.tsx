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
        <Link to="/feed" className="text-lg font-bold text-blue-700 tracking-tight">
          StevensConnect
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 sm:flex">
          <NavLink to="/feed" end className={linkCls}>All</NavLink>
          <NavLink to="/marketplace" className={linkCls}>Marketplace</NavLink>
          <NavLink to="/housing" className={linkCls}>Housing</NavLink>
          <NavLink to="/roommates" className={linkCls}>Roommates</NavLink>
          <NavLink to="/saves" className={linkCls}>Saved</NavLink>
          <NavLink to="/messages" className={({ isActive }) =>
            `relative text-sm font-medium transition ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`
          }>
            Messages
            {totalUnread > 0 && (
              <span className="absolute -right-3 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </NavLink>
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
