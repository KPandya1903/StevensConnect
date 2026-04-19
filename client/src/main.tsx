import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

// Sentry is a no-op when VITE_SENTRY_DSN is absent (dev/CI)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

const SentryErrorBoundary = Sentry.ErrorBoundary;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={
      <div className="flex min-h-screen items-center justify-center text-center px-4">
        <div>
          <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
          <p className="mt-1 text-sm text-gray-500">The error has been reported. Please refresh the page.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Refresh
          </button>
        </div>
      </div>
    }>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#c11414', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
    </SentryErrorBoundary>
  </React.StrictMode>,
);
