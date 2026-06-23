// app/api/warnings/route.js
// Acknowledge / un-acknowledge dashboard warning records.
//  GET  ?category= — list the flagged records for a warning category + their ack
//        state, scoped to the active centre. (any signed-in user may view)
//  POST  — Admin / Dr. Pathology acknowledge or un-acknowledge a flagged record so
//        it drops off (or returns to) the dashboard. Every change is appended to the
//        immutable AuditLog. (perm: warning:ack)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { locationWhere } from '@/lib/location';
import { buildFlagged, activeAckMap, isAcked, contextFor, WARNING_CATEGORIES } from '@/lib/warnings';

function clientMeta(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return {
    ipAddress: (fwd ? fwd.split(',')[0].trim() : null) || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  if (!WARNING_CATEGORIES[category]) {
    return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
  }

  const where = await locationWhere();
  const [flagged, ackMap] = await Promise.all([buildFlagged(where), activeAckMap()]);
  const items = flagged[category].map(it => {
    const ack = ackMap.get(`${it.entity}:${it.entityId}`);
    const acked = isAcked(ackMap, it);
    return {
      entity: it.entity,
      entityId: it.entityId,
      label: it.label,
      sub: it.sub,
      acked,
      ackNote: acked ? ack?.note || null : null,
      ackedBy: acked ? ack?.ackedBy || null : null,
      ackedAt: acked ? ack?.ackedAt || null : null,
    };
  });

  return NextResponse.json({ category, canAck: can(session.user.role, 'warning:ack'), items });
}

// entity -> a loader so we can re-derive the context snapshot server-side (never trust the client)
const LOADERS = {
  Equipment:  id => prisma.equipment.findUnique({ where: { id }, select: { id: true, calibrationDue: true } }),
  QCResult:   id => prisma.qCResult.findUnique({ where: { id }, select: { id: true } }),
  EQASResult: id => prisma.eQASResult.findUnique({ where: { id }, select: { id: true } }),
  Training:   id => prisma.training.findUnique({ where: { id }, select: { id: true } }),
  Capa:       id => prisma.capa.findUnique({ where: { id }, select: { id: true } }),
};

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!can(session?.user?.role, 'warning:ack')) {
    return NextResponse.json({ error: 'Only Dr. Pathology or Admin can acknowledge warnings.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { entity, entityId, category, note, active = true } = body || {};
  const meta = WARNING_CATEGORIES[category];
  if (!meta) return NextResponse.json({ error: `Unknown category: ${category}` }, { status: 400 });
  if (meta.entity !== entity) return NextResponse.json({ error: 'Entity does not match category.' }, { status: 400 });
  if (!entityId) return NextResponse.json({ error: 'entityId is required.' }, { status: 400 });

  const loader = LOADERS[entity];
  if (!loader) return NextResponse.json({ error: `Unsupported entity: ${entity}` }, { status: 400 });
  const record = await loader(entityId);
  if (!record) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

  const context = contextFor(entity, record);
  const who = session.user.name || session.user.email || 'Unknown';
  const trimmedNote = (note || '').trim() || null;
  const isActive = !!active;

  try {
    await prisma.warningAck.upsert({
      where: { entity_entityId: { entity, entityId } },
      create: { entity, entityId, category, context, note: trimmedNote, active: isActive, ackedBy: who, ackedById: session.user.id },
      update: { category, context, note: trimmedNote, active: isActive, ackedBy: who, ackedById: session.user.id },
    });

    const { ipAddress, userAgent } = clientMeta(request);
    await prisma.auditLog.create({
      data: {
        action: isActive ? 'WARNING_ACK' : 'WARNING_UNACK',
        entity,
        entityId,
        userId: session.user.id,
        details: { category, note: trimmedNote, by: who },
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true, acked: isActive });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to update acknowledgement.' }, { status: 500 });
  }
}
