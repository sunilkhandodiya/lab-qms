'use client';
// app/sop/SopForm.js
// Small client modal to create a new SOP / controlled document.
// POSTs to the existing /api/documents route (matches { docNumber, title, category, content, authorId, reviewDue }).

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const CATEGORIES = ['SOP', 'WORK_INSTRUCTION', 'QUALITY_MANUAL', 'FORM', 'POLICY'];

export default function SopForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    docNumber: '', title: '', category: 'SOP',
    department: '', instrument: '', version: '1.0', content: '', reviewDue: '',
  });

  function reset() {
    setForm({ docNumber: '', title: '', category: 'SOP', department: '', instrument: '', version: '1.0', content: '', reviewDue: '' });
    setError('');
  }

  async function handleSave() {
    if (!form.docNumber || !form.title) { setError('Document number and title are required.'); return; }
    if (!session?.user?.id) { setError('Could not determine the current user. Please re-login.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docNumber: form.docNumber,
        title: form.title,
        category: form.category,
        department: form.department || null,
        instrument: form.instrument || null,
        version: form.version || undefined,
        content: form.content || '',
        authorId: session.user.id,
        reviewDue: form.reviewDue || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create document.');
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
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ New SOP</button>
      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal modal-wide">
            <div className="modal-head">
              <span className="modal-title">New Controlled Document</span>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Document Number *</label>
                  <input className="form-input" value={form.docNumber} onChange={e => setForm(f => ({ ...f, docNumber: e.target.value }))} placeholder="e.g. SOP-BIO-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Version</label>
                  <input className="form-input" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Glucose assay operating procedure" />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Biochemistry" />
                </div>
                <div className="form-group">
                  <label className="form-label">Instrument</label>
                  <input className="form-input" value={form.instrument} onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} placeholder="e.g. Beckman" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Review Due</label>
                <input className="form-input" type="date" value={form.reviewDue} onChange={e => setForm(f => ({ ...f, reviewDue: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea className="form-textarea" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Procedure scope, responsibilities, steps…" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Document'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
