'use client';
// app/general-quality/[category]/[code]/RecordEntry.js

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanDo } from '@/components/RoleGuard';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordEntry({ logCode, logTitle, category, fields }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [values, setValues] = useState({});

  function reset() {
    setDate(todayStr());
    setSummary('');
    setImageUrl('');
    setValues({});
    setError('');
    setSaving(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function setField(key, val) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  function hasAnyFieldValue() {
    return Object.values(values).some(v => v !== '' && v !== undefined && v !== null);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!summary.trim() && !hasAnyFieldValue()) {
      setError('Enter a summary or at least one field value.');
      return;
    }

    // Coerce boolean selects to real booleans for the data JSON.
    const data = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === '' || v === undefined || v === null) continue;
      if (f.type === 'boolean') data[f.key] = v === 'true';
      else data[f.key] = v;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/quality-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logCode,
          logTitle,
          category,
          date,
          summary: summary.trim() || null,
          imageUrl: imageUrl.trim() || null,
          data,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save record.');
      }
      close();
      router.refresh();
    } catch (err) {
      setError(err.message || 'Failed to save record.');
      setSaving(false);
    }
  }

  function renderField(f) {
    const val = values[f.key] ?? '';
    if (f.type === 'textarea') {
      return (
        <textarea
          className="form-textarea"
          value={val}
          onChange={e => setField(f.key, e.target.value)}
        />
      );
    }
    if (f.type === 'boolean') {
      return (
        <select className="form-select" value={val} onChange={e => setField(f.key, e.target.value)}>
          <option value="">—</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    const inputType =
      f.type === 'number' ? 'number'
        : f.type === 'date' ? 'date'
          : f.type === 'datetime' ? 'datetime-local'
            : 'text';
    return (
      <input
        className="form-input"
        type={inputType}
        value={val}
        onChange={e => setField(f.key, e.target.value)}
      />
    );
  }

  return (
    <CanDo permission="gq:create">
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Record</button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-head">
                <div className="modal-title">New Record — {logTitle}</div>
                <button type="button" className="modal-close" onClick={close} aria-label="Close">×</button>
              </div>

              <div className="modal-body">
                {error && <div className="alert alert-error">{error}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      className="form-input"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Summary</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Short description of this entry"
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                  />
                </div>

                {fields.map(f => (
                  <div className="form-group" key={f.key}>
                    <label className="form-label">{f.label}</label>
                    {renderField(f)}
                  </div>
                ))}

                <div className="form-group">
                  <label className="form-label">Image URL / attachment reference</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Optional link or file reference"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                  />
                  <div className="form-hint">Optional — paste a link or note a physical record reference.</div>
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CanDo>
  );
}
