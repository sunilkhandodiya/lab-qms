'use client';
// app/configuration/departments/DepartmentConfigClient.js
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
    if (!form.name.trim()) { setError('Department name is required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Department Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Clinical Hematology" autoFocus />
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

export default function DepartmentConfigClient({ initialDepts, locations }) {
  const [depts, setDepts] = useState(initialDepts);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => depts.filter(d => {
    if (filterLoc && d.locationId !== filterLoc) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [depts, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setDepts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/departments/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setDepts(prev => prev.map(d => d.id === updated.id ? updated : d));
    setEditing(null);
  }

  async function toggleActive(dept) {
    const next = !dept.active;
    const res = await fetch(`/api/config/departments/${dept.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) setDepts(prev => prev.map(d => d.id === dept.id ? { ...d, active: next } : d));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this department?')) return;
    const res = await fetch(`/api/config/departments/${id}`, { method: 'DELETE' });
    if (res.ok) setDepts(prev => prev.filter(d => d.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr No', 'Department Name', 'Location', 'Status'];
    const rows = filtered.map((d, i) => [i + 1, d.name, d.location?.name || '', d.active ? 'Active' : 'Inactive']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'departments.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Departments</div>
          <div className="page-title">Department Configuration</div>
        </div>
      </div>

      {/* Location filter */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Filter by Location</div>
        <select className="form-select" value={filterLoc} onChange={e => setFilterLoc(e.target.value)} style={{ maxWidth: 360 }}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {filterLoc ? `Viewing ${filtered.length} department(s) for selected location` : 'Viewing data from all locations'}
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add More</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search department…" style={{ width: 220, fontSize: 13 }} />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13 }}>↓ Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr No', 'Department Name', 'Location', 'Status', 'Action'].map((h, i) => <th key={i}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No departments configured.</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id}>
                  <td style={{ color: 'var(--text-muted)', width: 60 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{d.name}</td>
                  <td>{d.location?.name || <span className="text-muted">—</span>}</td>
                  <td>
                    <CanDo permission="config:edit" fallback={<Toggle checked={d.active} onChange={() => {}} disabled />}>
                      <Toggle checked={d.active} onChange={() => toggleActive(d)} />
                    </CanDo>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <CanDo permission="config:edit">
                        <button title="Edit" onClick={() => setEditing(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 15 }}>✏</button>
                      </CanDo>
                      <CanDo permission="config:delete">
                        <button title="Delete" onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 15 }}>🗑</button>
                      </CanDo>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {depts.length} departments
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Department" locations={locations} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Department" initial={editing} locations={locations} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
