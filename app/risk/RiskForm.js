'use client';
// app/risk/RiskForm.js

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  { value: 'PRE_ANALYTICAL', label: 'Pre-Analytical Stage' },
  { value: 'ANALYTICAL', label: 'Analytical Stage' },
  { value: 'POST_ANALYTICAL', label: 'Post-Analytical Stage' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'OTHER', label: 'Other' },
];

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

const EMPTY = {
  stage: 'PRE_ANALYTICAL',
  potentialRisk: '',
  riskLevel: 'MEDIUM',
  mitigation: '',
  monitoring: '',
  responsibility: '',
};

export default function RiskForm() {
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
    if (!form.potentialRisk.trim()) {
      setError('Potential Risk is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save risk assessment.');
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
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New Risk</button>

      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={submit}>
              <div className="modal-head">
                <div className="modal-title">New Risk Assessment</div>
                <button type="button" className="modal-close" onClick={close}>×</button>
              </div>

              <div className="modal-body">
                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stage</label>
                    <select className="form-select" value={form.stage} onChange={e => set('stage', e.target.value)}>
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Risk Level</label>
                    <select className="form-select" value={form.riskLevel} onChange={e => set('riskLevel', e.target.value)}>
                      {RISK_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Potential Risk *</label>
                  <textarea className="form-textarea" value={form.potentialRisk} onChange={e => set('potentialRisk', e.target.value)} placeholder="Describe the potential risk…" />
                </div>

                <div className="form-group">
                  <label className="form-label">Mitigation of Risk</label>
                  <textarea className="form-textarea" value={form.mitigation} onChange={e => set('mitigation', e.target.value)} placeholder="How is the risk mitigated?" />
                </div>

                <div className="form-group">
                  <label className="form-label">Monitoring</label>
                  <input className="form-input" value={form.monitoring} onChange={e => set('monitoring', e.target.value)} placeholder="How is it monitored?" />
                </div>

                <div className="form-group">
                  <label className="form-label">Responsibility</label>
                  <input className="form-input" value={form.responsibility} onChange={e => set('responsibility', e.target.value)} placeholder="Responsible person / role" />
                </div>
              </div>

              <div className="modal-foot">
                <button type="button" className="btn" onClick={close} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Risk'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
