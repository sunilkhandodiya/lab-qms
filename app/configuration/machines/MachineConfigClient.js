'use client';
// app/configuration/machines/MachineConfigClient.js
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

const EMPTY = { machineCode: '', machineName: '', systemMachineName: '', locationId: '' };

function Modal({ title, initial, locations, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.machineCode.trim()) { setError('Machine code is required.'); return; }
    if (!form.machineName.trim()) { setError('Machine name is required.'); return; }
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
              <label className="form-label">Machine Code *</label>
              <input className="form-input" value={form.machineCode} onChange={e => set('machineCode', e.target.value)} placeholder="e.g. 800" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Machine Name *</label>
              <input className="form-input" value={form.machineName} onChange={e => set('machineName', e.target.value)} placeholder="e.g. DXI 800" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">System Machine Name</label>
              <input className="form-input" value={form.systemMachineName} onChange={e => set('systemMachineName', e.target.value)} placeholder="e.g. DXI_800_1" />
            </div>
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

export default function MachineConfigClient({ initialMachines, locations }) {
  const [machines, setMachines] = useState(initialMachines);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => machines.filter(m => {
    if (filterLoc && m.locationId !== filterLoc) return false;
    if (search && !m.machineName.toLowerCase().includes(search.toLowerCase()) && !m.machineCode.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [machines, filterLoc, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/config/machines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setMachines(prev => [...prev, created].sort((a, b) => a.machineName.localeCompare(b.machineName)));
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/config/machines/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setMachines(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditing(null);
  }

  async function toggleActive(machine) {
    const next = !machine.active;
    const res = await fetch(`/api/config/machines/${machine.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) setMachines(prev => prev.map(m => m.id === machine.id ? { ...m, active: next } : m));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this machine? Instruments linked to it will be unlinked.')) return;
    const res = await fetch(`/api/config/machines/${id}`, { method: 'DELETE' });
    if (res.ok) setMachines(prev => prev.filter(m => m.id !== id));
  }

  function exportCSV() {
    const headers = ['Sr No', 'Machine Id', 'Machine Code', 'Machine Name', 'System Machine Name', 'Location', 'Status'];
    const rows = filtered.map((m, i) => [i + 1, m.id, m.machineCode, m.machineName, m.systemMachineName || '', m.location?.name || 'N/A', m.active ? 'Active' : 'Inactive']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'machines.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › Machines</div>
          <div className="page-title">Machine List Configuration</div>
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
          {filterLoc ? `Viewing ${filtered.length} machine(s) for selected location` : 'Viewing data from all locations'}
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add Machine</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search machine…" style={{ width: 220, fontSize: 13 }} />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13 }}>↓ Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Sr. No', 'Machine Id', 'Machine Code', 'Machine Name', 'System Machine Name', 'Location', 'Status', 'Action'].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No machines configured.</td></tr>
              ) : filtered.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ color: 'var(--text-muted)', width: 60 }}>{i + 1}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.id}>{m.id}</td>
                  <td className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{m.machineCode}</td>
                  <td style={{ fontWeight: 500 }}>{m.machineName}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{m.systemMachineName || <span className="text-muted">—</span>}</td>
                  <td>{m.location?.name || <span className="text-muted">N/A</span>}</td>
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
          Showing {filtered.length} of {machines.length} machines
        </div>
      </div>

      {showAdd && <Modal title="＋ Add Machine" locations={locations} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <Modal title="Edit Machine" initial={editing} locations={locations} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
