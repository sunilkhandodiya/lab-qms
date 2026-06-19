// app/risk/page.js — SOP "Risk Assessment" (NABL / ISO 15189:2022)
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { CanDo } from '@/components/RoleGuard';
import FilterBar from '@/components/FilterBar';
import RiskForm from './RiskForm';

const STAGE_ORDER = ['SAFETY', 'PRE_ANALYTICAL', 'ANALYTICAL', 'POST_ANALYTICAL', 'OTHER'];

const STAGE_TITLES = {
  PRE_ANALYTICAL: 'Pre-Analytical Stage',
  ANALYTICAL: 'Analytical Stage',
  POST_ANALYTICAL: 'Post-Analytical Stage',
  SAFETY: 'Safety',
  OTHER: 'Other',
};

const RISK_BADGE = { HIGH: 'badge-reject', MEDIUM: 'badge-warning', LOW: 'badge-accept' };

function RiskBadge({ level }) {
  if (!level) return <span className="text-muted">—</span>;
  return <span className={`badge ${RISK_BADGE[level] || 'badge-neutral'}`}>{level}</span>;
}

function Approval({ value }) {
  return value
    ? <span className="badge badge-yes">✓ Yes</span>
    : <span className="text-muted">—</span>;
}

export default async function RiskPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const where = await locationWhere();

  const risks = await prisma.riskAssessment.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  const highCount = risks.filter(r => r.riskLevel === 'HIGH').length;
  const ltApprovedCount = risks.filter(r => r.ltApproved).length;
  const drApprovedCount = risks.filter(r => r.drApproved).length;

  // Active filter
  const level = sp.level;
  const appr = sp.appr;

  let filtered = risks;
  let filterLabel = null;
  if (level === 'HIGH') {
    filtered = risks.filter(r => r.riskLevel === 'HIGH');
    filterLabel = 'High risks';
  } else if (appr === 'lt') {
    filtered = risks.filter(r => r.ltApproved === true);
    filterLabel = 'LT approved';
  } else if (appr === 'dr') {
    filtered = risks.filter(r => r.drApproved === true);
    filterLabel = 'DR approved';
  }

  // Group rows by stage (after filtering)
  const byStage = {};
  for (const r of filtered) (byStage[r.stage] ||= []).push(r);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Risk Assessment</div>
          <div className="page-subtitle">Pre-analytical · Analytical · Post-analytical</div>
        </div>
        <CanDo permission="risk:create"><RiskForm /></CanDo>
      </div>

      {filterLabel && (
        <FilterBar label={filterLabel} count={filtered.length} clearHref="/risk" />
      )}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Link href="/risk?level=HIGH" className="stat-card stat-accent-red" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">High Risks</div>
          <div className="stat-value">{highCount}</div>
        </Link>
        <Link href="/risk" className="stat-card stat-accent-blue" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Total Risks</div>
          <div className="stat-value">{risks.length}</div>
        </Link>
        <Link href="/risk?appr=lt" className="stat-card stat-accent-teal" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">LT Approved</div>
          <div className="stat-value">{ltApprovedCount}</div>
        </Link>
        <Link href="/risk?appr=dr" className="stat-card stat-accent-green" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">DR Approved</div>
          <div className="stat-value">{drApprovedCount}</div>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            No risk assessments recorded for this centre.
          </div>
        </div>
      ) : (
        STAGE_ORDER.filter(stage => byStage[stage]?.length).map(stage => (
          <div key={stage} className="section">
            <div className="card">
              <div className="card-title">{STAGE_TITLES[stage]}</div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Potential Risk</th>
                      <th>Risk Level</th>
                      <th>Mitigation of Risk</th>
                      <th>Monitoring</th>
                      <th>Responsibility</th>
                      <th>LT</th>
                      <th>DR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStage[stage].map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 500, minWidth: 180 }}>{r.potentialRisk}</td>
                        <td><RiskBadge level={r.riskLevel} /></td>
                        <td className="text-secondary" style={{ fontSize: 12, minWidth: 180 }}>{r.mitigation || '—'}</td>
                        <td className="text-secondary" style={{ fontSize: 12 }}>{r.monitoring || '—'}</td>
                        <td className="text-secondary">{r.responsibility || '—'}</td>
                        <td><Approval value={r.ltApproved} /></td>
                        <td><Approval value={r.drApproved} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
