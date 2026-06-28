// app/api/config/temperatures/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const activeOnly = searchParams.get('active') === 'true';
  const records = await prisma.temperatureConfig.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    include: { location: true },
    orderBy: { label: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { label, value, unit, locationId } = body;
  if (!label?.trim()) return NextResponse.json({ error: 'Label is required.' }, { status: 400 });
  const record = await prisma.temperatureConfig.create({
    data: {
      label: label.trim(),
      value: value != null && value !== '' ? parseFloat(value) : null,
      unit: unit || '°C',
      locationId: locationId || null,
    },
    include: { location: true },
  });
  await prisma.auditLog.create({
    data: { action: 'TEMP_CONFIG_CREATED', entity: 'TemperatureConfig', entityId: record.id, details: { label: record.label } },
  });
  return NextResponse.json(record, { status: 201 });
}
