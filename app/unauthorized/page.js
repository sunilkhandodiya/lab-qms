'use client';
// app/unauthorized/page.js
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function UnauthorizedPage() {
  const params = useSearchParams();
  const reason = params.get('reason');

  const messages = {
    disabled: 'Your account has been disabled. Please contact your Quality Manager.',
    role: 'You do not have permission to access this page.',
    default: 'You are not authorised to view this page.',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Access Denied</div>
        <div style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
          {messages[reason] || messages.default}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <a href="/" className="btn btn-ghost">Go to Dashboard</a>
          <button className="btn btn-danger" onClick={() => signOut({ callbackUrl: '/login' })}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
