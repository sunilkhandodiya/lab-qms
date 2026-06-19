'use client';
// app/login/page.js
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get('error');
  const callbackUrl = params.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(null);
  const [formError, setFormError] = useState('');

  async function handleCredentials(e) {
    e.preventDefault();
    setLoading('credentials');
    setFormError('');

    const result = await signIn('credentials', {
      email, password, redirect: false,
    });

    if (result?.error) {
      setFormError('Invalid email or password.');
      setLoading(null);
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleOAuth(provider) {
    setLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  const errorMessages = {
    OAuthSignin: 'Error connecting to provider.',
    OAuthCallback: 'Error during OAuth callback.',
    OAuthCreateAccount: 'Could not create account.',
    Callback: 'Authentication callback error.',
    AccessDenied: 'Access denied. Your account may be disabled.',
    default: 'An error occurred. Please try again.',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚗</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>Lab QMS</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Quality Management System
          </div>
        </div>

        <div className="card">
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Sign in to your account</div>
          </div>

          {/* Error banner */}
          {(error || formError) && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              {formError || errorMessages[error] || errorMessages.default}
            </div>
          )}

          {/* OAuth buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', gap: 10, padding: '10px 16px' }}
              onClick={() => handleOAuth('google')}
              disabled={!!loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </button>

            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', gap: 10, padding: '10px 16px' }}
              onClick={() => handleOAuth('azure-ad')}
              disabled={!!loading}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
              </svg>
              {loading === 'azure-ad' ? 'Connecting...' : 'Continue with Microsoft'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@lab.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', marginTop: 4 }}
              disabled={!!loading}
            >
              {loading === 'credentials' ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          Access is restricted to authorised laboratory personnel only.
        </div>
      </div>
    </div>
  );
}
