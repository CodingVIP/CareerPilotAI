import { createRoot } from 'react-dom/client';
import { ClerkProvider, SignInButton, SignUpButton, useAuth } from '@clerk/react';
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
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
          <div className="grid w-full gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <section className="space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                CareerPilot
              </p>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
                Organize your job search and prepare with confidence.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Keep applications, tailored resumes, ATS analysis, and interview preparation together in one private workspace.
              </p>
              <div className="flex flex-wrap gap-3">
                <SignUpButton mode="modal">
                  <button className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-500">
                    Create a free account
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                    Sign in
                  </button>
                </SignInButton>
              </div>
            </section>
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
              <h2 className="text-lg font-semibold">Your focused job-search workspace</h2>
              <ul className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <li>Track applications from discovery through follow-up.</li>
                <li>Maintain role-specific profiles and resume versions.</li>
                <li>Compare resumes with job requirements and prepare for interviews.</li>
              </ul>
            </aside>
          </div>
        </main>
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
