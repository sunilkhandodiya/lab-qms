// app/api/config/instruments/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  const records = await prisma.instrumentConfig.findMany({
    where: locationId ? { locationId } : {},
    include: { location: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { name, manufacturer, group, model, lisMachineId, locationId } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Instrument name is required.' }, { status: 400 });

  const record = await prisma.instrumentConfig.create({
    data: {
      name: name.trim(),
      manufacturer: manufacturer?.trim() || null,
      group: group?.trim() || null,
      model: model?.trim() || null,
      lisMachineId: lisMachineId?.trim() || null,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'INSTRUMENT_CONFIG_CREATED', entity: 'InstrumentConfig', entityId: record.id, details: { name: record.name } },
  });

  return NextResponse.json(record, { status: 201 });
}
