// app/calibration/page.js — Calibration Lot Verification
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format } from 'date-fns';
import GatedForm from './GatedForm';

function YesNo({ value }) {
  return value
    ? <span className="badge badge-yes">Yes</span>
    : <span className="badge badge-no">No</span>;
}

function num(v, suffix = '') {
  return v === null || v === undefined ? '—' : `${v}${suffix}`;
}

export default async function CalibrationLotPage() {
  const where = await locationWhere();
  const rows = await prisma.calibrationVerification.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Calibration Lot Verification</div>
        <GatedForm
          buttonLabel="+ New Verification"
          title="New Calibration Lot Verification"
          type="calibration"
          note="Min. 2 patient samples per calibration; acceptable limits within ±1SD or ±10%."
          diff={{ from: 'valueOldLot', to: 'valueNewLot', target: 'difference' }}
          fields={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'calibrationName', label: 'Calibration Name', required: true },
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

      <div className="alert alert-info">
        Min. 2 patient samples per calibration; acceptable limits within ±1SD or ±10%.
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧪</div>
            <div>No calibration lot verifications recorded yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Calibration Name</th><th>Department</th><th>Instrument</th>
                  <th>Old Lot</th><th>New Lot</th><th>Value (Old)</th><th>Value (New)</th>
                  <th>Difference</th><th>Acceptable Limit</th><th>Acceptable</th>
                  <th>Technician</th><th>Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.calibrationName}</td>
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
