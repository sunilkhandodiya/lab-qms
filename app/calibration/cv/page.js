// app/calibration/cv/page.js — CV% Monitoring
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';

// Color CV%: >8% reject (red), >5% warn (amber), else plain
function CvCell({ cv }) {
  if (cv === null || cv === undefined) return <span className="text-muted">—</span>;
  const cls = cv > 8 ? 'zscore-reject' : cv > 5 ? 'zscore-warn' : '';
  return <span className={`zscore-cell ${cls}`}>{cv}%</span>;
}

export default async function CvPage() {
  const where = await locationWhere();
  const records = await prisma.cvRecord.findMany({
    where,
    orderBy: [{ department: 'asc' }, { parameter: 'asc' }],
  });

  // Group by department, then pivot level rows (L1/L2/L3) per parameter+method+month
  const byDept = {};
  for (const r of records) {
    const dept = r.department || 'Unassigned';
    byDept[dept] ??= {};
    const key = `${r.parameter}||${r.method || ''}||${r.month ? new Date(r.month).toISOString().slice(0, 7) : ''}`;
    byDept[dept][key] ??= {
      parameter: r.parameter,
      method: r.method,
      month: r.month,
      noOfPoints: r.noOfPoints,
      levels: {},
    };
    const lvl = (r.level || '').toUpperCase();
    byDept[dept][key].levels[lvl] = r.cv;
    if (r.noOfPoints != null) byDept[dept][key].noOfPoints = r.noOfPoints;
  }

  const depts = Object.keys(byDept).sort();

  return (
    <div>
      <div className="section-header">
        <div className="section-title">CV% Monitoring</div>
      </div>

      <div className="alert alert-info">
        Coefficient of Variation tracked per parameter and level. CV &gt; 5% flagged amber, &gt; 8% flagged red.
      </div>

      {depts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div>No CV% records available.</div>
          </div>
        </div>
      ) : (
        depts.map(dept => {
          const rows = Object.values(byDept[dept]);
          return (
            <div key={dept} className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">{dept}</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Parameter</th><th>Method</th>
                      <th>L1 CV%</th><th>L2 CV%</th><th>L3 CV%</th>
                      <th>No. of Points</th><th>Month</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{row.parameter}</td>
                        <td className="text-secondary">{row.method || '—'}</td>
                        <td><CvCell cv={row.levels.L1} /></td>
                        <td><CvCell cv={row.levels.L2} /></td>
                        <td><CvCell cv={row.levels.L3} /></td>
                        <td className="mono">{row.noOfPoints ?? '—'}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{row.month ? format(new Date(row.month), 'MMM yyyy') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
