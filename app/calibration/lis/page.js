// app/calibration/lis/page.js — LIS Verification
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';
import GatedForm from '../GatedForm';
import ReviewControl from '@/components/ReviewControl';

function YesNo({ value }) {
  return value
    ? <span className="badge badge-yes">Yes</span>
    : <span className="badge badge-no">No</span>;
}

function num(v, suffix = '') {
  return v === null || v === undefined ? '—' : `${v}${suffix}`;
}

export default async function LisPage() {
  const where = await locationWhere();
  const rows = await prisma.lisVerification.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">LIS Verification</div>
        <GatedForm
          buttonLabel="+ New"
          title="New LIS Verification"
          type="lis"
          note="Verify that the result on the equipment matches the value transferred to the LIS."
          diff={{ from: 'equipmentResult', to: 'transferredResult', target: 'diffPercent' }}
          fields={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'barcode', label: 'Barcode' },
            { key: 'parameter', label: 'Parameter', required: true },
            { key: 'equipmentResult', label: 'Equipment Result', type: 'number' },
            { key: 'transferredTo', label: 'Transferred To' },
            { key: 'transferredResult', label: 'Transferred Result', type: 'number' },
            { key: 'diffPercent', label: 'Diff %', type: 'number', readOnly: true, hint: 'Auto-computed' },
            { key: 'recordedBy', label: 'Recorded By' },
            { key: 'acceptable', label: 'Acceptable', type: 'checkbox' },
          ]}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🖥️</div>
            <div>No LIS verifications recorded yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Barcode</th><th>Parameter</th><th>Equipment Result</th>
                  <th>Transferred To</th><th>Transferred Result</th><th>Diff %</th>
                  <th>Acceptable</th><th>Recorded By</th><th>Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.barcode || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.parameter}</td>
                    <td className="mono">{num(r.equipmentResult)}</td>
                    <td className="text-secondary">{r.transferredTo || '—'}</td>
                    <td className="mono">{num(r.transferredResult)}</td>
                    <td className="mono">{num(r.diffPercent, '%')}</td>
                    <td><YesNo value={r.acceptable} /></td>
                    <td className="text-secondary">{r.recordedBy || '—'}</td>
                    <td><ReviewControl type="lis" id={r.id} status={r.reviewStatus} reviewedAt={r.reviewedAt} reviewedBy={r.reviewedBy} reviewNote={r.reviewNote} /></td>
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
