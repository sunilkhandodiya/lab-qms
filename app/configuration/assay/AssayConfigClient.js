'use client';
// app/configuration/assay/AssayConfigClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';

const EMPTY = { analyte: '', department: '', method: '', unit: '', reagentSupplier: '', temperature: '', locationId: '' };

function Modal({ title, initial, locations, departments, methods, onSave, onClose }) {
  const [form, setForm] = useState(initial ? { ...initial, temperature: initial.temperature ?? '' } : EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.analyte.trim()) { setError('Analyte name is required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Analyte Name *</label>
            <input className="form-input" value={form.analyte} onChange={e => set('analyte', e.target.value)} placeholder="e.g. D-Dimer" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                <option value="">Select method</option>
                {methods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. g/dL" />
            </div>
            <div className="form-group">
              <label className="form-label">Reagent Supplier</label>
              <input className="form-input" value={form.reagentSupplier} onChange={e => set('reagentSupplier', e.target.value)} placeholder="e.g. ZYBIO" />
            </div>
            <div className="form-group">
              <label className="form-label">Temperature (°C)</label>
              <input className="form-input" type="number" value={form.temperature} onChange={e => set('temperature', e.target.value)} placeholder="e.g. 37" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.locationId} onChange={e => set('locationId', e.target.value)}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
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

export default function AssayConfigClient({ initialAssays, locations, departments, methods }) {
  const [records, setRecords] = useState(initialAssays);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => records.filter(r => {
    if (filterLoc && r.locationId !== filterLoc) return false;
    if (search && !r.analyte.toLowerCase().includes(search.toLowerCase()) && !r.department?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [records, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/assay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setRecords(prev => [...prev, created]);
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/assay/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this assay configuration?')) return;
    const res = await fetch(`/api/config/assay/${id}`, { method: 'DELETE' });
    if (res.ok) setRecords(prev => prev.filter(r => r.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr No', 'Analyte', 'Department', 'Method', 'Unit', 'Reagent Supplier', 'Temperature', 'Location'];
    const rows = filtered.map((r, i) => [i + 1, r.analyte, r.department || '', r.method || '', r.unit || '', r.reagentSupplier || '', r.temperature ?? '', r.location?.name || '']);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'assay-config.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Assay</div>
          <div className="page-title">Assay Configuration</div>
        </div>
      </div>

      {/* Location filter */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Filter by Location</div>
        <select className="form-select" value={filterLoc} onChange={e => setFilterLoc(e.target.value)} style={{ maxWidth: 400 }}>
          <option value="">All Locations</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {filterLoc ? `Viewing ${filtered.length} assay(s) for selected location` : 'Viewing data from all locations'}
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add More</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search analyte…" style={{ width: 220, fontSize: 13 }} />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13 }}>↓ Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr No', 'Analyte', 'Department', 'Method', 'Unit', 'Reagent Supplier', 'Temperature', 'Location', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No assay configurations found.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)', width: 60 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{r.analyte}</td>
                  <td>{r.department || <span className="text-muted">—</span>}</td>
                  <td>{r.method || <span className="text-muted">—</span>}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.unit || <span className="text-muted">—</span>}</td>
                  <td>{r.reagentSupplier || <span className="text-muted">—</span>}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.temperature != null ? r.temperature : <span className="text-muted">—</span>}</td>
                  <td>{r.location?.name || <span className="text-muted">—</span>}</td>
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
          Showing {filtered.length} of {records.length} assays
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Assay" locations={locations} departments={departments} methods={methods} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Assay" initial={editing} locations={locations} departments={departments} methods={methods} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
