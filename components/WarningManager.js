'use client';
// components/WarningManager.js
// Dashboard control (Admin / Dr. Pathology only) to acknowledge flagged records so
// they drop off the dashboard warnings — or restore them. Every change is recorded
// in the immutable audit trail via /api/warnings.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { can } from '@/lib/permissions';

export default function WarningManager({ categories }) {
  const router = useRouter();
  const { data: session } = useSession();
  const canAck = can(session?.user?.role, 'warning:ack');

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  if (!canAck) return null;

  const totalVisible = categories.reduce((n, c) => n + c.count, 0);

  async function loadCategory(cat) {
    setSelected(cat);
    setItems(null);
    setError('');
    setLoading(true);
    const res = await fetch(`/api/warnings?category=${encodeURIComponent(cat.key)}`);
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to load records.');
      return;
    }
    const data = await res.json();
    setItems(data.items);
  }

  async function toggle(item, active) {
    setBusyId(item.entityId);
    setError('');
    const res = await fetch('/api/warnings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: item.entity,
        entityId: item.entityId,
        category: selected.key,
        note: notes[item.entityId] || '',
        active,
      }),
    });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Failed to update.');
      return;
    }
    await loadCategory(selected);
    router.refresh(); // refresh dashboard counts
  }

  return (
    <>
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        ⚙ Manage warnings{totalVisible > 0 ? ` (${totalVisible})` : ''}
      </button>

      {open && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-head">
              <div className="modal-title">Manage dashboard warnings</div>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                Acknowledging a record removes it from the dashboard warnings. Every change is recorded in the immutable audit trail.
              </div>
              {error && <div className="alert alert-error">{error}</div>}

              <div style={{ display: 'flex', gap: 16 }}>
                {/* Category list */}
                <div style={{ minWidth: 200 }}>
                  {categories.map(c => (
                    <button
                      key={c.key}
                      className="btn btn-ghost"
                      onClick={() => loadCategory(c)}
                      style={{
                        width: '100%', justifyContent: 'space-between', display: 'flex',
                        marginBottom: 4, fontWeight: selected?.key === c.key ? 600 : 400,
                        background: selected?.key === c.key ? 'var(--bg-hover)' : undefined,
                      }}
                    >
                      <span>{c.label}</span>
                      <span className={`badge ${c.count > 0 ? 'badge-pending' : 'badge-na'}`}>{c.count}</span>
                    </button>
                  ))}
                </div>

                {/* Records for selected category */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {!selected && <div className="text-muted">Select a warning on the left to see its records.</div>}
                  {selected && loading && <div className="text-muted">Loading…</div>}
                  {selected && !loading && items && items.length === 0 && (
                    <div className="empty-state"><div>No flagged records in “{selected.label}”.</div></div>
                  )}
                  {selected && !loading && items && items.length > 0 && (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr><th>Record</th><th>State</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {items.map(it => (
                            <tr key={it.entityId}>
                              <td>
                                <div style={{ fontWeight: 500 }}>{it.label}</div>
                                {it.sub && <div className="text-muted" style={{ fontSize: 11 }}>{it.sub}</div>}
                                {!it.acked && (
                                  <input
                                    className="form-input"
                                    placeholder="Note (optional)"
                                    style={{ marginTop: 4, fontSize: 12, padding: '4px 8px' }}
                                    value={notes[it.entityId] || ''}
                                    onChange={e => setNotes(n => ({ ...n, [it.entityId]: e.target.value }))}
                                  />
                                )}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {it.acked
                                  ? <span className="badge badge-approved" title={`${it.ackedBy || ''}${it.ackNote ? ` · ${it.ackNote}` : ''}`}>
                                      Acknowledged{it.ackedAt ? ` · ${format(new Date(it.ackedAt), 'dd MMM yy')}` : ''}
                                    </span>
                                  : <span className="badge badge-pending">Showing</span>}
                              </td>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {it.acked
                                  ? <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} disabled={busyId === it.entityId} onClick={() => toggle(it, false)}>
                                      {busyId === it.entityId ? '…' : 'Restore'}
                                    </button>
                                  : <button className="btn btn-primary" style={{ padding: '2px 8px', fontSize: 11 }} disabled={busyId === it.entityId} onClick={() => toggle(it, true)}>
                                      {busyId === it.entityId ? '…' : 'Acknowledge'}
                                    </button>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
