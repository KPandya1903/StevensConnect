import { Outlet } from 'react-router-dom';

// Google OAuth users are always verified — this is now a pass-through
export function VerifiedRoute() {
  return <Outlet />;
}
