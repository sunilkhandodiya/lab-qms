// app/sop/page.js
// Standard Operating Procedure module — browse controlled documents (SOPs / Manuals)
// grouped by department, with review-due colouring per the Quality Model SOP.
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { format, differenceInCalendarDays } from 'date-fns';
import { CanDo } from '@/components/RoleGuard';
import FilterBar from '@/components/FilterBar';
import SopForm from './SopForm';

const GENERAL = 'General / Quality System';

function Badge({ value }) {
  if (!value) return <span className="text-muted">—</span>;
  return (
    <span className={`badge badge-${String(value).toLowerCase().replace(/_/g, '')}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

function ReviewDue({ date }) {
  if (!date) return <span className="text-muted">—</span>;
  const days = differenceInCalendarDays(new Date(date), new Date());
  const cls = days < 0 ? 'zscore-reject' : days <= 60 ? 'zscore-warn' : '';
  const label = format(new Date(date), 'dd MMM yy');
  return (
    <span className={cls || 'mono text-secondary'} style={{ fontSize: 12 }}>
      {label}{days < 0 ? ' · overdue' : days <= 60 ? ` · ${days}d` : ''}
    </span>
  );
}

export default async function SopPage({ searchParams }) {
  const sp = (await searchParams) || {};

  const [docs, departments] = await Promise.all([
    prisma.document.findMany({
      include: { author: true, approvals: { include: { reviewer: true } } },
      orderBy: { docNumber: 'asc' },
    }),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  // Stats — always from the FULL document list
  const total = docs.length;
  const effective = docs.filter(d => d.status === 'EFFECTIVE').length;
  const inReview = docs.filter(d => d.status === 'IN_REVIEW').length;
  const isReviewDue = d => {
    if (!d.reviewDue) return false;
    return differenceInCalendarDays(new Date(d.reviewDue), new Date()) <= 60;
  };
  const reviewDueSoon = docs.filter(isReviewDue).length;

  // Active filter
  const statusFilter = sp.status === 'EFFECTIVE' || sp.status === 'IN_REVIEW' ? sp.status : null;
  const dueFilter = sp.due === 'review';
  let filtered = docs;
  let filterLabel = null;
  if (statusFilter === 'EFFECTIVE') {
    filtered = docs.filter(d => d.status === 'EFFECTIVE');
    filterLabel = 'Effective documents';
  } else if (statusFilter === 'IN_REVIEW') {
    filtered = docs.filter(d => d.status === 'IN_REVIEW');
    filterLabel = 'In review';
  } else if (dueFilter) {
    filtered = docs.filter(isReviewDue);
    filterLabel = 'Review due ≤60 days';
  }

  // Group filtered docs by department
  const groups = {};
  for (const d of filtered) {
    const key = d.department || GENERAL;
    (groups[key] ||= []).push(d);
  }
  const orderedDepts = Object.keys(groups).sort((a, b) => {
    if (a === GENERAL) return 1;
    if (b === GENERAL) return -1;
    return a.localeCompare(b);
  });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Standard Operating Procedure</div>
            <div className="page-subtitle">Controlled documents · SOPs · Manuals</div>
          </div>
          <CanDo permission="documents:create"><SopForm departments={departments} /></CanDo>
        </div>
      </div>

      {filterLabel && (
        <FilterBar label={filterLabel} count={filtered.length} clearHref="/sop" />
      )}

      <div className="grid-4" style={{ marginBottom: 22 }}>
        <Link href="/sop" className="stat-card stat-accent-blue" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Total Documents</div>
          <div className="stat-value">{total}</div>
        </Link>
        <Link href="/sop?status=EFFECTIVE" className="stat-card stat-accent-green" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Effective</div>
          <div className="stat-value">{effective}</div>
        </Link>
        <Link href="/sop?status=IN_REVIEW" className="stat-card stat-accent-amber" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">In Review</div>
          <div className="stat-value">{inReview}</div>
        </Link>
        <Link href="/sop?due=review" className="stat-card stat-accent-red" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Review Due ≤60 days</div>
          <div className="stat-value">{reviewDueSoon}</div>
        </Link>
      </div>

      {orderedDepts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div>No controlled documents yet.</div>
          </div>
        </div>
      ) : (
        orderedDepts.map(dept => (
          <div className="card" key={dept} style={{ marginBottom: 18 }}>
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{dept}</span>
              <span className="text-muted" style={{ fontSize: 12, fontWeight: 500 }}>{groups[dept].length} document{groups[dept].length === 1 ? '' : 's'}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Doc #</th><th>Title</th><th>Category</th><th>Instrument</th>
                    <th>Version</th><th>Status</th><th>Review Due</th><th>Author</th>
                  </tr>
                </thead>
                <tbody>
                  {groups[dept].map(doc => (
                    <tr key={doc.id}>
                      <td className="mono">{doc.docNumber}</td>
                      <td style={{ maxWidth: 260 }}>{doc.title}</td>
                      <td><Badge value={doc.category} /></td>
                      <td className="text-secondary">{doc.instrument || '—'}</td>
                      <td className="mono">{doc.version}</td>
                      <td><Badge value={doc.status} /></td>
                      <td><ReviewDue date={doc.reviewDue} /></td>
                      <td>{doc.author?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
