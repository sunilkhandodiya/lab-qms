// lib/warnings.js
// Single source of truth for dashboard "warning" records and their acknowledgement
// state. Both the dashboard (app/page.js) and the ack API (app/api/warnings) call
// these so counts and the management UI stay in lockstep.
import { prisma } from '@/lib/prisma';
import { addDays, isBefore } from 'date-fns';

// category -> which Prisma entity backs it + a human label
export const WARNING_CATEGORIES = {
  calib_overdue:    { entity: 'Equipment',  label: 'Overdue calibration' },
  calib_due:        { entity: 'Equipment',  label: 'Calibration due ≤30d' },
  qc_reject:        { entity: 'QCResult',   label: 'QC rejects (recent)' },
  eqas_flag:        { entity: 'EQASResult', label: 'EQAS flags' },
  training_overdue: { entity: 'Training',   label: 'Overdue training' },
  capa_open:        { entity: 'Capa',       label: 'Open CAPAs' },
};

// Context snapshot that, if it later changes, re-flags an acknowledged record.
// Only Equipment can meaningfully change (re-calibration); the rest are historical.
export function contextFor(entity, record) {
  if (entity === 'Equipment') return record?.calibrationDue ? new Date(record.calibrationDue).toISOString() : '';
  return null;
}

// Build the full set of currently-flagged records, keyed by category.
// `where` is the active-centre location filter (same one the dashboard uses);
// Equipment & QC are centre-scoped, EQAS/Training/CAPA are global (matching the dashboard).
export async function buildFlagged(where) {
  const scoped = where && Object.keys(where).length > 0;
  const now = new Date();
  const in30 = addDays(now, 30);
  const qcResultWhere = scoped ? { level: { analyte: { is: where } } } : undefined;

  const [equipment, recentQc, eqas, training, capas] = await Promise.all([
    prisma.equipment.findMany({ where, select: { id: true, name: true, assetId: true, calibrationDue: true } }),
    prisma.qCResult.findMany({
      where: qcResultWhere,
      orderBy: { measuredAt: 'desc' },
      take: 30,
      select: { id: true, status: true, measuredAt: true, level: { select: { analyte: { select: { name: true } } } } },
    }),
    prisma.eQASResult.findMany({
      where: { grade: { in: ['BORDERLINE', 'UNACCEPTABLE'] } },
      select: { id: true, analyte: true, grade: true, cycle: { select: { scheme: { select: { name: true } } } } },
    }),
    prisma.training.findMany({
      where: { status: 'OVERDUE' },
      select: { id: true, dueDate: true, user: { select: { name: true, email: true } }, document: { select: { title: true } } },
    }),
    prisma.capa.findMany({
      where: { status: { not: 'CLOSED' } },
      select: { id: true, capaNumber: true, title: true, priority: true, status: true },
    }),
  ]);

  const equipOverdue = equipment.filter(e => e.calibrationDue && isBefore(new Date(e.calibrationDue), now));
  const equipDue = equipment.filter(e => e.calibrationDue && isBefore(new Date(e.calibrationDue), in30));

  const equipItem = e => ({
    entity: 'Equipment', entityId: e.id, context: contextFor('Equipment', e),
    label: `${e.assetId} · ${e.name}`,
    sub: e.calibrationDue ? `Due ${new Date(e.calibrationDue).toISOString().slice(0, 10)}` : '',
  });

  return {
    calib_overdue: equipOverdue.map(equipItem),
    calib_due: equipDue.map(equipItem),
    qc_reject: recentQc.filter(r => r.status === 'REJECT').map(r => ({
      entity: 'QCResult', entityId: r.id, context: null,
      label: r.level?.analyte?.name || 'QC result',
      sub: new Date(r.measuredAt).toISOString().slice(0, 10),
    })),
    eqas_flag: eqas.map(r => ({
      entity: 'EQASResult', entityId: r.id, context: null,
      label: r.analyte,
      sub: `${r.grade}${r.cycle?.scheme?.name ? ` · ${r.cycle.scheme.name}` : ''}`,
    })),
    training_overdue: training.map(t => ({
      entity: 'Training', entityId: t.id, context: null,
      label: t.user?.name || t.user?.email || 'Trainee',
      sub: t.document?.title || '',
    })),
    capa_open: capas.map(c => ({
      entity: 'Capa', entityId: c.id, context: null, priority: c.priority,
      label: c.capaNumber,
      sub: c.title,
    })),
  };
}

// Map of active acknowledgements keyed by "entity:entityId".
export async function activeAckMap() {
  const acks = await prisma.warningAck.findMany({ where: { active: true } });
  const map = new Map();
  for (const a of acks) map.set(`${a.entity}:${a.entityId}`, a);
  return map;
}

// An item is suppressed only while an active ack exists AND its context still matches
// (so re-calibrating an instrument re-raises the warning).
export function isAcked(ackMap, item) {
  const a = ackMap.get(`${item.entity}:${item.entityId}`);
  if (!a) return false;
  return (a.context ?? null) === (item.context ?? null);
}

// Dashboard-facing counts, with acknowledged records removed.
export async function getDashboardWarnings(where) {
  const [flagged, ackMap] = await Promise.all([buildFlagged(where), activeAckMap()]);
  const visible = cat => flagged[cat].filter(it => !isAcked(ackMap, it));
  const openCapas = visible('capa_open');
  return {
    calibOverdue: visible('calib_overdue').length,
    calibDue: visible('calib_due').length,
    qcRejects: visible('qc_reject').length,
    eqasFlags: visible('eqas_flag').length,
    overdueTraining: visible('training_overdue').length,
    openCapas: openCapas.length,
    criticalOpenCapas: openCapas.filter(it => it.priority === 'CRITICAL').length,
    totalAcked: ackMap.size,
  };
}
