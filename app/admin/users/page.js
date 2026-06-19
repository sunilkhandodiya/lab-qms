'use client';
// app/admin/users/page.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, ROLES, getRolePermissions } from '@/lib/permissions';
import { format } from 'date-fns';

function RoleBadge({ role }) {
  const r = ROLE_LABELS[role];
  if (!r) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}44`, fontFamily: 'var(--font-mono)' }}>
      {r.label}
    </span>
  );
}

function PermissionMatrix({ role }) {
  const perms = getRolePermissions(role);
  const groups = {
    'QC': perms.filter(p => p.startsWith('qc:')),
    'Documents': perms.filter(p => p.startsWith('documents:')),
    'Equipment': perms.filter(p => p.startsWith('equipment:')),
    'CAPA': perms.filter(p => p.startsWith('capa:')),
    'Training': perms.filter(p => p.startsWith('training:')),
    'EQAS': perms.filter(p => p.startsWith('eqas:')),
    'Users': perms.filter(p => p.startsWith('users:')),
    'Audit': perms.filter(p => p.startsWith('audit:')),
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
      {Object.entries(groups).map(([group, ps]) => ps.length > 0 && (
        <div key={group} style={{ background: 'var(--bg-subtle)', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{group}</div>
          {ps.map(p => (
            <div key={p} style={{ color: 'var(--accent-green)', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✓</span> {p.split(':')[1].replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'LAB_TECHNICIAN' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSave() {
    if (!form.email || !form.password || !form.role) { setError('Email, password and role are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create user.'); setSaving(false); return; }
    onCreated(data); onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 500 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Create New User</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sara Patel" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="sara@lab.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role <span style={{ color: 'var(--accent-red)' }}>*</span></label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r].label} — {ROLE_LABELS[r].desc}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Permissions for <strong>{ROLE_LABELS[form.role]?.label}</strong>:</div>
            <PermissionMatrix role={form.role} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating...' : 'Create User'}</button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: user.name || '', role: user.role, active: user.active });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  async function handleSave() {
    setSaving(true); setError('');
    const body = { name: form.name, role: form.role, active: form.active };
    if (newPassword) { if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); setSaving(false); return; } body.newPassword = newPassword; }
    const res = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to update.'); setSaving(false); return; }
    onUpdated(data); onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 500 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 600 }}>Edit User</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)' }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Account Status</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => setForm(f => ({ ...f, active: v }))}
                  style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius)', border: `1px solid ${form.active === v ? (v ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--border)'}`, background: form.active === v ? (v ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : 'transparent', color: form.active === v ? (v ? 'var(--accent-green)' : 'var(--accent-red)') : 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
                  {v ? '✓ Active' : '✗ Disabled'}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reset Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank to keep current)</span></label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password..." style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Permissions for <strong>{ROLE_LABELS[form.role]?.label}</strong>:</div>
            <PermissionMatrix role={form.role} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [expandedRole, setExpandedRole] = useState(null);

  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') { router.push('/unauthorized?reason=role'); return; }
    if (session) fetch('/api/users').then(r => r.json()).then(data => { setUsers(data); setLoading(false); });
  }, [session]);

  async function handleDelete(user) {
    if (!confirm(`Permanently delete ${user.email}?`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) setUsers(us => us.filter(u => u.id !== user.id));
  }

  async function toggleActive(user) {
    const res = await fetch(`/api/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !user.active }) });
    if (res.ok) { const updated = await res.json(); setUsers(us => us.map(u => u.id === updated.id ? { ...u, ...updated } : u)); }
  }

  const filtered = users.filter(u =>
    (!search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!filterRole || u.role === filterRole)
  );

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading users...</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">User Management</div>
            <div className="page-subtitle">Manage accounts, roles, and permissions</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ Create User</button>
        </div>
      </div>

      {/* Role stats — click a role to FILTER the table to those users (and view its permissions) */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {ROLES.map(role => {
          const r = ROLE_LABELS[role];
          const count = users.filter(u => u.role === role).length;
          const active = filterRole === role;
          return (
            <div key={role}
              onClick={() => { const next = active ? '' : role; setFilterRole(next); setExpandedRole(next ? role : null); }}
              title={`Show ${r.label} users`}
              style={{ background: active ? `${r.color}12` : 'var(--bg-surface)', border: `1px solid ${active ? r.color : 'var(--border)'}`, boxShadow: 'var(--shadow-sm)', borderRadius: 10, padding: '14px 18px', cursor: 'pointer', minWidth: 120, flex: 1, transition: 'border-color 0.15s, background 0.15s' }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase', color: r.color, marginBottom: 6 }}>{r.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{active ? 'Filtering ✓' : 'Click to filter'}</div>
            </div>
          );
        })}
      </div>

      {/* Active filter chip */}
      {filterRole && (
        <div className="filter-bar">
          <span className="filter-chip">
            <span className="filter-chip-dot" />
            <span>Showing: <strong>{ROLE_LABELS[filterRole]?.label}</strong> · {filtered.length} user{filtered.length === 1 ? '' : 's'}</span>
            <button className="filter-chip-x" onClick={() => { setFilterRole(''); setExpandedRole(null); }} title="Clear filter" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterRole(''); setExpandedRole(null); }}>Clear filter</button>
        </div>
      )}

      {/* Expanded permissions */}
      {expandedRole && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Permissions — <span style={{ color: ROLE_LABELS[expandedRole].color }}>{ROLE_LABELS[expandedRole].label}</span></div>
            <button onClick={() => setExpandedRole(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>
          <PermissionMatrix role={expandedRole} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ flex: 2 }} />
        <select className="form-select" value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ flex: 1 }}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r].label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                {['User', 'Email', 'Role', 'Auth', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ROLE_LABELS[user.role]?.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: ROLE_LABELS[user.role]?.color, flexShrink: 0 }}>
                        {(user.name || user.email).slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{user.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}><RoleBadge role={user.role} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{user.hasPassword ? '🔑 Password' : '🔗 SSO'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: user.active ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 500 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: user.active ? 'var(--accent-green)' : 'var(--accent-red)', display: 'inline-block' }}></span>
                      {user.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd MMM yy HH:mm') : 'Never'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost" onClick={() => setEditUser(user)} style={{ padding: '4px 10px', fontSize: 11 }}>Edit</button>
                      <button onClick={() => toggleActive(user)} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent', color: user.active ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: 'var(--font-sans)' }}>
                        {user.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDelete(user)} style={{ padding: '4px 10px', fontSize: 11 }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>{filtered.length} of {users.length} users</div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={u => setUsers(prev => [u, ...prev])} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={u => setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...u } : x))} />}
    </div>
  );
}
