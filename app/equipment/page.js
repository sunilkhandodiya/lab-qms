// app/equipment/page.js — SOP "Equipment Maintenance & Calibration Log"
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format, differenceInDays } from 'date-fns';
import { CanDo } from '@/components/RoleGuard';
import EquipmentForm from './EquipmentForm';

function Badge({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  return (
    <span className={`badge badge-${String(value).toLowerCase().replace(/_/g, '')}`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

function DueCell({ date, now }) {
  if (!date) return <span className="text-muted">—</span>;
  const d = new Date(date);
  const days = differenceInDays(d, now);
  const cls = days < 0 ? 'zscore-reject' : days <= 30 ? 'zscore-warn' : '';
  return (
    <span className={`mono ${cls}`} style={{ fontSize: 12 }}>
      {format(d, 'dd MMM yyyy')}
      <span className="text-muted"> ({days >= 0 ? `in ${days}d` : `${Math.abs(days)}d overdue`})</span>
    </span>
  );
}

export default async function EquipmentPage() {
  const where = await locationWhere();
  const now = new Date();

  const equipment = await prisma.equipment.findMany({
    where,
    include: {
      calibrations: { orderBy: { performedAt: 'desc' }, take: 1 },
      maintenances: { orderBy: { performedAt: 'desc' }, take: 1 },
    },
    orderBy: { assetId: 'asc' },
  });

  // Full calibration + maintenance history for the records / log sections.
  const ids = equipment.map(e => e.id);
  const allCalibrations = ids.length
    ? await prisma.calibration.findMany({
        where: { equipmentId: { in: ids } },
        orderBy: { performedAt: 'desc' },
      })
    : [];
  const allMaintenances = ids.length
    ? await prisma.maintenance.findMany({
        where: { equipmentId: { in: ids } },
        include: { equipment: true },
        orderBy: { performedAt: 'desc' },
      })
    : [];

  const calibByEq = {};
  for (const c of allCalibrations) (calibByEq[c.equipmentId] ||= []).push(c);

  // Stats
  let calibDueSoon = 0, calibOverdue = 0, pmDueSoon = 0, pmOverdue = 0, outOfService = 0;
  for (const eq of equipment) {
    if (eq.calibrationDue) {
      const d = differenceInDays(new Date(eq.calibrationDue), now);
      if (d < 0) { calibOverdue++; calibDueSoon++; }
      else if (d <= 30) calibDueSoon++;
    }
    if (eq.pmDue) {
      const d = differenceInDays(new Date(eq.pmDue), now);
      if (d < 0) { pmOverdue++; pmDueSoon++; }
      else if (d <= 30) pmDueSoon++;
    }
    if (eq.status !== 'ACTIVE') outOfService++;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Equipment & Maintenance</div>
          <div className="page-subtitle">Asset register · Calibration · Preventive maintenance</div>
        </div>
        <CanDo permission="equipment:add"><EquipmentForm /></CanDo>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card stat-accent-blue">
          <div className="stat-label">Total Equipment</div>
          <div className="stat-value">{equipment.length}</div>
        </div>
        <div className="stat-card stat-accent-amber">
          <div className="stat-label">Calibration Due ≤30d</div>
          <div className="stat-value">{calibDueSoon}</div>
        </div>
        <div className="stat-card stat-accent-teal">
          <div className="stat-label">PM Due ≤30d</div>
          <div className="stat-value">{pmDueSoon}</div>
        </div>
        <div className="stat-card stat-accent-red">
          <div className="stat-label">Out of Service</div>
          <div className="stat-value">{outOfService}</div>
        </div>
      </div>

      {(calibOverdue > 0 || pmOverdue > 0) && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calibOverdue > 0 && (
            <div className="alert alert-error">
              {calibOverdue} instrument{calibOverdue > 1 ? 's are' : ' is'} overdue for calibration.
            </div>
          )}
          {pmOverdue > 0 && (
            <div className="alert alert-warn">
              {pmOverdue} instrument{pmOverdue > 1 ? 's are' : ' is'} overdue for preventive maintenance.
            </div>
          )}
        </div>
      )}

      {/* Equipment List */}
      <div className="section">
        <div className="card">
          <div className="card-title">Equipment List</div>
          {equipment.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              No equipment registered for this centre.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset ID</th><th>Name</th><th>Type</th><th>Make / Model</th>
                    <th>Dept</th><th>Serial No</th><th>Agency</th><th>Frequency</th>
                    <th>Status</th><th>Calibration Due</th><th>PM Due</th><th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map(eq => (
                    <tr key={eq.id}>
                      <td className="mono">{eq.assetId}</td>
                      <td style={{ fontWeight: 500 }}>{eq.name}</td>
                      <td className="text-secondary">{eq.type ?? '—'}</td>
                      <td className="text-secondary" style={{ fontSize: 12 }}>
                        {eq.manufacturer || eq.model ? `${eq.manufacturer ?? ''}${eq.manufacturer && eq.model ? ' · ' : ''}${eq.model ?? ''}` : '—'}
                      </td>
                      <td className="text-secondary">{eq.department ?? '—'}</td>
                      <td className="mono text-secondary" style={{ fontSize: 12 }}>{eq.serialNumber ?? '—'}</td>
                      <td className="text-secondary">{eq.agency ?? '—'}</td>
                      <td className="text-secondary">{eq.frequency ?? '—'}</td>
                      <td><Badge value={eq.status} /></td>
                      <td><DueCell date={eq.calibrationDue} now={now} /></td>
                      <td><DueCell date={eq.pmDue} now={now} /></td>
                      <td className="text-secondary">{eq.contactPerson ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calibration Records */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Calibration Records</div>
        </div>
        <div className="grid-2">
          {equipment.map(eq => {
            const records = calibByEq[eq.id] || [];
            return (
              <div key={eq.id} className="card">
                <div className="card-title">{eq.assetId} — {eq.name}</div>
                {records.length > 0 ? (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr><th>Date</th><th>By</th><th>Result</th><th>Cert #</th></tr>
                      </thead>
                      <tbody>
                        {records.map(c => (
                          <tr key={c.id}>
                            <td className="mono" style={{ fontSize: 11 }}>{format(new Date(c.performedAt), 'dd MMM yy')}</td>
                            <td className="text-secondary" style={{ fontSize: 12 }}>{c.performedBy}</td>
                            <td><Badge value={c.result} /></td>
                            <td className="mono text-muted" style={{ fontSize: 10 }}>{c.certificate ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: 13 }}>No calibration records</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Maintenance & PM Log */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Maintenance & PM Log</div>
        </div>
        <div className="card">
          {allMaintenances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛠️</div>
              No maintenance or preventive maintenance records.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Equipment</th><th>Type</th><th>Performed At</th><th>Performed By</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {allMaintenances.map(m => (
                    <tr key={m.id}>
                      <td>
                        <span className="mono">{m.equipment?.assetId}</span>
                        <span className="text-secondary"> · {m.equipment?.name}</span>
                      </td>
                      <td className="text-secondary">{m.type}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{format(new Date(m.performedAt), 'dd MMM yyyy')}</td>
                      <td className="text-secondary">{m.performedBy}</td>
                      <td className="text-secondary" style={{ fontSize: 12 }}>{m.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
