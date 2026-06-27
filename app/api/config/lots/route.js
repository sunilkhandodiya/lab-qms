// app/api/config/lots/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  const records = await prisma.lotConfig.findMany({
    where: locationId ? { locationId } : {},
    include: { location: true },
    orderBy: { lotNo: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { lotNo, name, expiry, department, locationId } = body;

  if (!lotNo?.trim()) return NextResponse.json({ error: 'Lot number is required.' }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: 'Lot name is required.' }, { status: 400 });

  const record = await prisma.lotConfig.create({
    data: {
      lotNo: lotNo.trim(),
      name: name.trim(),
      expiry: expiry ? new Date(expiry) : null,
      department: department?.trim() || null,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'LOT_CONFIG_CREATED', entity: 'LotConfig', entityId: record.id, details: { lotNo: record.lotNo, name: record.name } },
  });

  return NextResponse.json(record, { status: 201 });
}
