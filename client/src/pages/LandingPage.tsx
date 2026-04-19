import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export function LandingPage() {
  const { isAuthenticated, isInitializing } = useAuth();

  // Redirect logged-in users straight to the feed
  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-xl font-bold text-primary-700">StevensConnect</span>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 mb-8">
          <span className="h-2 w-2 rounded-full bg-primary-500" />
          Stevens Institute of Technology
        </div>

        <h1 className="mb-6 max-w-2xl text-5xl font-bold tracking-tight text-gray-900">
          The marketplace built for{' '}
          <span className="text-primary-700">Stevens students</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg text-gray-500">
          Find housing, buy and sell items, and connect with fellow students — all in one trusted, verified community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/register"
            className="rounded-lg bg-primary-700 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-800 transition-colors"
          >
            Join with your @stevens.edu email
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap justify-center gap-3">
          {['🏠 Housing & Roommates', '📦 Buy & Sell', '💬 Real-time Chat', '✅ Verified Students Only'].map(
            (feature) => (
              <span
                key={feature}
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600"
              >
                {feature}
              </span>
            ),
          )}
        </div>
      </main>
    </div>
  );
}
