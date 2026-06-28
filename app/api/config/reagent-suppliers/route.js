// app/api/config/reagent-suppliers/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const activeOnly = searchParams.get('active') === 'true';
  const records = await prisma.reagentSupplierConfig.findMany({
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
  const { name, code, locationId } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Supplier name is required.' }, { status: 400 });
  const record = await prisma.reagentSupplierConfig.create({
    data: { name: name.trim(), code: code?.trim() || null, locationId: locationId || null },
    include: { location: true },
  });
  await prisma.auditLog.create({
    data: { action: 'REAGENT_SUPPLIER_CREATED', entity: 'ReagentSupplierConfig', entityId: record.id, details: { name: record.name } },
  });
  return NextResponse.json(record, { status: 201 });
}
