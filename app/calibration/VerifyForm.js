'use client';
// app/calibration/VerifyForm.js
// Generic, reusable modal form for Control & Calibration record entry.
// Driven by a `fields` config; auto-computes a diff field when configured.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyForm({
  buttonLabel = '+ New',
  title,
  type,
  fields,
  note,
  diff, // { from, to, target } -> target = ((to - from)/from)*100
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map(f => [f.key, f.type === 'checkbox' ? false : '']))
  );

  function set(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (diff && (key === diff.from || key === diff.to)) {
        const a = Number(next[diff.from]);
        const b = Number(next[diff.to]);
        if (Number.isFinite(a) && Number.isFinite(b) && a !== 0) {
          next[diff.target] = (((b - a) / a) * 100).toFixed(2);
        }
      }
      return next;
    });
  }

  function reset() {
    setForm(Object.fromEntries(fields.map(f => [f.key, f.type === 'checkbox' ? false : ''])));
    setError('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/calibration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...form }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>{buttonLabel}</button>
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <div className="modal-head">
              <div className="modal-title">{title}</div>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {note && <div className="alert alert-info">{note}</div>}
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-row">
                {fields.map(f => {
                  const span = f.full ? { gridColumn: '1 / -1' } : undefined;
                  if (f.type === 'checkbox') {
                    return (
                      <div className="form-group" key={f.key} style={span}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={!!form[f.key]}
                            onChange={e => set(f.key, e.target.checked)}
                            style={{ width: 16, height: 16 }}
                          />
                          {f.label}
                        </label>
                      </div>
                    );
                  }
                  if (f.type === 'textarea') {
                    return (
                      <div className="form-group" key={f.key} style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">{f.label}{f.required && ' *'}</label>
                        <textarea className="form-textarea" value={form[f.key]} onChange={e => set(f.key, e.target.value)} />
                      </div>
                    );
                  }
                  return (
                    <div className="form-group" key={f.key} style={span}>
                      <label className="form-label">{f.label}{f.required && ' *'}</label>
                      <input
                        className="form-input"
                        type={f.type || 'text'}
                        value={form[f.key]}
                        readOnly={f.readOnly}
                        placeholder={f.placeholder || ''}
                        onChange={e => set(f.key, e.target.value)}
                        style={f.readOnly ? { background: 'var(--bg-subtle)' } : undefined}
                      />
                      {f.hint && <div className="form-hint">{f.hint}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
