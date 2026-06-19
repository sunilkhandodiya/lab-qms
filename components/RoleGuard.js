'use client';
// components/RoleGuard.js
// Shared components for role-based UI control across all screens

import { useSession } from 'next-auth/react';
import { can, canAccessPage, ROLE_LABELS } from '@/lib/permissions';

// Show children only if user has the required permission
export function CanDo({ permission, children, fallback = null }) {
  const { data: session } = useSession();
  if (can(session?.user?.role, permission)) return children;
  return fallback;
}

// Show children only if user can access the page
export function CanAccess({ page, children, fallback = null }) {
  const { data: session } = useSession();
  if (canAccessPage(session?.user?.role, page)) return children;
  return fallback;
}

// Read-only wrapper — disables children if user lacks permission
export function ReadOnly({ permission, children }) {
  const { data: session } = useSession();
  const allowed = can(session?.user?.role, permission);
  if (allowed) return children;
  return (
    <div style={{ opacity: 0.5, pointerEvents: 'none', userSelect: 'none', position: 'relative' }}>
      {children}
      <div style={{ position: 'absolute', inset: 0, cursor: 'not-allowed' }} title="You don't have permission to perform this action" />
    </div>
  );
}

// Role badge for display
export function RoleBadge({ role, size = 'sm' }) {
  const r = ROLE_LABELS[role];
  if (!r) return null;
  const fontSize = size === 'sm' ? 10 : 12;
  const padding = size === 'sm' ? '2px 8px' : '3px 12px';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding, borderRadius: 20, fontSize, fontWeight: 500, background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}44`, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
      {r.label}
    </span>
  );
}

// Permission tooltip for disabled actions
export function PermissionTooltip({ permission, children }) {
  const { data: session } = useSession();
  const allowed = can(session?.user?.role, permission);
  if (allowed) return children;
  return (
    <span title={`Requires permission: ${permission}`} style={{ cursor: 'not-allowed', display: 'inline-flex' }}>
      <span style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</span>
    </span>
  );
}
