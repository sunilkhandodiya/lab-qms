'use client';
// app/configuration/methods/MethodConfigClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        cursor: disabled ? 'default' : 'pointer', padding: 2,
        background: checked ? 'var(--accent-blue)' : 'var(--border-strong)',
        transition: 'background 0.2s', position: 'relative', display: 'inline-block',
      }}>
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'transform 0.2s', transform: checked ? 'translateX(18px)' : 'translateX(0)',
      }} />
    </button>
  );
}

function Modal({ title, initial, locations, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', locationId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) { setError('Method name is required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Method Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hexokinase" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select className="form-select" value={form.locationId || ''} onChange={e => set('locationId', e.target.value)}>
              <option value="">All locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function MethodConfigClient({ initialMethods, locations }) {
  const [methods, setMethods] = useState(initialMethods);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => methods.filter(m => {
    if (filterLoc && m.locationId !== filterLoc) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [methods, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/methods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setMethods(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/methods/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setMethods(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditing(null);
  }

  async function toggleActive(method) {
    const next = !method.active;
    const res = await fetch(`/api/config/methods/${method.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) setMethods(prev => prev.map(m => m.id === method.id ? { ...m, active: next } : m));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this method?')) return;
    const res = await fetch(`/api/config/methods/${id}`, { method: 'DELETE' });
    if (res.ok) setMethods(prev => prev.filter(m => m.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr No', 'Method Name', 'Location', 'Status'];
    const rows = filtered.map((m, i) => [i + 1, m.name, m.location?.name || '', m.active ? 'Active' : 'Inactive']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'methods.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Methods</div>
          <div className="page-title">Method Configuration</div>
        </div>
      </div>

      {/* Location filter + Export */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Filter by Location</div>
          <select className="form-select" value={filterLoc} onChange={e => setFilterLoc(e.target.value)} style={{ maxWidth: 360 }}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>↓ Export</button>
      </div>

      {/* Add More + Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <CanDo permission="config:add">
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add More</button>
        </CanDo>
        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search method…" style={{ width: 220, fontSize: 13 }} />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr. No', 'Method Name', 'Location', 'Status', 'Action'].map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No methods configured.</td></tr>
              ) : filtered.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--text-muted)', width: 70 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td>{m.location?.name || <span className="text-muted">—</span>}</td>
                  <td>
                    <CanDo permission="config:edit" fallback={<Toggle checked={m.active} onChange={() => {}} disabled />}>
                      <Toggle checked={m.active} onChange={() => toggleActive(m)} />
                    </CanDo>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <CanDo permission="config:edit">
                        <button title="Edit" onClick={() => setEditing(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 15 }}>✏</button>
                      </CanDo>
                      <CanDo permission="config:delete">
                        <button title="Delete" onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 15 }}>🗑</button>
                      </CanDo>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {methods.length} methods
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Method" locations={locations} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Method" initial={editing} locations={locations} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
