'use client';
// app/configuration/instruments/InstrumentConfigClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';

const EMPTY = { name: '', manufacturer: '', group: '', model: '', lisMachineId: '', locationId: '' };

function Modal({ title, initial, locations, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) { setError('Instrument name is required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Instrument Name *</label>
            <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sysmex XN-1000" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input className="form-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. BECKMAN" />
            </div>
            <div className="form-group">
              <label className="form-label">Group / Serial No.</label>
              <input className="form-input" value={form.group} onChange={e => set('group', e.target.value)} placeholder="e.g. SN-17258" />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. 5800" />
            </div>
            <div className="form-group">
              <label className="form-label">LIS Machine ID</label>
              <input className="form-input" value={form.lisMachineId} onChange={e => set('lisMachineId', e.target.value)} placeholder="e.g. INST-001" />
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

export default function InstrumentConfigClient({ initialInstruments, locations }) {
  const [records, setRecords] = useState(initialInstruments);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => records.filter(r => {
    if (filterLoc && r.locationId !== filterLoc) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.manufacturer?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [records, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/instruments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setRecords(prev => [...prev, created]);
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/instruments/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this instrument configuration?')) return;
    const res = await fetch(`/api/config/instruments/${id}`, { method: 'DELETE' });
    if (res.ok) setRecords(prev => prev.filter(r => r.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr No', 'Instrument Name', 'Manufacturer', 'Group', 'Model', 'Location', 'LIS Machine ID'];
    const rows = filtered.map((r, i) => [i + 1, r.name, r.manufacturer || '', r.group || '', r.model || '', r.location?.name || '', r.lisMachineId || '']);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'instruments.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Instruments</div>
          <div className="page-title">Instrument Configuration</div>
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
          {filterLoc ? `Viewing ${filtered.length} instrument(s) for selected location` : 'Viewing data from all locations'}
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add More</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search instrument…" style={{ width: 220, fontSize: 13 }} />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13 }}>↓ Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr No', 'Instrument Name', 'Manufacturer', 'Group', 'Model', 'Location', 'LIS Machine ID', ''].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No instruments configured.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text-muted)', width: 60 }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td>{r.manufacturer || <span className="text-muted">—</span>}</td>
                  <td>{r.group || <span className="text-muted">—</span>}</td>
                  <td>{r.model || <span className="text-muted">—</span>}</td>
                  <td>
                    {r.location
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>📍 {r.location.name}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.lisMachineId || 'N/A'}</td>
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
          Showing {filtered.length} of {records.length} instruments
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Instrument" locations={locations} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Instrument" initial={editing} locations={locations} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
