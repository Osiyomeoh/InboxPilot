'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('demo@inboxpilot.dev');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasGithub = process.env.NEXT_PUBLIC_HAS_GITHUB === 'true';

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/dashboard',
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Invalid password. Default demo password is "demo".');
    } else if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-10 w-full max-w-sm space-y-6 shadow-sm">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              mail
            </span>
            <h1 className="text-2xl font-bold text-primary">InboxPilot</h1>
          </div>
          <p className="text-sm text-on-surface-variant">AI-powered sales autopilot for your inbox</p>
        </div>

        {/* Demo login form */}
        <form onSubmit={handleCredentials} className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-error bg-error-container rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-xs text-on-surface-variant">
            Demo password: <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono">demo</code>
          </p>
        </form>

        {/* GitHub OAuth divider (only shown when configured) */}
        {hasGithub && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface-container-lowest px-3 text-xs text-on-surface-variant">or</span>
              </div>
            </div>
            <button
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-2 bg-on-surface text-on-primary py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </>
        )}
      </div>
    </div>
  );
}
