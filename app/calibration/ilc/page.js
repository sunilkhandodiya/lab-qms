// app/calibration/ilc/page.js — Inter-Laboratory Comparison
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';
import GatedForm from '../GatedForm';

function YesNo({ value }) {
  return value
    ? <span className="badge badge-yes">Yes</span>
    : <span className="badge badge-no">No</span>;
}

function num(v, suffix = '') {
  return v === null || v === undefined ? '—' : `${v}${suffix}`;
}

export default async function IlcPage() {
  const where = await locationWhere();
  const rows = await prisma.ilc.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Inter-Laboratory Comparison (ILC)</div>
        <GatedForm
          buttonLabel="+ New"
          title="New Inter-Laboratory Comparison"
          type="ilc"
          note="Compare our result against a reference laboratory; difference should fall within the acceptable limit."
          diff={{ from: 'ourResult', to: 'refLabResult', target: 'diffPercent' }}
          fields={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'testName', label: 'Test' },
            { key: 'analyte', label: 'Analyte', required: true },
            { key: 'ourResult', label: 'Our Result', type: 'number' },
            { key: 'refLabResult', label: 'Reference Lab Result', type: 'number' },
            { key: 'diffPercent', label: 'Diff %', type: 'number', readOnly: true, hint: 'Auto-computed' },
            { key: 'comment', label: 'Comment', type: 'textarea' },
            { key: 'acceptable', label: 'Acceptable', type: 'checkbox' },
          ]}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
            <div>No inter-laboratory comparisons recorded yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Test</th><th>Analyte</th><th>Our Result</th>
                  <th>Reference Lab Result</th><th>Diff %</th><th>Acceptable</th><th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className="text-secondary">{r.testName || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.analyte}</td>
                    <td className="mono">{num(r.ourResult)}</td>
                    <td className="mono">{num(r.refLabResult)}</td>
                    <td className="mono">{num(r.diffPercent, '%')}</td>
                    <td><YesNo value={r.acceptable} /></td>
                    <td className="text-secondary" style={{ fontSize: 12, maxWidth: 240 }}>{r.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
