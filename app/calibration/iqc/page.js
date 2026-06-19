// app/calibration/iqc/page.js — Internal QC (Levey-Jennings)
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';
import { evaluateWestgard } from '@/lib/westgard';
import FilterBar from '@/components/FilterBar';

function Badge({ value }) {
  return (
    <span className={`badge badge-${String(value).toLowerCase().replace(/_/g, '')}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

// ── Levey-Jennings SVG chart ───────────────────────────────────────────────
// Plots level.results (oldest→newest) vs mean and ±1/2/3 SD reference lines.
function LJChart({ mean, sd, results }) {
  const W = 760, H = 240;
  const padL = 48, padR = 16, padT = 14, padB = 22;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // y-domain fixed at ±4 SD around mean
  const yMin = mean - 4 * sd;
  const yMax = mean + 4 * sd;
  const y = v => padT + plotH * (1 - (v - yMin) / (yMax - yMin));
  const n = results.length;
  const x = i => padL + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));

  const sdLines = [
    { k: 3, label: '+3SD', cls: 'reject' },
    { k: 2, label: '+2SD', cls: 'warn' },
    { k: 1, label: '+1SD', cls: 'ok' },
    { k: 0, label: 'Mean', cls: 'mean' },
    { k: -1, label: '-1SD', cls: 'ok' },
    { k: -2, label: '-2SD', cls: 'warn' },
    { k: -3, label: '-3SD', cls: 'reject' },
  ];
  const lineColor = c => (c === 'reject' ? 'var(--reject)' : c === 'warn' ? 'var(--warning)' : c === 'mean' ? 'var(--accent-blue)' : 'var(--border-strong)');

  const pointColor = z => {
    const a = Math.abs(z ?? 0);
    return a > 3 ? 'var(--reject)' : a > 2 ? 'var(--warning)' : 'var(--accept)';
  };

  const path = results
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`)
    .join(' ');

  return (
    <div className="lj-chart">
      <svg className="lj-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {sdLines.map(l => {
          const yv = mean + l.k * sd;
          return (
            <g key={l.label}>
              <line
                x1={padL} y1={y(yv)} x2={W - padR} y2={y(yv)}
                stroke={lineColor(l.cls)}
                strokeWidth={l.k === 0 ? 1.4 : 1}
                strokeDasharray={l.k === 0 ? '0' : '4 4'}
                opacity={l.k === 0 ? 0.9 : 0.6}
              />
              <text x={4} y={y(yv) + 3} fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-mono)">{l.label}</text>
            </g>
          );
        })}
        {n > 0 && <path d={path} fill="none" stroke="var(--accent-blue)" strokeWidth="1.4" opacity="0.55" />}
        {results.map((r, i) => (
          <circle key={r.id} cx={x(i)} cy={y(r.value)} r="3.5" fill={pointColor(r.zScore)} stroke="#fff" strokeWidth="1">
            <title>{`${format(new Date(r.measuredAt), 'dd MMM yyyy')}: ${r.value} (z=${r.zScore != null ? r.zScore.toFixed(2) : '—'})`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export default async function IqcPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const filterReject = sp.filter === 'reject';

  const where = await locationWhere();
  const analytes = await prisma.qCAnalyte.findMany({
    where,
    include: {
      levels: {
        include: { results: { orderBy: { measuredAt: 'asc' } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const hasReject = a => a.levels.some(l => l.results.some(r => r.status === 'REJECT'));
  const rejectCount = analytes.reduce((n, a) => n + a.levels.reduce((m, l) => m + l.results.filter(r => r.status === 'REJECT').length, 0), 0);
  const visibleAnalytes = filterReject ? analytes.filter(hasReject) : analytes;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Internal QC — Levey-Jennings</div>
      </div>

      {filterReject && <FilterBar label="QC rejects" count={rejectCount} clearHref="/calibration/iqc" />}

      {visibleAnalytes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <div>{filterReject ? 'No rejected QC results for this centre. 🎉' : 'No internal QC analytes configured.'}</div>
          </div>
        </div>
      ) : (
        visibleAnalytes.map(a => (
          <div key={a.id} className="section">
            <div className="levey-jennings">
              <div className="card-title" style={{ marginBottom: 8 }}>
                <span>
                  {a.name} {a.unit && <span className="text-muted mono" style={{ fontSize: 11 }}>({a.unit})</span>}
                  {a.method && <span className="text-secondary" style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>· {a.method}</span>}
                </span>
                <span className="mono text-secondary" style={{ fontSize: 11 }}>
                  Mean {a.mean} · SD {a.sd}{a.cv != null && ` · CV ${a.cv}%`}
                </span>
              </div>

              {a.levels.length === 0 && (
                <div className="text-muted" style={{ fontSize: 13 }}>No QC levels configured.</div>
              )}

              {a.levels.map(level => {
                const results = level.results;
                // when drilling into rejects, skip levels that have none
                if (filterReject && !results.some(r => r.status === 'REJECT')) return null;
                // build running westgard flags + z for the recent table
                const rows = results.map((r, i) => {
                  const slice = results.slice(0, i + 1).map(x => ({ zScore: x.zScore ?? 0 }));
                  const violations = evaluateWestgard(slice);
                  return { ...r, violations };
                });
                const recent = (filterReject ? rows.filter(r => r.status === 'REJECT') : rows.slice(-12)).reverse();
                const lvMean = level.mean ?? a.mean;
                const lvSd = level.sd ?? a.sd;

                return (
                  <div key={level.id} style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {level.levelName}
                        {level.lotNumber && <span className="mono text-muted" style={{ fontSize: 11, marginLeft: 8 }}>Lot {level.lotNumber}</span>}
                      </div>
                      <div className="mono text-secondary" style={{ fontSize: 11 }}>
                        Mean {lvMean} · SD {lvSd} · n={results.length}
                      </div>
                    </div>

                    {results.length > 0 ? (
                      <>
                        <LJChart mean={lvMean} sd={lvSd} results={results} />
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th><th>Value</th><th>Z</th><th>Westgard</th>
                                <th>Status</th><th>Done By</th><th>Approved By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recent.map(r => {
                                const z = r.zScore;
                                const zCls = z == null ? '' : Math.abs(z) > 3 ? 'zscore-reject' : Math.abs(z) > 2 ? 'zscore-warn' : 'zscore-ok';
                                const flags = (r.westgardFlags && r.westgardFlags.length ? r.westgardFlags.map(f => ({ rule: f, severity: 'REJECT' })) : r.violations);
                                return (
                                  <tr key={r.id}>
                                    <td className="mono" style={{ fontSize: 12 }}>{format(new Date(r.measuredAt), 'dd MMM yy HH:mm')}</td>
                                    <td className="mono">{r.value}</td>
                                    <td className={`zscore-cell ${zCls}`}>{z != null ? z.toFixed(2) : '—'}</td>
                                    <td>
                                      {flags.length === 0
                                        ? <span className="text-muted">—</span>
                                        : flags.map((v, i) => (
                                          <span key={i} className={`flag${v.severity === 'WARNING' ? ' flag-warn' : ''}`}>{v.rule}</span>
                                        ))}
                                    </td>
                                    <td><Badge value={r.status} /></td>
                                    <td className="text-secondary">{r.measuredBy || '—'}</td>
                                    <td className="text-secondary">{r.approvedBy || '—'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted" style={{ fontSize: 13, padding: '12px 0' }}>No results recorded for this level.</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
