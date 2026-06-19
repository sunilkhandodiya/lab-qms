'use client';
// app/master/MasterForms.js — Master Data add-modals (CRUD-lite)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanDo } from '@/components/RoleGuard';

// Generic modal-form shell shared by all master add-forms.
function MasterModal({ buttonLabel, title, type, fields, validate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function close() {
    setOpen(false);
    setForm({});
    setError('');
    setSaving(false);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    const msg = validate ? validate(form) : '';
    if (msg) { setError(msg); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save.');
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <CanDo permission="master:edit">
      <button className="btn btn-primary" onClick={() => setOpen(true)}>{buttonLabel}</button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-head">
                <div className="modal-title">{title}</div>
                <button type="button" className="modal-close" onClick={close}>×</button>
              </div>

              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                {fields.map(f => (
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
                    {f.type === 'select' ? (
                      <select
                        className="form-select"
                        value={form[f.key] || ''}
                        onChange={e => set(f.key, e.target.value)}
                      >
                        <option value="">{f.placeholder || 'Select…'}</option>
                        {f.options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        className="form-textarea"
                        value={form[f.key] || ''}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    ) : (
                      <input
                        className="form-input"
                        value={form[f.key] || ''}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CanDo>
  );
}

export function AddState() {
  return (
    <MasterModal
      buttonLabel="+ Add State"
      title="Add State"
      type="state"
      fields={[
        { key: 'name', label: 'State Name', required: true, placeholder: 'Maharashtra' },
        { key: 'code', label: 'Code', placeholder: 'MH' },
      ]}
      validate={f => (!f.name?.trim() ? 'State name is required.' : '')}
    />
  );
}

export function AddCentre({ states = [] }) {
  return (
    <MasterModal
      buttonLabel="+ Add Centre"
      title="Add Centre"
      type="location"
      fields={[
        { key: 'name', label: 'Centre Name', required: true, placeholder: 'Central Lab' },
        { key: 'code', label: 'Code', placeholder: 'CL-01' },
        {
          key: 'stateId',
          label: 'State',
          type: 'select',
          placeholder: 'Select state…',
          options: states.map(s => ({ value: s.id, label: s.name })),
        },
        { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Street, city, pincode' },
      ]}
      validate={f => (!f.name?.trim() ? 'Centre name is required.' : '')}
    />
  );
}

export function AddDepartment() {
  return (
    <MasterModal
      buttonLabel="+ Add Department"
      title="Add Department"
      type="department"
      fields={[
        { key: 'name', label: 'Department Name', required: true, placeholder: 'Biochemistry' },
      ]}
      validate={f => (!f.name?.trim() ? 'Department name is required.' : '')}
    />
  );
}

export function AddInstrument({ locations = [] }) {
  return (
    <MasterModal
      buttonLabel="+ Add Instrument"
      title="Add Instrument"
      type="instrument"
      fields={[
        { key: 'name', label: 'Instrument Name', required: true, placeholder: 'Cobas c311' },
        {
          key: 'locationId',
          label: 'Centre',
          type: 'select',
          required: true,
          placeholder: 'Select centre…',
          options: locations.map(l => ({ value: l.id, label: l.name })),
        },
      ]}
      validate={f => {
        if (!f.name?.trim()) return 'Instrument name is required.';
        if (!f.locationId) return 'Centre is required.';
        return '';
      }}
    />
  );
}
