import { createRoot } from 'react-dom/client';
import { ClerkProvider, SignInButton, useAuth } from '@clerk/react';
import { useEffect } from 'react';
import App from './App.tsx';
import './index.css';
import { setAuthTokenProvider } from './services/auth';

function ClerkApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenProvider(isSignedIn ? () => getToken() : null);
    return () => setAuthTokenProvider(null);
  }, [getToken, isSignedIn]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading authentication…</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold">Sign in to CareerPilot</h1>
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Sign in</button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <App />;
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
createRoot(document.getElementById('root')!).render(
  publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkApp />
    </ClerkProvider>
  ) : (
    <App />
  )
);
