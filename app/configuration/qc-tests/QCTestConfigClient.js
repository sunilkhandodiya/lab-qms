'use client';
// app/configuration/qc-tests/QCTestConfigClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';

// ── Lot badge colors (cycle through 3 green shades) ─────────────────────────
const LOT_COLORS = [
  { bg: '#16a34a', text: '#fff' },
  { bg: '#22c55e', text: '#fff' },
  { bg: '#4ade80', text: '#166534' },
];

function LotBadge({ name, index }) {
  const c = LOT_COLORS[index % LOT_COLORS.length];
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', background: c.bg, color: c.text, marginRight: 4 }}>
      {name}
    </span>
  );
}

// ── Minimal toggle switch ────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      role="switch" aria-checked={checked} disabled={disabled} onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: disabled ? 'default' : 'pointer', padding: 2,
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

// ── Creatable dropdown (reuse from QCTestsClient pattern) ────────────────────
function SimpleSelect({ label, required, options, value, onChange, placeholder }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      <select className="form-select" value={value || ''} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder || `Select ${label}`}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );
}

// ── Add/Edit modal ───────────────────────────────────────────────────────────
function TestModal({ title, initial, master, onSave, onClose }) {
  const init = initial ? {
    testCode: initial.testCode || '', testName: initial.testName || '', method: initial.method || '',
    unit: initial.unit || '', locationId: initial.locationId || '', instrumentId: initial.instrumentId || '',
    departmentId: initial.departmentId || '', lot1Id: initial.lot1Id || '', lot2Id: initial.lot2Id || '', lot3Id: initial.lot3Id || '',
  } : { testCode: '', testName: '', method: '', unit: '', locationId: '', instrumentId: '', departmentId: '', lot1Id: '', lot2Id: '', lot3Id: '' };

  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'locationId') { next.instrumentId = ''; next.lot1Id = ''; next.lot2Id = ''; next.lot3Id = ''; }
      return next;
    });
  }

  const locInstruments = master.instruments.filter(i => i.locationId === form.locationId);
  const locLots        = master.lots.filter(l => l.locationId === form.locationId);

  async function handleSave() {
    if (!form.testCode.trim() || !form.testName.trim()) { setError('Test code and test name are required.'); return; }
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
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Test Name *</label>
              <input className="form-input" value={form.testName} onChange={e => set('testName', e.target.value)} placeholder="e.g. Haemoglobin" />
            </div>
            <div className="form-group">
              <label className="form-label">Test Code *</label>
              <input className="form-input" value={form.testCode} onChange={e => set('testCode', e.target.value)} placeholder="e.g. HEM-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Method</label>
              <input className="form-input" value={form.method} onChange={e => set('method', e.target.value)} placeholder="e.g. Calculated" />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. g/dL" />
            </div>
          </div>
          <SimpleSelect label="Location" options={master.locations} value={form.locationId} onChange={v => set('locationId', v)} placeholder="Select location" />
          <SimpleSelect label="Instrument" options={locInstruments} value={form.instrumentId} onChange={v => set('instrumentId', v)} placeholder={!form.locationId ? 'Select location first' : 'Select instrument'} />
          <SimpleSelect label="Department" options={master.departments} value={form.departmentId} onChange={v => set('departmentId', v)} placeholder="Select department" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <SimpleSelect label="Lot 1" options={locLots} value={form.lot1Id} onChange={v => set('lot1Id', v)} placeholder="Select lot" />
            <SimpleSelect label="Lot 2" options={locLots} value={form.lot2Id} onChange={v => set('lot2Id', v)} placeholder="Select lot" />
            <SimpleSelect label="Lot 3" options={locLots} value={form.lot3Id} onChange={v => set('lot3Id', v)} placeholder="Select lot" />
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

// ── Main component ───────────────────────────────────────────────────────────
export default function QCTestConfigClient({ initialTests, locations, master }) {
  const [tests, setTests] = useState(initialTests);
  const [filterLoc, setFilterLoc] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => tests.filter(t => {
    if (filterLoc && t.locationId !== filterLoc) return false;
    if (search && !t.testName.toLowerCase().includes(search.toLowerCase()) && !t.testCode?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [tests, filterLoc, search]);

  async function toggleActive(test) {
    const next = !test.active;
    const res = await fetch(`/api/qc-tests/${test.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: next }) });
    if (res.ok) setTests(prev => prev.map(t => t.id === test.id ? { ...t, active: next } : t));
  }

  async function handleAdd(form) {
    const res = await fetch('/api/qc-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const created = await res.json();
    setTests(prev => [...prev, created]);
    setShowAdd(false);
  }

  async function handleEdit(form) {
    const res = await fetch(`/api/qc-tests/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error || 'Failed to save.'; }
    const updated = await res.json();
    setTests(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this QC test? This cannot be undone.')) return;
    const res = await fetch(`/api/qc-tests/${id}`, { method: 'DELETE' });
    if (res.ok) setTests(prev => prev.filter(t => t.id !== id));
  }

  function exportCSV() {
    const headers = ['Test Code', 'Test Name', 'Lot 1', 'Lot 2', 'Lot 3', 'Location', 'Active'];
    const rows = filtered.map(t => [t.testCode || 'N/A', t.testName, t.lot1?.name || '', t.lot2?.name || '', t.lot3?.name || '', t.location?.name || '', t.active]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv); a.download = 'qc-tests.csv'; a.click();
  }

  const ActionBtn = ({ icon, color, title, onClick }) => (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color: color || 'var(--text-secondary)', fontSize: 16, padding: '2px 4px', lineHeight: 1 }}>
      {icon}
    </button>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Configuration › QC Tests</div>
          <div className="page-title">QC Test Configuration</div>
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
          {filterLoc ? `Viewing ${filtered.length} test(s) for selected location` : 'Viewing data from all locations'}
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CanDo permission="config:add">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>＋ Add New QC Test</button>
          </CanDo>
          <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search test…" style={{ width: 220, fontSize: 13 }} />
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize: 13 }}>↓ Export</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Test Code', 'Test Name', 'Lots', 'Location', 'Status', 'Action'].map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No QC tests found.</td></tr>
              ) : filtered.map(t => {
                const lots = [t.lot1, t.lot2, t.lot3].filter(Boolean);
                return (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.testCode || 'N/A'}</td>
                    <td style={{ fontWeight: 500 }}>{t.testName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        {lots.map((lot, i) => <LotBadge key={lot.id} name={lot.name} index={i} />)}
                        {lots.length === 0 && <span className="text-muted">—</span>}
                        {lots.length > 0 && (
                          <span title="Lot info" style={{ color: 'var(--text-muted)', cursor: 'help', fontSize: 14 }}>ⓘ</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {t.location
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>📍 {t.location.name}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.active ? 'var(--accept)' : 'var(--text-muted)' }}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                        <CanDo
                          permission="config:edit"
                          fallback={<Toggle checked={t.active} onChange={() => {}} disabled />}
                        >
                          <Toggle checked={t.active} onChange={() => toggleActive(t)} />
                        </CanDo>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <CanDo permission="config:edit">
                          <ActionBtn icon="✏" color="var(--accent-blue)" title="Edit" onClick={() => setEditing(t)} />
                        </CanDo>
                        <CanDo permission="config:delete">
                          <ActionBtn icon="🗑" color="var(--accent-red)" title="Delete" onClick={() => handleDelete(t.id)} />
                        </CanDo>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {tests.length} tests
        </div>
      </div>

      {showAdd && <TestModal title="＋ Add New QC Test" master={master} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <TestModal title="Edit QC Test" initial={editing} master={master} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
