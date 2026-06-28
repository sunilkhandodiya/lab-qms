// app/api/config/event-types/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const activeOnly = searchParams.get('active') === 'true';
  const records = await prisma.eventTypeConfig.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    include: { location: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { name, category, locationId } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Event type name is required.' }, { status: 400 });
  const record = await prisma.eventTypeConfig.create({
    data: { name: name.trim(), category: category?.trim() || null, locationId: locationId || null },
    include: { location: true },
  });
  await prisma.auditLog.create({
    data: { action: 'EVENT_TYPE_CREATED', entity: 'EventTypeConfig', entityId: record.id, details: { name: record.name } },
  });
  return NextResponse.json(record, { status: 201 });
}
