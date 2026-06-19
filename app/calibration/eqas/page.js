// app/calibration/eqas/page.js — EQAS / Proficiency Testing
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';

function Badge({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  return (
    <span className={`badge badge-${String(value).toLowerCase().replace(/_/g, '')}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

// Color a score (SDI or Z): |s|>3 reject, >2 warn, else ok
function ScoreCell({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  const a = Math.abs(value);
  const cls = a > 3 ? 'zscore-reject' : a > 2 ? 'zscore-warn' : 'zscore-ok';
  return <span className={`zscore-cell ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(2)}</span>;
}

export default async function EqasPage() {
  const where = await locationWhere();
  const schemes = await prisma.eQASScheme.findMany({
    where,
    include: {
      cycles: {
        include: { results: true },
        orderBy: { dueDate: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">EQAS / Proficiency Testing</div>
      </div>

      {schemes.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🌐</div>
            <div>No EQAS schemes configured.</div>
          </div>
        </div>
      ) : (
        schemes.map(scheme => {
          const isZ = (scheme.scoreType || 'SDI').toUpperCase() === 'ZSCORE';
          const latest = scheme.cycles[0];
          return (
            <div key={scheme.id} className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">
                <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--text-primary)' }}>{scheme.name}</span>
                <span className="mono text-secondary" style={{ fontSize: 11 }}>{isZ ? 'Z-Score' : 'SDI'}</span>
              </div>
              <div className="text-secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                Provider: {scheme.provider} · {scheme.discipline || '—'} · {scheme.frequency}
              </div>

              {!latest ? (
                <div className="text-muted" style={{ fontSize: 13 }}>No cycles recorded.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      Latest cycle: {latest.cycleRef} <Badge value={latest.status} />
                    </span>
                    <span className="mono text-secondary" style={{ fontSize: 11 }}>
                      Due: {format(new Date(latest.dueDate), 'dd MMM yyyy')}
                    </span>
                  </div>

                  {latest.results.length === 0 ? (
                    <div className="text-muted" style={{ fontSize: 13 }}>No results for this cycle.</div>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Analyte</th><th>Your Result</th><th>Peer Mean</th><th>Peer SD</th>
                            <th>{isZ ? 'Z-Score' : 'SDI'}</th><th>Grade</th><th>Performance</th><th>Root Cause</th>
                          </tr>
                        </thead>
                        <tbody>
                          {latest.results.map(r => {
                            const score = isZ ? r.zScore : r.sdi;
                            const unsatisfactory = score != null && Math.abs(score) > 2;
                            return (
                              <tr key={r.id}>
                                <td style={{ fontWeight: 500 }}>
                                  {r.analyte} {r.unit && <span className="text-muted mono" style={{ fontSize: 10 }}>({r.unit})</span>}
                                </td>
                                <td className="mono">{r.yourResult}</td>
                                <td className="mono text-secondary">{r.allLabsMean ?? '—'}</td>
                                <td className="mono text-secondary">{r.allLabsSD ?? '—'}</td>
                                <td><ScoreCell value={score} /></td>
                                <td><Badge value={r.grade} /></td>
                                <td className="text-secondary">{r.performance || '—'}</td>
                                <td className="text-secondary" style={{ fontSize: 12, maxWidth: 220 }}>
                                  {unsatisfactory && r.rootCause ? r.rootCause : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
