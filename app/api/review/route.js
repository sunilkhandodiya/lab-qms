// app/api/review/route.js
// Review-status workflow for read-only Control & Calibration records.
//  POST  — Dr. Pathology / Admin set or change a record's review status + date.
//          Every change is appended to the immutable AuditLog. (perm: review:update)
//  GET   — Auditor (Quality Manager) / Admin / Pathologist read a record's audit
//          trail. No endpoint ever updates or deletes AuditLog rows. (perm: audit:view)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/permissions';
import { REVIEWABLE, REVIEW_STATUSES } from '@/lib/reviewable';

function clientMeta(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return {
    ipAddress: (fwd ? fwd.split(',')[0].trim() : null) || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!can(session?.user?.role, 'review:update')) {
    return NextResponse.json({ error: 'Only Dr. Pathology or Admin can review records.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { type, id, status, reviewedAt, note } = body || {};
  const target = REVIEWABLE[type];
  if (!target) return NextResponse.json({ error: `Unknown record type: ${type}` }, { status: 400 });
  if (!id) return NextResponse.json({ error: 'Record id is required.' }, { status: 400 });
  if (!REVIEW_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  const model = prisma[target.model];
  const existing = await model.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });

  const when = reviewedAt ? new Date(reviewedAt) : new Date();
  if (isNaN(when.getTime())) return NextResponse.json({ error: 'Invalid review date.' }, { status: 400 });
  const reviewer = session.user.name || session.user.email || 'Unknown';
  const trimmedNote = (note || '').trim() || null;

  try {
    const updated = await model.update({
      where: { id },
      data: {
        reviewStatus: status,
        reviewedAt: when,
        reviewedBy: reviewer,
        reviewNote: trimmedNote,
      },
    });

    const { ipAddress, userAgent } = clientMeta(request);
    await prisma.auditLog.create({
      data: {
        action: 'REVIEW_UPDATED',
        entity: target.entity,
        entityId: id,
        userId: session.user.id,
        details: {
          from: existing.reviewStatus,
          to: status,
          reviewedAt: when.toISOString(),
          note: trimmedNote,
          reviewer,
        },
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      reviewStatus: updated.reviewStatus,
      reviewedAt: updated.reviewedAt,
      reviewedBy: updated.reviewedBy,
      reviewNote: updated.reviewNote,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to update review.' }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!can(session?.user?.role, 'audit:view')) {
    return NextResponse.json({ error: 'Not authorised to view the audit trail.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const target = REVIEWABLE[type];
  if (!target) return NextResponse.json({ error: `Unknown record type: ${type}` }, { status: 400 });
  if (!id) return NextResponse.json({ error: 'Record id is required.' }, { status: 400 });

  const logs = await prisma.auditLog.findMany({
    where: { entity: target.entity, entityId: id },
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(logs.map(l => ({
    id: l.id,
    action: l.action,
    details: l.details,
    createdAt: l.createdAt,
    user: l.user?.name || l.user?.email || 'System',
    role: l.user?.role || null,
    ipAddress: l.ipAddress,
  })));
}
