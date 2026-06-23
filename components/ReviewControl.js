'use client';
// components/ReviewControl.js
// Per-record review cell for the read-only Control & Calibration tables.
//  • Shows the current review status + who/when.
//  • Dr. Pathology / Admin (review:update) can change the status + date with a note.
//  • Auditor / Admin / Pathologist (audit:view) can open the immutable audit trail.
// All persistence goes through /api/review; AuditLog is never edited or deleted.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { can } from '@/lib/permissions';
import { REVIEW_STATUSES } from '@/lib/reviewable';

const BADGE_CLASS = { PENDING: 'badge-pending', REVIEWED: 'badge-approved', REJECTED: 'badge-reject' };
const STATUS_LABEL = { PENDING: 'Pending', REVIEWED: 'Reviewed', REJECTED: 'Rejected' };

function todayInput() {
  return format(new Date(), 'yyyy-MM-dd');
}

export default function ReviewControl({ type, id, status = 'PENDING', reviewedAt, reviewedBy, reviewNote }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canReview = can(role, 'review:update');
  const canAudit = can(role, 'audit:view');

  const [editing, setEditing] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    status: status === 'PENDING' ? 'REVIEWED' : status,
    date: reviewedAt ? format(new Date(reviewedAt), 'yyyy-MM-dd') : todayInput(),
    note: reviewNote || '',
  });

  const [logs, setLogs] = useState(null);
  const [auditError, setAuditError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, status: form.status, reviewedAt: form.date, note: form.note }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to save review.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function openAudit() {
    setAuditing(true);
    setLogs(null);
    setAuditError('');
    const res = await fetch(`/api/review?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAuditError(d.error || 'Failed to load audit trail.');
      return;
    }
    setLogs(await res.json());
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className={`badge ${BADGE_CLASS[status] || 'badge-na'}`}>{STATUS_LABEL[status] || status}</span>
      {reviewedAt && (
        <span className="text-muted mono" style={{ fontSize: 10 }}>
          {format(new Date(reviewedAt), 'dd MMM yy')}{reviewedBy ? ` · ${reviewedBy}` : ''}
        </span>
      )}

      <span style={{ display: 'inline-flex', gap: 6 }}>
        {canReview && (
          <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setEditing(true)}>
            {status === 'PENDING' ? 'Review' : 'Edit'}
          </button>
        )}
        {canAudit && (
          <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={openAudit} title="View audit trail">
            Audit
          </button>
        )}
      </span>

      {/* ── Review editor ───────────────────────────────────────────── */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditing(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div className="modal-title">Review record</div>
              <button className="modal-close" onClick={() => setEditing(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">Your name, the timestamp and this change are recorded in the immutable audit trail.</div>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label className="form-label">Review status</label>
                <select className="form-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {REVIEW_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Review date</label>
                <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <textarea className="form-textarea" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit trail (read-only) ─────────────────────────────────── */}
      {auditing && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAuditing(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <div className="modal-title">Audit trail</div>
              <button className="modal-close" onClick={() => setAuditing(false)}>×</button>
            </div>
            <div className="modal-body">
              {auditError && <div className="alert alert-error">{auditError}</div>}
              {!logs && !auditError && <div className="text-muted">Loading…</div>}
              {logs && logs.length === 0 && <div className="empty-state"><div>No audit entries for this record yet.</div></div>}
              {logs && logs.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>When</th><th>User</th><th>Action</th><th>Change</th></tr>
                    </thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id}>
                          <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{format(new Date(l.createdAt), 'dd MMM yy HH:mm')}</td>
                          <td style={{ fontSize: 12 }}>{l.user}{l.role ? <span className="text-muted"> ({l.role})</span> : ''}</td>
                          <td><span className="flag" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{l.action}</span></td>
                          <td className="text-secondary" style={{ fontSize: 12 }}>
                            {l.details?.from && l.details?.to
                              ? <>{STATUS_LABEL[l.details.from] || l.details.from} → {STATUS_LABEL[l.details.to] || l.details.to}{l.details.note ? ` · ${l.details.note}` : ''}</>
                              : (l.details ? JSON.stringify(l.details) : '—')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setAuditing(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
