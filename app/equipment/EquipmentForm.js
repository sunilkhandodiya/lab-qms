'use client';
// app/equipment/EquipmentForm.js

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUSES = ['ACTIVE', 'OUT_FOR_CALIBRATION', 'UNDER_MAINTENANCE', 'RETIRED'];

const EMPTY = {
  assetId: '',
  name: '',
  type: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  department: '',
  agency: '',
  frequency: '',
  contactPerson: '',
  status: 'ACTIVE',
  calibrationDue: '',
  pmDue: '',
  installedAt: '',
};

export default function EquipmentForm({ departments = [] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setError('');
    setSaving(false);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.assetId.trim() || !form.name.trim()) {
      setError('Asset ID and Name are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save equipment.');
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Add Equipment</button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-head">
                <div className="modal-title">Add Equipment</div>
                <button type="button" className="modal-close" onClick={close}>×</button>
              </div>

              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Asset ID *</label>
                    <input className="form-input" value={form.assetId} onChange={e => set('assetId', e.target.value)} placeholder="EQP-001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Auto Analyzer" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <input className="form-input" value={form.type} onChange={e => set('type', e.target.value)} placeholder="Analyzer" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input className="form-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input className="form-input" value={form.model} onChange={e => set('model', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Serial No</label>
                    <input className="form-input" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calibration Agency</label>
                    <input className="form-input" value={form.agency} onChange={e => set('agency', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Frequency</label>
                    <input className="form-input" value={form.frequency} onChange={e => set('frequency', e.target.value)} placeholder="Annual" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input className="form-input" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Installed On</label>
                    <input type="date" className="form-input" value={form.installedAt} onChange={e => set('installedAt', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Calibration Due</label>
                    <input type="date" className="form-input" value={form.calibrationDue} onChange={e => set('calibrationDue', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PM Due</label>
                    <input type="date" className="form-input" value={form.pmDue} onChange={e => set('pmDue', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn" onClick={close} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Equipment'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
