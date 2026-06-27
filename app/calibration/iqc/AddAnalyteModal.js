'use client';
// app/calibration/iqc/AddAnalyteModal.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanDo } from '@/components/RoleGuard';

const EMPTY_LEVEL = { levelName: '', lotNumber: '', expiryDate: '', mean: '', sd: '' };

function LevelRow({ index, level, onChange, onRemove }) {
  function set(k, v) { onChange({ ...level, [k]: v }); }
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', position: 'relative' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Level {index + 1}</div>
      <button type="button" onClick={onRemove}
        style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', fontSize: 16, lineHeight: 1 }}>×</button>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Level name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
          <input className="form-input" value={level.levelName} onChange={e => set('levelName', e.target.value)} placeholder="e.g. Level 1 Normal" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Lot number</label>
          <input className="form-input" value={level.lotNumber} onChange={e => set('lotNumber', e.target.value)} placeholder="e.g. 2024-001" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Mean <span style={{ color: 'var(--accent-red)' }}>*</span></label>
          <input className="form-input" type="number" value={level.mean} onChange={e => set('mean', e.target.value)} placeholder="0.00" style={{ fontSize: 12 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>SD <span style={{ color: 'var(--accent-red)' }}>*</span></label>
          <input className="form-input" type="number" value={level.sd} onChange={e => set('sd', e.target.value)} placeholder="0.00" style={{ fontSize: 12 }} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Expiry date</label>
        <input className="form-input" type="date" value={level.expiryDate} onChange={e => set('expiryDate', e.target.value)} style={{ fontSize: 12 }} />
      </div>
    </div>
  );
}

function Modal({ locations, onClose }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', unit: '', method: '', department: '', instrument: '', locationId: '', mean: '', sd: '', cv: '' });
  const [levels, setLevels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addLevel() { setLevels(ls => [...ls, { ...EMPTY_LEVEL }]); }
  function removeLevel(i) { setLevels(ls => ls.filter((_, idx) => idx !== i)); }
  function updateLevel(i, lv) { setLevels(ls => ls.map((l, idx) => idx === i ? lv : l)); }

  async function handleSave() {
    setError('');
    if (!form.name.trim() || !form.unit.trim() || form.mean === '' || form.sd === '') {
      setError('Analyte name, unit, mean, and SD are required.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/qc-analytes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, levels }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'Failed to save.');
      setSaving(false);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, width: '100%', maxWidth: 600 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>＋ Add QC Test</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 20 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: 'var(--accent-red)' }}>{error}</div>
          )}

          {/* Analyte name + unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Analyte name <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Haemoglobin" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Unit <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" value={form.unit} onChange={e => setF('unit', e.target.value)} placeholder="e.g. g/dL" />
            </div>
          </div>

          {/* Method + Department */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Method</label>
              <input className="form-input" value={form.method} onChange={e => setF('method', e.target.value)} placeholder="e.g. Cyanmethaemoglobin" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Department</label>
              <input className="form-input" value={form.department} onChange={e => setF('department', e.target.value)} placeholder="e.g. Haematology" />
            </div>
          </div>

          {/* Instrument + Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Instrument</label>
              <input className="form-input" value={form.instrument} onChange={e => setF('instrument', e.target.value)} placeholder="e.g. Sysmex XN-1000" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Location</label>
              <select className="form-select" value={form.locationId} onChange={e => setF('locationId', e.target.value)} style={{ color: form.locationId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Mean + SD + CV */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Mean <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" type="number" value={form.mean} onChange={e => setF('mean', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>SD <span style={{ color: 'var(--accent-red)' }}>*</span></label>
              <input className="form-input" type="number" value={form.sd} onChange={e => setF('sd', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>CV%</label>
              <input className="form-input" type="number" value={form.cv} onChange={e => setF('cv', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {/* Levels section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>QC LEVELS</span>
              <button type="button" onClick={addLevel}
                style={{ fontSize: 12, color: 'var(--accent-blue)', background: 'none', border: '1px solid var(--accent-blue)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                ＋ Add Level
              </button>
            </div>
            {levels.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 8 }}>
                No levels added — you can add levels later from the analyte view.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {levels.map((lv, i) => (
                <LevelRow key={i} index={i} level={lv} onChange={v => updateLevel(i, v)} onRemove={() => removeLevel(i)} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function AddAnalyteButton({ locations }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CanDo permission="iqc:add_analyte">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>＋ Add QC Test</button>
      </CanDo>
      {open && <Modal locations={locations} onClose={() => setOpen(false)} />}
    </>
  );
}
