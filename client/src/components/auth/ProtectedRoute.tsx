/**
 * ProtectedRoute
 *
 * Redirects to /login if the user is not authenticated.
 * Shows a full-screen spinner while the session is being restored (page load).
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
