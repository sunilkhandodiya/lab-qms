// app/api/capa/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const capas = await prisma.capa.findMany({
    include: { owner: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(capas);
}

export async function POST(request) {
  const body = await request.json();
  const count = await prisma.capa.count();
  const capaNumber = `CAPA-${String(count + 1).padStart(3, '0')}`;

  const capa = await prisma.capa.create({
    data: {
      capaNumber,
      title: body.title,
      type: body.type,
      source: body.source,
      description: body.description,
      priority: body.priority || 'MEDIUM',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      ownerId: body.ownerId,
    },
  });
  await prisma.auditLog.create({
    data: { action: 'CAPA_CREATED', entity: 'CAPA', entityId: capa.id, capaId: capa.id },
  });
  return NextResponse.json(capa, { status: 201 });
}
