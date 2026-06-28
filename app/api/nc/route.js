// app/api/nc/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';

export async function GET() {
  const where = await locationWhere();
  const ncs = await prisma.nonConformance.findMany({
    where,
    include: { location: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(ncs);
}

export async function POST(request) {
  const body = await request.json();
  const { title, type, source, severity, department, description, detectedBy, locationId, immediateAction } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  if (!type) return NextResponse.json({ error: 'Type is required.' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
  if (!detectedBy?.trim()) return NextResponse.json({ error: 'Detected by is required.' }, { status: 400 });

  const count = await prisma.nonConformance.count();
  const ncNumber = 'NC-' + String(count + 1).padStart(4, '0');

  const nc = await prisma.nonConformance.create({
    data: {
      ncNumber,
      title: title.trim(),
      type,
      source: source || 'STAFF_OBSERVATION',
      severity: severity || 'MINOR',
      department: department?.trim() || null,
      description: description.trim(),
      detectedBy: detectedBy.trim(),
      immediateAction: immediateAction?.trim() || null,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'NC_CREATED', entity: 'NonConformance', entityId: nc.id, details: { ncNumber, title } },
  });

  return NextResponse.json(nc, { status: 201 });
}
