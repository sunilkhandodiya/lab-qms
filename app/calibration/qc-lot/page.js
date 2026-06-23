// app/calibration/qc-lot/page.js — QC Lot Verification
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

export default async function QcLotPage() {
  const where = await locationWhere();
  const rows = await prisma.qcLotVerification.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">QC Lot Verification</div>
        <GatedForm
          buttonLabel="+ New Verification"
          title="New QC Lot Verification"
          type="qclot"
          note="Verify new QC lot against the in-use lot before changeover; difference should fall within the acceptable limit."
          diff={{ from: 'valueOldLot', to: 'valueNewLot', target: 'difference' }}
          fields={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'qcName', label: 'QC Name', required: true },
            { key: 'department', label: 'Department' },
            { key: 'instrument', label: 'Instrument' },
            { key: 'oldLot', label: 'Old Lot' },
            { key: 'newLot', label: 'New Lot' },
            { key: 'valueOldLot', label: 'Value (Old Lot)', type: 'number' },
            { key: 'valueNewLot', label: 'Value (New Lot)', type: 'number' },
            { key: 'difference', label: 'Difference %', type: 'number', readOnly: true, hint: 'Auto-computed' },
            { key: 'acceptableLimit', label: 'Acceptable Limit', placeholder: 'e.g. ±10%' },
            { key: 'technicianBy', label: 'Technician' },
            { key: 'supervisorBy', label: 'Supervisor' },
            { key: 'acceptable', label: 'Acceptable', type: 'checkbox' },
          ]}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧫</div>
            <div>No QC lot verifications recorded yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>QC Name</th><th>Department</th><th>Instrument</th>
                  <th>Old Lot</th><th>New Lot</th><th>Value (Old)</th><th>Value (New)</th>
                  <th>Difference</th><th>Acceptable Limit</th><th>Acceptable</th>
                  <th>Technician</th><th>Supervisor</th><th>Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.qcName}</td>
                    <td className="text-secondary">{r.department || '—'}</td>
                    <td className="text-secondary">{r.instrument || '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.oldLot || '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.newLot || '—'}</td>
                    <td className="mono">{num(r.valueOldLot)}</td>
                    <td className="mono">{num(r.valueNewLot)}</td>
                    <td className="mono">{num(r.difference, '%')}</td>
                    <td className="text-secondary">{r.acceptableLimit || '—'}</td>
                    <td><YesNo value={r.acceptable} /></td>
                    <td className="text-secondary">{r.technicianBy || '—'}</td>
                    <td className="text-secondary">{r.supervisorBy || '—'}</td>
                    <td><ReviewControl type="qclot" id={r.id} status={r.reviewStatus} reviewedAt={r.reviewedAt} reviewedBy={r.reviewedBy} reviewNote={r.reviewNote} /></td>
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
