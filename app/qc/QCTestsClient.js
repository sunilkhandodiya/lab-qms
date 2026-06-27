'use client';
// app/qc/QCTestsClient.js
import { CanDo } from '@/components/RoleGuard';
import { useState, useMemo } from 'react';

// ── Reusable creatable dropdown ───────────────────────────────────────────────
function CreatableSelect({ label, required, options = [], value, onChange, onCreateAndSelect, disabled, placeholder, hint }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const canCreate = search.trim() && !options.some(o => o.name.toLowerCase() === search.trim().toLowerCase());
  const selected = options.find(o => o.id === value);

  async function handleCreate() {
    const name = search.trim();
    if (!name) return;
    const created = await onCreateAndSelect(name);
    if (created) { onChange(created.id); setSearch(''); setOpen(false); }
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label} {required && <span style={{ color: 'var(--accent-red)' }}>*</span>}</label>}
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
        style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: `1px solid ${open ? 'var(--accent-blue)' : 'var(--border)'}`, borderRadius: 'var(--radius)', color: selected ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-sans)', opacity: disabled ? 0.5 : 1 }}>
        <span>{selected ? selected.name : placeholder || `Select ${label}`}</span>
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); if (e.key === 'Escape') setOpen(false); }}
              placeholder="Search or type to add..."
              style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }} />
          </div>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {filtered.length === 0 && !canCreate && <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No options found</div>}
            {filtered.map(o => (
              <div key={o.id} onClick={() => { onChange(o.id); setSearch(''); setOpen(false); }}
                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, background: value === o.id ? 'rgba(59,130,246,0.1)' : 'transparent', color: value === o.id ? 'var(--accent-blue)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = value === o.id ? 'rgba(59,130,246,0.1)' : 'transparent'}>
                {value === o.id && <span style={{ fontSize: 10 }}>✓</span>}{o.name}
              </div>
            ))}
          </div>
          {canCreate && (
            <div onClick={handleCreate}
              style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span>＋</span> Add &ldquo;{search.trim()}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add QC Test Modal ─────────────────────────────────────────────────────────
function AddQCTestModal({ master, onMasterUpdate, onClose, onSaved }) {
  const [form, setForm] = useState({ testCode: '', testName: '', method: '', unit: '', locationId: '', instrumentId: '', departmentName: '', lot1Id: '', lot2Id: '', lot3Id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const locInstruments = master.instruments.filter(i => i.locationId === form.locationId);
  const locLots        = master.lots.filter(l => l.locationId === form.locationId);

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'locationId') { next.instrumentId = ''; next.lot1Id = ''; next.lot2Id = ''; next.lot3Id = ''; }
      return next;
    });
  }

  async function createMaster(type, name, locationId) {
    const res = await fetch('/api/qc-master', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name, locationId }) });
    if (!res.ok) return null;
    const record = await res.json();
    onMasterUpdate(type, record);
    return record;
  }

  async function handleSave() {
    if (!form.locationId || !form.testCode || !form.testName || !form.instrumentId) { setError('Location, Test Code, Test Name, and Instrument are required.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/qc-tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save.'); setSaving(false); return; }
    onSaved(await res.json());
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 580 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>＋ Add QC Test</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '65vh' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)' }}>{error}</div>}
          <CreatableSelect label="Location" required options={master.locations} value={form.locationId} onChange={v => set('locationId', v)} onCreateAndSelect={n => createMaster('location', n)} placeholder="Select location" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Test name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" value={form.testName} onChange={e => set('testName', e.target.value)} placeholder="e.g. Absolute Basophil Count" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Test code <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" value={form.testCode} onChange={e => set('testCode', e.target.value)} placeholder="e.g. HEM-006" />
            </div>
          </div>
          <CreatableSelect label="Instrument" required options={locInstruments} value={form.instrumentId} onChange={v => set('instrumentId', v)} onCreateAndSelect={n => createMaster('instrument', n, form.locationId)} disabled={!form.locationId} hint={!form.locationId ? 'Please select a location first' : ''} placeholder="Select instrument" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Method</label>
              <input className="form-input" value={form.method} onChange={e => set('method', e.target.value)} placeholder="e.g. Calculated" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Unit</label>
              <input className="form-input" value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. 10^3/UL" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Department</label>
            <select className="form-select" value={form.departmentName} onChange={e => set('departmentName', e.target.value)}>
              <option value="">Select department</option>
              {master.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <CreatableSelect label="Lot 1" options={locLots} value={form.lot1Id} onChange={v => set('lot1Id', v)} onCreateAndSelect={n => createMaster('lot', n, form.locationId)} disabled={!form.locationId} hint={!form.locationId ? 'Please select a location first' : ''} placeholder="Select lot" />
            <CreatableSelect label="Lot 2" options={locLots} value={form.lot2Id} onChange={v => set('lot2Id', v)} onCreateAndSelect={n => createMaster('lot', n, form.locationId)} disabled={!form.locationId} placeholder="Select lot" />
          </div>
          <CreatableSelect label="Lot 3" options={locLots} value={form.lot3Id} onChange={v => set('lot3Id', v)} onCreateAndSelect={n => createMaster('lot', n, form.locationId)} disabled={!form.locationId} placeholder="Select lot" />
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Add QC Profile Modal ──────────────────────────────────────────────────────
function AddQCProfileModal({ master, onClose, onSaved }) {
  const [profileName, setProfileName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!profileName.trim()) { setError('Profile name is required.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/qc-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileName: profileName.trim(), departmentName: departmentName || null, locationId: locationId || null }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save.'); setSaving(false); return; }
    onSaved(await res.json());
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 560 }}>
        <div style={{ padding: '24px 28px 20px' }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>＋ Add QC Profile</div>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)', marginBottom: 16 }}>{error}</div>}

          {/* Profile Name */}
          <div style={{ marginBottom: 16 }}>
            <input
              className="form-input"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Profile Name *"
              style={{ fontSize: 15, padding: '14px 16px' }}
            />
          </div>

          {/* Department */}
          <div style={{ marginBottom: 16 }}>
            <select
              className="form-select"
              value={departmentName}
              onChange={e => setDepartmentName(e.target.value)}
              style={{ fontSize: 14, padding: '14px 16px', color: departmentName ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Department</option>
              {master.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          {/* Location */}
          <div style={{ marginBottom: 8 }}>
            <select
              className="form-select"
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              style={{ fontSize: 14, padding: '14px 16px', color: locationId ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              <option value="">Location</option>
              {master.locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ color: 'var(--accent-blue)' }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '8px 28px' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QC Profile Table ──────────────────────────────────────────────────────────
function QCProfileTab({ initialProfiles, master }) {
  const [profiles, setProfiles]   = useState(initialProfiles);
  const [showModal, setModal]     = useState(false);
  const [fName, setFName]         = useState('');
  const [fDept, setFDept]         = useState('');

  const filtered = profiles.filter(p =>
    (!fName || p.profileName.toLowerCase().includes(fName.toLowerCase())) &&
    (!fDept || p.department?.name.toLowerCase().includes(fDept.toLowerCase()))
  );

  async function toggleStatus(profile) {
    const next = profile.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    const res = await fetch(`/api/qc-profiles/${profile.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
    });
    if (res.ok) setProfiles(ps => ps.map(p => p.id === profile.id ? { ...p, status: next } : p));
  }

  async function deleteProfile(id) {
    if (!confirm('Delete this profile?')) return;
    const res = await fetch(`/api/qc-profiles/${id}`, { method: 'DELETE' });
    if (res.ok) setProfiles(ps => ps.filter(p => p.id !== id));
  }

  const ActionBtn = ({ icon, color, title, onClick }) => (
    <button onClick={onClick} title={title} style={{ background: 'none', border: 'none', cursor: 'pointer', color: color || 'var(--text-secondary)', fontSize: 16, padding: '2px 4px', lineHeight: 1 }}>{icon}</button>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>QC Profiles</h2>
        <CanDo permission="qc:add_profile"><button className="btn btn-primary" onClick={() => setModal(true)}>＋ Add Profile</button></CanDo>
      </div>

      {/* Search filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input className="form-input" value={fName} onChange={e => setFName(e.target.value)} placeholder="Filter by profile name..." style={{ paddingLeft: 32, fontSize: 13 }} />
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input className="form-input" value={fDept} onChange={e => setFDept(e.target.value)} placeholder="Filter by department..." style={{ paddingLeft: 32, fontSize: 13 }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {['Sr. No.', '', 'Profile Name', 'Department', 'Location', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12, textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No profiles found</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', width: 60 }}>{i + 1}</td>
                  <td style={{ padding: '14px 8px', width: 32 }}>
                    <span style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>▾</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500 }}>{p.profileName}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{p.department?.name || '—'}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{p.location?.name || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ color: p.status === 'ENABLED' ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 500, fontSize: 13 }}>
                      {p.status === 'ENABLED' ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <ActionBtn icon="✏️" title="Edit" color="var(--accent-blue)" onClick={() => {}} />
                      <ActionBtn icon="➕" title="Add test" color="var(--accent-blue)" onClick={() => {}} />
                      <ActionBtn icon="📋" title="View tests" color="var(--accent-blue)" onClick={() => {}} />
                      <ActionBtn icon={p.status === 'ENABLED' ? '🟢' : '⚫'} title="Toggle status" onClick={() => toggleStatus(p)} />
                      <ActionBtn icon="📅" title="Schedule" color="var(--accent-amber)" onClick={() => {}} />
                      <ActionBtn icon="🗑️" title="Delete" color="var(--accent-red)" onClick={() => deleteProfile(p.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
          Showing {filtered.length} of {profiles.length} profiles
        </div>
      </div>

      {showModal && (
        <AddQCProfileModal
          master={master}
          onClose={() => setModal(false)}
          onSaved={p => { setProfiles(prev => [...prev, p]); setModal(false); }}
        />
      )}
    </div>
  );
}

// ── Top filters bar (shared between tabs) ─────────────────────────────────────
function TopFilters({ master, fLocation, setFLocation, fEquipment, setFEquipment, fAnalyte, setFAnalyte, fStatus, setFStatus, tests, onExport }) {
  return (
    <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {[
        { label: 'Location',  value: fLocation,  onChange: setFLocation,  options: master.locations,  all: 'All Locations' },
        { label: 'Equipment', value: fEquipment, onChange: setFEquipment, options: master.instruments, all: 'All Equipment' },
        { label: 'Analyte',   value: fAnalyte,   onChange: setFAnalyte,   options: [...new Set(tests.map(t => t.testName))].map(n => ({ id: n, name: n })), all: 'All Analytes' },
      ].map(({ label, value, onChange, options, all }) => (
        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150, flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</label>
          <select value={value} onChange={e => onChange(e.target.value)} className="form-select" style={{ fontSize: 12 }}>
            <option value="">{all}</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150, flex: 1 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Status</label>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="form-select" style={{ fontSize: 12 }}>
          <option value="">All Tests</option>
          <option value="hasResult">Has Result</option>
          <option value="noResult">No Result</option>
        </select>
      </div>
      <button className="btn btn-ghost" onClick={onExport} style={{ fontSize: 12, alignSelf: 'flex-end' }}>↓ Export</button>
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────
export default function QCTestsClient({ initialTests, initialProfiles, initialMaster }) {
  const [tests, setTests]   = useState(initialTests);
  const [master, setMaster] = useState(initialMaster);

  function handleMasterUpdate(type, record) {
    const key = type === 'lot' ? 'lots' : type === 'instrument' ? 'instruments' : type + 's';
    setMaster(m => {
      const list = m[key] || [];
      if (list.find(x => x.id === record.id)) return m;
      return { ...m, [key]: [...list, record] };
    });
  }
  const [tab, setTab]     = useState('tests');
  const [showModal, setModal] = useState(false);

  // Shared top filters
  const [fLocation,  setFLocation]  = useState('');
  const [fEquipment, setFEquipment] = useState('');
  const [fAnalyte,   setFAnalyte]   = useState('');
  const [fStatus,    setFStatus]    = useState('');

  // QC Test column filters
  const [fName,   setFName]   = useState('');
  const [fDept,   setFDept]   = useState('');
  const [fMethod, setFMethod] = useState('');
  const [fUnit,   setFUnit]   = useState('');
  const [fInst,   setFInst]   = useState('');
  const [fLot,    setFLot]    = useState('');
  const [fLoc,    setFLoc]    = useState('');

  const filtered = useMemo(() => tests.filter(t => {
    if (fLocation  && t.location?.id !== fLocation) return false;
    if (fEquipment && t.instrument?.id !== fEquipment) return false;
    if (fAnalyte   && t.testName !== fAnalyte) return false;
    if (fStatus === 'hasResult' && !t.hasResult) return false;
    if (fStatus === 'noResult'  && t.hasResult)  return false;
    if (fName   && !t.testName.toLowerCase().includes(fName.toLowerCase())) return false;
    if (fDept   && !t.department?.name.toLowerCase().includes(fDept.toLowerCase())) return false;
    if (fMethod && !t.method?.toLowerCase().includes(fMethod.toLowerCase())) return false;
    if (fUnit   && !t.unit?.toLowerCase().includes(fUnit.toLowerCase())) return false;
    if (fInst   && !t.instrument?.name.toLowerCase().includes(fInst.toLowerCase())) return false;
    if (fLot    && ![t.lot1?.name, t.lot2?.name, t.lot3?.name].filter(Boolean).some(l => l.toLowerCase().includes(fLot.toLowerCase()))) return false;
    if (fLoc    && !t.location?.name.toLowerCase().includes(fLoc.toLowerCase())) return false;
    return true;
  }), [tests, fLocation, fEquipment, fAnalyte, fStatus, fName, fDept, fMethod, fUnit, fInst, fLot, fLoc]);

  function exportCSV() {
    const headers = ['Sr','Code','Test Name','Department','Method','Unit','Instrument','Lot1','Lot2','Lot3','Location','Has Result','Active'];
    const rows = filtered.map((t, i) => [i+1, t.testCode, t.testName, t.department?.name||'', t.method||'', t.unit||'', t.instrument?.name||'', t.lot1?.name||'', t.lot2?.name||'', t.lot3?.name||'', t.location?.name||'', t.hasResult, t.active]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `qc-tests-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const FilterInput = ({ value, onChange }) => (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder="Filter..."
      style={{ width: '100%', marginTop: 4, padding: '4px 6px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }} />
  );

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginRight: 16 }}>Dashboard</h1>
          {['tests', 'profile'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: tab === t ? '2px solid var(--accent-blue)' : '2px solid transparent' }}>
              {t === 'tests' ? 'QC Test' : 'QC Profile'}
            </button>
          ))}
        </div>
        {tab === 'tests' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <CanDo permission="qc:add_test"><button className="btn btn-primary" onClick={() => setModal(true)}>＋ Add New QC Test</button></CanDo>
            <button className="btn btn-ghost" style={{ fontSize: 12 }}>⚙ Target Configuration</button>
          </div>
        )}
      </div>

      {/* Shared top filters */}
      <TopFilters master={master} fLocation={fLocation} setFLocation={setFLocation} fEquipment={fEquipment} setFEquipment={setFEquipment} fAnalyte={fAnalyte} setFAnalyte={setFAnalyte} fStatus={fStatus} setFStatus={setFStatus} tests={tests} onExport={exportCSV} />

      {/* QC Test tab */}
      {tab === 'tests' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Sr. No.', '', 'Test Name', 'Department', 'Method', 'Unit', 'Instrument', 'Lot 1', 'Lot 2', 'Lot 3', 'Location', 'Has Result', 'Active'].map((h, i) => (
                    <th key={i} style={{ padding: '10px 10px 4px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 11, textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td colSpan={2} style={{ padding: '4px 10px' }}></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fName}   onChange={setFName} /></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fDept}   onChange={setFDept} /></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fMethod} onChange={setFMethod} /></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fUnit}   onChange={setFUnit} /></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fInst}   onChange={setFInst} /></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fLot}    onChange={setFLot} /></td>
                  <td colSpan={2} style={{ padding: '4px 6px' }}></td>
                  <td style={{ padding: '4px 6px' }}><FilterInput value={fLoc}    onChange={setFLoc} /></td>
                  <td colSpan={2}></td>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={13} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No QC tests found</td></tr>
                ) : filtered.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 10px', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '9px 6px' }}><input type="checkbox" /></td>
                    <td style={{ padding: '9px 10px', fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.testName}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>{t.department?.name || '—'}</td>
                    <td style={{ padding: '9px 10px' }}>{t.method || '—'}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.unit || '—'}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--text-secondary)', fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.instrument?.name || '—'}</td>
                    {[t.lot1, t.lot2, t.lot3].map((lot, li) => (
                      <td key={li} style={{ padding: '9px 10px' }}>
                        {lot ? <span style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: 'var(--font-mono)' }}>{lot.name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    ))}
                    <td style={{ padding: '9px 10px', fontSize: 12 }}>📍 {t.location?.name || '—'}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}>{t.hasResult ? <span style={{ color: 'var(--accent-green)', fontSize: 16 }}>✓</span> : <span style={{ color: 'var(--accent-red)', fontSize: 14 }}>✗</span>}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'center' }}><span style={{ color: 'var(--accent-blue)', opacity: t.active ? 1 : 0.3, fontSize: 16 }}>⏻</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Showing {filtered.length} of {tests.length} tests
          </div>
        </div>
      )}

      {/* QC Profile tab */}
      {tab === 'profile' && (
        <QCProfileTab initialProfiles={initialProfiles} master={master} />
      )}

      {/* Add QC Test Modal */}
      {showModal && (
        <AddQCTestModal master={master} onClose={() => setModal(false)} onSaved={t => setTests(prev => [...prev, t])} />
      )}
    </div>
  );
}
