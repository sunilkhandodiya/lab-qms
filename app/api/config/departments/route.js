// app/api/config/departments/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const activeOnly = searchParams.get('active') === 'true';

  const records = await prisma.departmentConfig.findMany({
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
  const { name, locationId } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });

  const record = await prisma.departmentConfig.create({
    data: {
      name: name.trim(),
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'DEPT_CONFIG_CREATED', entity: 'DepartmentConfig', entityId: record.id, details: { name: record.name } },
  });

  return NextResponse.json(record, { status: 201 });
}
