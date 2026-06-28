// app/api/nc/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { status, rootCause, immediateAction, capaId, closedBy } = body;

  const nc = await prisma.nonConformance.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(rootCause !== undefined && { rootCause: rootCause?.trim() || null }),
      ...(immediateAction !== undefined && { immediateAction: immediateAction?.trim() || null }),
      ...(capaId !== undefined && { capaId }),
      ...(status === 'CLOSED' && { closedAt: new Date(), closedBy: closedBy || null }),
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'NC_UPDATED', entity: 'NonConformance', entityId: id, details: { status, ...(rootCause && { rootCause }) } },
  });

  return NextResponse.json(nc);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.nonConformance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
