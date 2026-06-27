// app/api/config/assay/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  const records = await prisma.assayConfig.findMany({
    where: locationId ? { locationId } : {},
    include: { location: true },
    orderBy: { analyte: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { analyte, department, method, unit, reagentSupplier, temperature, locationId } = body;

  if (!analyte?.trim()) return NextResponse.json({ error: 'Analyte name is required.' }, { status: 400 });

  const record = await prisma.assayConfig.create({
    data: {
      analyte: analyte.trim(),
      department: department?.trim() || null,
      method: method?.trim() || null,
      unit: unit?.trim() || null,
      reagentSupplier: reagentSupplier?.trim() || null,
      temperature: temperature != null && !isNaN(Number(temperature)) ? Number(temperature) : null,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'ASSAY_CONFIG_CREATED', entity: 'AssayConfig', entityId: record.id, details: { analyte: record.analyte } },
  });

  return NextResponse.json(record, { status: 201 });
}
