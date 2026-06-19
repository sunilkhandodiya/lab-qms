// app/page.js — Quality Systems Management Dashboard (multi-centre overview)
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format, addDays, isBefore } from 'date-fns';

function Badge({ value }) {
  if (value == null) return <span className="badge badge-na">—</span>;
  const v = String(value);
  return <span className={`badge badge-${v.toLowerCase().replace(/_/g, '')}`}>{v.replace(/_/g, ' ')}</span>;
}

function scoreClass(n) {
  const a = Math.abs(n);
  if (a > 2) return 'zscore-reject';
  if (a > 1) return 'zscore-warn';
  return 'zscore-ok';
}

export default async function Dashboard() {
  const where = await locationWhere();
  const scoped = Object.keys(where).length > 0;
  const now = new Date();
  const in30 = addDays(now, 30);

  // QC results filter: QCResult → level → analyte → locationId
  const qcResultWhere = scoped ? { level: { analyte: { is: where } } } : undefined;

  const [
    openCapas,
    criticalOpenCapas,
    equipment,
    qcRecent,
    eqasFlags,
    overdueTraining,
    locations,
    qcAll,
    equipAll,
    openCapaList,
    recentEqas,
  ] = await Promise.all([
    // CAPA has no locationId — counted globally
    prisma.capa.count({ where: { status: { not: 'CLOSED' } } }),
    prisma.capa.count({ where: { status: { not: 'CLOSED' }, priority: 'CRITICAL' } }),
    // Equipment respects active centre
    prisma.equipment.findMany({ where, select: { locationId: true, calibrationDue: true } }),
    // Recent 30 QC results respecting active centre
    prisma.qCResult.findMany({
      where: qcResultWhere,
      orderBy: { measuredAt: 'desc' },
      take: 30,
      select: { status: true },
    }),
    prisma.eQASResult.count({ where: { grade: { in: ['BORDERLINE', 'UNACCEPTABLE'] } } }),
    prisma.training.count({ where: { status: 'OVERDUE' } }),
    // All centres for the Centres section
    prisma.location.findMany({ include: { state: true }, orderBy: { name: 'asc' } }),
    // All QC results (with analyte location) — aggregated per centre in JS
    prisma.qCResult.findMany({ include: { level: { include: { analyte: true } } } }),
    // All equipment (with location) — aggregated per centre in JS
    prisma.equipment.findMany({ select: { locationId: true, calibrationDue: true } }),
    // Open CAPAs table (no locationId on capa, so show all)
    prisma.capa.findMany({ where: { status: { not: 'CLOSED' } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    // Recent EQAS results
    prisma.eQASResult.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { cycle: { include: { scheme: true } } },
    }),
  ]);

  // Summary derived values (active centre scope)
  const qcRejects = qcRecent.filter(r => r.status === 'REJECT').length;
  const calibDue = equipment.filter(e => e.calibrationDue && isBefore(new Date(e.calibrationDue), in30)).length;
  const calibOverdue = equipment.filter(e => e.calibrationDue && isBefore(new Date(e.calibrationDue), now)).length;

  // Per-centre QC aggregation (via analyte.locationId)
  const qcByLoc = {};
  for (const r of qcAll) {
    const locId = r.level?.analyte?.locationId;
    if (!locId) continue;
    if (!qcByLoc[locId]) qcByLoc[locId] = { pass: 0, total: 0, reject: 0 };
    qcByLoc[locId].total += 1;
    if (r.status === 'ACCEPT' || r.status === 'WARNING') qcByLoc[locId].pass += 1;
    if (r.status === 'REJECT') qcByLoc[locId].reject += 1;
  }

  // Per-centre calibration-due aggregation
  const calibByLoc = {};
  for (const e of equipAll) {
    if (!e.locationId) continue;
    if (!calibByLoc[e.locationId]) calibByLoc[e.locationId] = 0;
    if (e.calibrationDue && isBefore(new Date(e.calibrationDue), in30)) calibByLoc[e.locationId] += 1;
  }

  // Order centres by state then name
  const centres = [...locations].sort((a, b) => {
    const sa = a.state?.name ?? '';
    const sb = b.state?.name ?? '';
    if (sa !== sb) return sa.localeCompare(sb);
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Quality Dashboard</div>
          <div className="page-subtitle">{format(now, 'EEEE, d MMMM yyyy')}</div>
        </div>
      </div>

      {/* Alert banners */}
      {calibOverdue > 0 && (
        <div className="alert alert-error">
          ⚠ {calibOverdue} instrument{calibOverdue === 1 ? '' : 's'} overdue for calibration — action required.
        </div>
      )}
      {qcRejects > 0 && (
        <div className="alert alert-warn">
          ◉ {qcRejects} QC reject{qcRejects === 1 ? '' : 's'} in the last 30 results — review affected analytes.
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid-5 section">
        <div className="stat-card stat-accent-blue">
          <div className="stat-label">Open CAPAs</div>
          <div className="stat-value">{openCapas}</div>
          <div className="stat-sub">{criticalOpenCapas} critical</div>
        </div>
        <div className="stat-card stat-accent-amber">
          <div className="stat-label">Calibration Due ≤30d</div>
          <div className="stat-value">{calibDue}</div>
          <div className="stat-sub">{calibOverdue} overdue</div>
        </div>
        <div className="stat-card stat-accent-red">
          <div className="stat-label">QC Rejects (recent)</div>
          <div className="stat-value">{qcRejects}</div>
          <div className="stat-sub">last 30 results</div>
        </div>
        <div className="stat-card stat-accent-purple">
          <div className="stat-label">EQAS Flags</div>
          <div className="stat-value">{eqasFlags}</div>
          <div className="stat-sub">borderline / unacceptable</div>
        </div>
        <div className="stat-card stat-accent-teal">
          <div className="stat-label">Overdue Training</div>
          <div className="stat-value">{overdueTraining}</div>
          <div className="stat-sub">assignments overdue</div>
        </div>
      </div>

      {/* Centres section */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Centres</div>
        </div>
        {centres.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🏥</div>
              No centres configured.
            </div>
          </div>
        ) : (
          <div className="grid-4">
            {centres.map(loc => {
              const qc = qcByLoc[loc.id] || { pass: 0, total: 0, reject: 0 };
              const calib = calibByLoc[loc.id] || 0;
              return (
                <div key={loc.id} className="loc-card">
                  <div className="loc-card-head">
                    <div>
                      <div className="loc-card-name">{loc.name}</div>
                      <div className="loc-switch-state">{loc.state?.name ?? '—'}</div>
                    </div>
                  </div>
                  <div className="loc-card-body">
                    <div>
                      <div className="loc-metric-label">Control pass</div>
                      <div className="loc-metric-value">{qc.pass}/{qc.total}</div>
                    </div>
                    <div>
                      <div className="loc-metric-label">Not pass</div>
                      <div className="loc-metric-value" style={{ color: qc.reject > 0 ? 'var(--reject)' : undefined }}>
                        {qc.reject}
                      </div>
                    </div>
                    <div>
                      <div className="loc-metric-label">Calibration due</div>
                      <div className="loc-metric-value" style={{ color: calib > 0 ? 'var(--warning)' : undefined }}>
                        {calib}
                      </div>
                    </div>
                  </div>
                  <div className="loc-card-foot">
                    <span>{loc.state?.name ?? '—'}</span>
                    <span>Updated {format(now, 'd MMM yyyy')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-column: Open CAPAs + Recent EQAS */}
      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Open CAPAs</div>
          {openCapaList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              No open CAPAs.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Ref</th><th>Title</th><th>Priority</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {openCapaList.map(c => (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontSize: 12 }}>{c.capaNumber}</td>
                      <td style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td><span className={`priority-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                      <td><Badge value={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Recent EQAS Results</div>
          {recentEqas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              No EQAS results.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Scheme</th><th>Cycle</th><th>Analyte</th><th>Result</th><th>SDI/Z</th><th>Grade</th></tr>
                </thead>
                <tbody>
                  {recentEqas.map(r => {
                    const score = r.sdi ?? r.zScore;
                    return (
                      <tr key={r.id}>
                        <td className="text-secondary" style={{ fontSize: 12 }}>{r.cycle?.scheme?.name ?? '—'}</td>
                        <td className="mono text-muted" style={{ fontSize: 11 }}>{r.cycle?.cycleRef ?? '—'}</td>
                        <td style={{ fontWeight: 500 }}>{r.analyte}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{r.yourResult}{r.unit ? ` ${r.unit}` : ''}</td>
                        <td className="zscore-cell">
                          {score != null ? <span className={scoreClass(score)}>{score.toFixed(2)}</span> : '—'}
                        </td>
                        <td><Badge value={r.grade} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
