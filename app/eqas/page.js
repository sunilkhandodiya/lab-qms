// app/eqas/page.js
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

function Badge({ value }) {
  return <span className={`badge badge-${value?.toLowerCase().replace(/_/g, '')}`}>{value?.replace(/_/g, ' ')}</span>;
}

function SDIBar({ sdi }) {
  if (sdi == null) return <span className="text-muted">—</span>;
  const abs = Math.abs(sdi);
  const color = abs > 3 ? '#ef4444' : abs > 2 ? '#f59e0b' : abs > 1 ? '#3b82f6' : '#22c55e';
  // Map sdi [-4..4] to percentage for bar width, centered at 50%
  const clampedPct = Math.min(Math.abs(sdi) / 4, 1) * 50;
  const isNeg = sdi < 0;

  return (
    <div className="sdi-bar-wrap">
      <span className="mono" style={{ fontSize: 11, color, minWidth: 36, textAlign: 'right' }}>{sdi.toFixed(2)}</span>
      <div className="sdi-bar">
        <div className="sdi-center" />
        <div className="sdi-fill" style={{
          width: `${clampedPct}%`,
          left: isNeg ? `${50 - clampedPct}%` : '50%',
          background: color,
          opacity: 0.8,
        }} />
      </div>
    </div>
  );
}

export default async function EQASPage() {
  const schemes = await prisma.eQASScheme.findMany({
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
      <div className="page-header">
        <div className="page-title">EQAS / Proficiency Testing</div>
        <div className="page-subtitle">External Quality Assessment Scheme tracking · SDI monitoring</div>
      </div>

      {schemes.map(scheme => (
        <div key={scheme.id} className="section">
          <div className="section-header">
            <div>
              <div className="section-title">{scheme.name}</div>
              <div className="text-secondary" style={{ fontSize: 12, marginTop: 2 }}>
                Provider: {scheme.provider} · {scheme.frequency} · Accreditation: {scheme.accreditBody ?? '—'}
              </div>
            </div>
            <div>
              <span className="mono text-secondary" style={{ fontSize: 11 }}>
                Analytes: {scheme.analytes.join(', ')}
              </span>
            </div>
          </div>

          {scheme.cycles.map(cycle => (
            <div key={cycle.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span className="section-title" style={{ fontSize: 14 }}>{cycle.cycleRef}</span>
                  <span style={{ marginLeft: 12 }}>
                    <Badge value={cycle.status} />
                  </span>
                </div>
                <div className="text-secondary mono" style={{ fontSize: 11 }}>
                  Due: {format(new Date(cycle.dueDate), 'dd MMM yyyy')}
                  {cycle.submittedAt && ` · Submitted: ${format(new Date(cycle.submittedAt), 'dd MMM yyyy')}`}
                </div>
              </div>

              {cycle.results.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Analyte</th>
                        <th>Your Result</th>
                        <th>Peer Mean</th>
                        <th>Peer SD</th>
                        <th>Bias %</th>
                        <th>SDI</th>
                        <th>Grade</th>
                        <th>CAPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cycle.results.map(r => (
                        <tr key={r.id}>
                          <td>{r.analyte} {r.unit && <span className="text-muted mono" style={{ fontSize: 10 }}>({r.unit})</span>}</td>
                          <td className="mono">{r.yourResult}</td>
                          <td className="mono text-secondary">{r.allLabsMean ?? '—'}</td>
                          <td className="mono text-secondary">{r.allLabsSD ?? '—'}</td>
                          <td className={`mono ${Math.abs(r.biasPercent ?? 0) > 5 ? 'zscore-warn' : ''}`}>
                            {r.biasPercent != null ? `${r.biasPercent > 0 ? '+' : ''}${r.biasPercent.toFixed(1)}%` : '—'}
                          </td>
                          <td style={{ minWidth: 160 }}><SDIBar sdi={r.sdi} /></td>
                          <td><Badge value={r.grade} /></td>
                          <td>
                            {r.capaRaised
                              ? <span className="badge badge-reject">CAPA raised</span>
                              : <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted" style={{ padding: '16px 0', fontSize: 13 }}>
                  {cycle.status === 'PENDING' ? 'Awaiting dispatch from scheme provider.' : 'No results submitted yet.'}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
