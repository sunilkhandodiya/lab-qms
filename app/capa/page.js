import { CanDo } from '@/components/RoleGuard';
// app/capa/page.js
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format, differenceInDays } from 'date-fns';
import FilterBar from '@/components/FilterBar';

function Badge({ value }) {
  return <span className={`badge badge-${value?.toLowerCase().replace(/_/g,'')}`}>{value?.replace(/_/g,' ')}</span>;
}

export default async function CAPAPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const ref = sp.ref || null;
  const filter = sp.filter || null; // open | critical | overdue

  const capas = await prisma.capa.findMany({
    include: { owner: true },
    orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
  });

  const now = new Date();

  function isBefore(d, now) { return new Date(d) < now; }

  // Stat-card counts — always computed from the FULL dataset so the numbers
  // never change when a filter is active.
  const allOpen = capas.filter(c => c.status !== 'CLOSED');
  const stats = {
    total: capas.length,
    open: allOpen.length,
    critical: allOpen.filter(c => c.priority === 'CRITICAL').length,
    overdue: allOpen.filter(c => c.dueDate && isBefore(c.dueDate, now)).length,
  };

  // Active filter (from stat-card / dashboard drill-down)
  let filterLabel = null;
  let view = capas;
  if (ref) {
    view = capas.filter(c => c.capaNumber === ref);
    filterLabel = `CAPA ${ref}`;
  } else if (filter === 'open') {
    view = allOpen;
    filterLabel = 'Open CAPAs';
  } else if (filter === 'critical') {
    view = allOpen.filter(c => c.priority === 'CRITICAL');
    filterLabel = 'Critical open CAPAs';
  } else if (filter === 'overdue') {
    view = allOpen.filter(c => c.dueDate && isBefore(c.dueDate, now));
    filterLabel = 'Overdue CAPAs';
  }
  const isFiltered = !!filterLabel;

  // When filtered, the table + detail cards show the filtered view (incl. a
  // single ref'd CAPA even if it is CLOSED) and the Closed section is hidden.
  const open = isFiltered ? view : allOpen;
  const closed = isFiltered ? [] : capas.filter(c => c.status === 'CLOSED');

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">CAPA Register</div>
            <div className="page-subtitle">Corrective & Preventive Actions</div>
          </div>
          <CanDo permission="capa:create"><button className="btn btn-primary">+ New CAPA</button></CanDo>
        </div>
      </div>

      {isFiltered && <FilterBar label={filterLabel} count={view.length} clearHref="/capa" />}

      <div className="grid-4 section">
        <Link href="/capa" className="stat-card stat-accent-blue" style={{ textDecoration: 'none', color: 'inherit' }}><div className="stat-label">Total CAPAs</div><div className="stat-value">{stats.total}</div></Link>
        <Link href="/capa?filter=open" className="stat-card stat-accent-amber" style={{ textDecoration: 'none', color: 'inherit' }}><div className="stat-label">Open</div><div className="stat-value">{stats.open}</div></Link>
        <Link href="/capa?filter=critical" className="stat-card stat-accent-red" style={{ textDecoration: 'none', color: 'inherit' }}><div className="stat-label">Critical</div><div className="stat-value">{stats.critical}</div></Link>
        <Link href="/capa?filter=overdue" className="stat-card stat-accent-red" style={{ textDecoration: 'none', color: 'inherit' }}><div className="stat-label">Overdue</div><div className="stat-value">{stats.overdue}</div></Link>
      </div>

      <div className="section">
        <div className="section-title" style={{ marginBottom: 16 }}>Open CAPAs</div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>CAPA #</th><th>Type</th><th>Title</th><th>Source</th><th>Priority</th><th>Status</th><th>Owner</th><th>Due Date</th></tr>
              </thead>
              <tbody>
                {open.map(c => {
                  const daysLeft = c.dueDate ? differenceInDays(new Date(c.dueDate), now) : null;
                  return (
                    <tr key={c.id}>
                      <td className="mono">{c.capaNumber}</td>
                      <td><span className="badge badge-draft">{c.type}</span></td>
                      <td style={{ maxWidth: 220 }}>{c.title}</td>
                      <td className="text-secondary" style={{ fontSize: 12 }}>{c.source}</td>
                      <td><span className={`priority-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                      <td><Badge value={c.status} /></td>
                      <td>{c.owner.name}</td>
                      <td className={`mono ${daysLeft != null && daysLeft < 0 ? 'zscore-reject' : daysLeft != null && daysLeft < 14 ? 'zscore-warn' : ''}`} style={{ fontSize: 11 }}>
                        {c.dueDate ? `${format(new Date(c.dueDate), 'dd MMM yy')}${daysLeft != null ? ` (${daysLeft >= 0 ? `${daysLeft}d left` : `${Math.abs(daysLeft)}d overdue`})` : ''}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CAPA detail cards */}
      <div className="section">
        <div className="section-title" style={{ marginBottom: 16 }}>CAPA Details</div>
        {open.map(c => (
          <div key={c.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <span className="mono" style={{ color: 'var(--accent-blue)', fontSize: 12 }}>{c.capaNumber}</span>
                <span style={{ fontWeight: 600, marginLeft: 12 }}>{c.title}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Badge value={c.priority} />
                <Badge value={c.status} />
              </div>
            </div>
            <div className="grid-3" style={{ fontSize: 13 }}>
              <div>
                <div className="text-muted" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Description</div>
                <div>{c.description}</div>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Root Cause</div>
                <div>{c.rootCause ?? 'Under investigation'}</div>
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Action Taken</div>
                <div>{c.action ?? 'Pending'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {closed.length > 0 && (
        <div className="section">
          <div className="section-title" style={{ marginBottom: 16 }}>Closed CAPAs</div>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>CAPA #</th><th>Title</th><th>Closed At</th><th>Owner</th></tr>
                </thead>
                <tbody>
                  {closed.map(c => (
                    <tr key={c.id}>
                      <td className="mono">{c.capaNumber}</td>
                      <td>{c.title}</td>
                      <td className="mono text-secondary" style={{ fontSize: 11 }}>{c.closedAt ? format(new Date(c.closedAt), 'dd MMM yyyy') : '—'}</td>
                      <td>{c.owner.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
