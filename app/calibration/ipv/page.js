// app/calibration/ipv/page.js — Inter-Personnel Validation
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

export default async function IpvPage() {
  const where = await locationWhere();
  const rows = await prisma.interPersonnelValidation.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Inter-Personnel Validation (IPV)</div>
        <GatedForm
          buttonLabel="+ New"
          title="New Inter-Personnel Validation"
          type="ipv"
          note="Compare results across machines/operators for the same parameter; difference should fall within the acceptable limit."
          diff={{ from: 'resultA', to: 'resultB', target: 'diffPercent' }}
          fields={[
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'department', label: 'Department' },
            { key: 'machineA', label: 'Machine A' },
            { key: 'machineB', label: 'Machine B' },
            { key: 'parameter', label: 'Parameter', required: true },
            { key: 'resultA', label: 'Result A', type: 'number' },
            { key: 'resultB', label: 'Result B', type: 'number' },
            { key: 'diffPercent', label: 'Diff %', type: 'number', readOnly: true, hint: 'Auto-computed' },
            { key: 'comment', label: 'Comment', type: 'textarea' },
            { key: 'acceptable', label: 'Acceptable', type: 'checkbox' },
          ]}
        />
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div>No inter-personnel validations recorded yet.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Department</th><th>Machine A</th><th>Machine B</th>
                  <th>Parameter</th><th>Result A</th><th>Result B</th><th>Diff %</th><th>Acceptable</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontSize: 12 }}>{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className="text-secondary">{r.department || '—'}</td>
                    <td className="text-secondary">{r.machineA || '—'}</td>
                    <td className="text-secondary">{r.machineB || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{r.parameter}</td>
                    <td className="mono">{num(r.resultA)}</td>
                    <td className="mono">{num(r.resultB)}</td>
                    <td className="mono">{num(r.diffPercent, '%')}</td>
                    <td><YesNo value={r.acceptable} /></td>
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
