// app/equipment/page.js — SOP "Equipment Maintenance & Calibration Log"
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { format, differenceInDays } from 'date-fns';
import { CanDo } from '@/components/RoleGuard';
import EquipmentForm from './EquipmentForm';
import FilterBar from '@/components/FilterBar';

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

export default async function EquipmentPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const filter = sp.filter;
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

  // Drill-down filter for the Equipment List section.
  const FILTER_LABELS = {
    caldue: 'Calibration due ≤30 days',
    pmdue: 'PM due ≤30 days',
    oos: 'Out of service',
  };
  const filterLabel = FILTER_LABELS[filter];
  let listEquipment = equipment;
  if (filter === 'caldue') {
    listEquipment = equipment.filter(eq => eq.calibrationDue && differenceInDays(new Date(eq.calibrationDue), now) <= 30);
  } else if (filter === 'pmdue') {
    listEquipment = equipment.filter(eq => eq.pmDue && differenceInDays(new Date(eq.pmDue), now) <= 30);
  } else if (filter === 'oos') {
    listEquipment = equipment.filter(eq => eq.status !== 'ACTIVE');
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

      {filterLabel && <FilterBar label={filterLabel} count={listEquipment.length} clearHref="/equipment" />}

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Link href="/equipment" className="stat-card stat-accent-blue" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Total Equipment</div>
          <div className="stat-value">{equipment.length}</div>
        </Link>
        <Link href="/equipment?filter=caldue" className="stat-card stat-accent-amber" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Calibration Due ≤30d</div>
          <div className="stat-value">{calibDueSoon}</div>
        </Link>
        <Link href="/equipment?filter=pmdue" className="stat-card stat-accent-teal" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">PM Due ≤30d</div>
          <div className="stat-value">{pmDueSoon}</div>
        </Link>
        <Link href="/equipment?filter=oos" className="stat-card stat-accent-red" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-label">Out of Service</div>
          <div className="stat-value">{outOfService}</div>
        </Link>
      </div>

      {(calibOverdue > 0 || pmOverdue > 0) && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calibOverdue > 0 && (
            <Link href="/equipment?filter=caldue" className="alert alert-error" style={{ textDecoration: 'none' }}>
              {calibOverdue} instrument{calibOverdue > 1 ? 's are' : ' is'} overdue for calibration.
            </Link>
          )}
          {pmOverdue > 0 && (
            <Link href="/equipment?filter=pmdue" className="alert alert-warn" style={{ textDecoration: 'none' }}>
              {pmOverdue} instrument{pmOverdue > 1 ? 's are' : ' is'} overdue for preventive maintenance.
            </Link>
          )}
        </div>
      )}

      {/* Equipment List */}
      <div className="section">
        <div className="card">
          <div className="card-title">Equipment List</div>
          {listEquipment.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔬</div>
              {filter === 'caldue'
                ? 'No equipment is due for calibration within 30 days.'
                : filter === 'pmdue'
                ? 'No equipment is due for preventive maintenance within 30 days.'
                : filter === 'oos'
                ? 'No equipment is out of service.'
                : 'No equipment registered for this centre.'}
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
                  {listEquipment.map(eq => (
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
