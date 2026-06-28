'use client';
// app/playbook/PlaybookClient.js
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CanDo } from '@/components/RoleGuard';
import { format } from 'date-fns';

const CAT_LABELS = {
  DAILY_QC: 'Daily QC', INSTRUMENT_STARTUP: 'Instrument Startup', INSTRUMENT_SHUTDOWN: 'Instrument Shutdown',
  CALIBRATION: 'Calibration', SAMPLE_HANDLING: 'Sample Handling', REAGENT_PREPARATION: 'Reagent Prep',
  EQUIPMENT_MAINTENANCE: 'Equipment Maint.', SAFETY_CHECK: 'Safety Check',
  SHIFT_HANDOVER: 'Shift Handover', INCIDENT_RESPONSE: 'Incident Response', CUSTOM: 'Custom',
};
const CAT_COLORS = {
  DAILY_QC: '#2563eb', INSTRUMENT_STARTUP: '#16a34a', INSTRUMENT_SHUTDOWN: '#dc2626',
  CALIBRATION: '#7c3aed', SAMPLE_HANDLING: '#0891b2', REAGENT_PREPARATION: '#d97706',
  EQUIPMENT_MAINTENANCE: '#475569', SAFETY_CHECK: '#dc2626', SHIFT_HANDOVER: '#0d9488',
  INCIDENT_RESPONSE: '#b91c1c', CUSTOM: '#6366f1',
};
const STATUS_STYLES = {
  COMPLETED: { bg: 'rgba(22,163,74,0.1)', color: '#16a34a', label: 'Completed' },
  FLAGGED:   { bg: 'rgba(220,38,38,0.1)', color: '#dc2626', label: 'Flagged' },
  IN_PROGRESS: { bg: 'rgba(37,99,235,0.1)', color: '#2563eb', label: 'In Progress' },
  ABANDONED: { bg: 'rgba(100,116,139,0.1)', color: '#64748b', label: 'Abandoned' },
};

export default function PlaybookClient({ initialPlaybooks, initialRuns, locations }) {
  const [playbooks] = useState(initialPlaybooks);
  const [runs] = useState(initialRuns);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('playbooks');

  const filtered = useMemo(() => playbooks.filter(p => {
    if (filterCat && p.category !== filterCat) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [playbooks, filterCat, search]);

  const cats = [...new Set(playbooks.map(p => p.category))];

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Playbook</div>
          <div className="page-title">Playbooks</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Executable step-by-step lab procedures — build once, run anytime.
          </div>
        </div>
        <CanDo permission="playbook:create">
          <Link href="/playbook/new" className="btn btn-primary">＋ New Playbook</Link>
        </CanDo>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Playbooks', value: playbooks.length, color: '#2563eb' },
          { label: 'Runs This Month', value: runs.filter(r => new Date(r.startedAt) > new Date(Date.now() - 30*24*60*60*1000)).length, color: '#16a34a' },
          { label: 'Flagged Runs', value: runs.filter(r => r.status === 'FLAGGED').length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {[['playbooks', 'Playbooks'], ['runs', 'Run History']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t ? 600 : 400, color: tab === t ? 'var(--accent-blue)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--accent-blue)' : '2px solid transparent', marginBottom: -1 }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'playbooks' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search playbooks…" style={{ width: 220, fontSize: 13 }} />
            <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width: 180, fontSize: 13 }}>
              <option value="">All Categories</option>
              {cats.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <div>No playbooks yet. Create your first procedure.</div>
                <CanDo permission="playbook:create">
                  <Link href="/playbook/new" className="btn btn-primary" style={{ marginTop: 12 }}>＋ New Playbook</Link>
                </CanDo>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filtered.map(p => (
                <div key={p.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      {p.code && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{p.code}</div>}
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: (CAT_COLORS[p.category] || '#2563eb') + '18',
                      color: CAT_COLORS[p.category] || '#2563eb', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {CAT_LABELS[p.category]}
                    </span>
                  </div>
                  {p.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p.description}</div>}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>📝 {p._count.steps} steps</span>
                    <span>▶ {p._count.runs} runs</span>
                    {p.department && <span>🏷 {p.department}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Link href={`/playbook/${p.id}/run`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>
                      ▶ Run
                    </Link>
                    <CanDo permission="playbook:create">
                      <Link href={`/playbook/${p.id}`} className="btn btn-ghost" style={{ fontSize: 13 }}>Edit</Link>
                    </CanDo>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'runs' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead><tr>{['Date', 'Playbook', 'Category', 'Run By', 'Duration', 'Status'].map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              <tbody>
                {runs.length === 0
                  ? <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No runs recorded yet.</td></tr>
                  : runs.map(r => {
                    const ss = STATUS_STYLES[r.status] || STATUS_STYLES.IN_PROGRESS;
                    const dur = r.completedAt ? Math.round((new Date(r.completedAt) - new Date(r.startedAt)) / 60000) : null;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12 }}>{format(new Date(r.startedAt), 'dd MMM yy HH:mm')}</td>
                        <td style={{ fontWeight: 500 }}>{r.playbook.title}</td>
                        <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: (CAT_COLORS[r.playbook.category]||'#2563eb')+'18', color: CAT_COLORS[r.playbook.category]||'#2563eb' }}>{CAT_LABELS[r.playbook.category]}</span></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{r.runBy}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{dur != null ? dur + ' min' : '—'}</td>
                        <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: ss.bg, color: ss.color, fontWeight: 600 }}>{ss.label}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
