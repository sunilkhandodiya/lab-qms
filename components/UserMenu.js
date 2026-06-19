'use client';
// components/UserMenu.js — compact account menu for the topbar
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { ROLE_LABELS } from '@/lib/permissions';

export default function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!session) return null;
  const { user } = session;
  const role = ROLE_LABELS[user.role];
  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
      >
        {user.image ? (
          <img src={user.image} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-teal))', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {initials}
          </div>
        )}
        <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name || user.email}</div>
          <div style={{ fontSize: 11, color: role?.color || 'var(--text-muted)', fontWeight: 600 }}>{role?.label || user.role}</div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', minWidth: 240, padding: 8, zIndex: 60 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
            {role && (
              <span className="role-pill" style={{ marginTop: 8, background: `${role.color}1a`, color: role.color }}>
                <span className="role-dot" style={{ background: role.color }} /> {role.label}
              </span>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            ⏻ Sign out
          </button>
        </div>
      )}
    </div>
  );
}
