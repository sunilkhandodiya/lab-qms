'use client';
// app/configuration/lots/LotConfigClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';
import { format } from 'date-fns';

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch" aria-checked={checked} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none',
        cursor: disabled ? 'default' : 'pointer', padding: 2,
        background: checked ? 'var(--accent-blue)' : 'var(--border-strong)',
        transition: 'background 0.2s', position: 'relative', display: 'inline-block',
      }}
    >
      <span style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'transform 0.2s', transform: checked ? 'translateX(18px)' : 'translateX(0)',
      }} />
    </button>
  );
}

const EMPTY = { lotNo: '', name: '', expiry: '', department: '', locationId: '' };

function Modal({ title, initial, locations, onSave, onClose }) {
  const [form, setForm] = useState(initial
    ? { ...initial, expiry: initial.expiry ? format(new Date(initial.expiry), 'yyyy-MM-dd') : '' }
    : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.lotNo.trim()) { setError('Lot number is required.'); return; }
    if (!form.name.trim()) { setError('Lot name is required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Lot No *</label>
              <input className="form-input" value={form.lotNo} onChange={e => set('lotNo', e.target.value)} placeholder="e.g. PX 460 H" />
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. ABX DIFFTROL" />
            </div>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input className="form-input" type="date" value={form.expiry} onChange={e => set('expiry', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Clinical Hematology" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <select className="form-select" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
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

export default function LotConfigClient({ initialLots, locations }) {
  const [lots, setLots] = useState(initialLots);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => lots.filter(r => {
    if (filterLoc && r.locationId !== filterLoc) return false;
    if (search && !r.lotNo.toLowerCase().includes(search.toLowerCase()) && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [lots, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/lots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setLots(prev => [...prev, created]);
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/lots/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setLots(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditing(null);
  }

  async function toggleActive(lot) {
    const next = !lot.active;
    const res = await fetch(`/api/config/lots/${lot.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) setLots(prev => prev.map(r => r.id === lot.id ? { ...r, active: next } : r));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lot configuration?')) return;
    const res = await fetch(`/api/config/lots/${id}`, { method: 'DELETE' });
    if (res.ok) setLots(prev => prev.filter(r => r.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr', 'Lot No', 'Name', 'Expiry', 'Location', 'Department', 'Status'];
    const rows = filtered.map((r, i) => [
      i + 1, r.lotNo, r.name,
      r.expiry ? format(new Date(r.expiry), 'dd MMM yyyy') : '',
      r.location?.name || '', r.department || '',
      r.active ? 'Active' : 'Inactive',
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'lot-config.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Lots</div>
          <div className="page-title">Lot Configuration</div>
        </div>
      </div>

      {/* Location filter + Export row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Filter by Location</div>
          <select className="form-select" value={filterLoc} onChange={e => setFilterLoc(e.target.value)} style={{ maxWidth: 400 }}>
            <option value="">All Locations</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {filterLoc ? `Viewing ${filtered.length} lot(s) for selected location` : 'Viewing data from all locations'}
          </div>
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>↓ Export</button>
      </div>

      {/* Add + Search row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add More</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lot…" style={{ width: 220, fontSize: 13 }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr', 'Lot No', 'Name', 'Expiry', 'Location', 'Department', 'Status', 'Action'].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No lot configurations found.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)', width: 50 }}>{i + 1}</td>
                  <td className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{r.lotNo}</td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {r.expiry ? format(new Date(r.expiry), 'dd MMM yyyy') : <span className="text-muted">—</span>}
                  </td>
                  <td>{r.location?.name || <span className="text-muted">—</span>}</td>
                  <td>{r.department || <span className="text-muted">—</span>}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: r.active ? 'var(--accept)' : 'var(--border-strong)',
                        color: r.active ? '#fff' : 'var(--text-muted)',
                      }}>
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                      <CanDo permission="config:edit" fallback={<Toggle checked={r.active} onChange={() => {}} disabled />}>
                        <Toggle checked={r.active} onChange={() => toggleActive(r)} />
                      </CanDo>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <CanDo permission="config:edit">
                        <button title="Edit" onClick={() => setEditing(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 15 }}>✏</button>
                      </CanDo>
                      <CanDo permission="config:delete">
                        <button title="Delete" onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 15 }}>🗑</button>
                      </CanDo>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {lots.length} lots
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Lot" locations={locations} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Lot" initial={editing} locations={locations} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
