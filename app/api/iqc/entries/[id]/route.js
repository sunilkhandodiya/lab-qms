// app/api/iqc/entries/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { approvalStatus, approvedBy, approvalNote, lot1Value, lot2Value, lot3Value, measuredBy } = body;
  const entry = await prisma.qCEntry.update({
    where: { id },
    data: {
      ...(approvalStatus !== undefined && { approvalStatus }),
      ...(approvedBy !== undefined && { approvedBy }),
      ...(approvalNote !== undefined && { approvalNote }),
      ...(approvedBy !== undefined && approvalStatus === 'APPROVED' && { approvedAt: new Date() }),
      ...(measuredBy !== undefined && { measuredBy }),
    },
  });
  await prisma.auditLog.create({
    data: { action: 'QC_ENTRY_UPDATED', entity: 'QCEntry', entityId: id, details: body },
  });
  return NextResponse.json(entry);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.qCEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
