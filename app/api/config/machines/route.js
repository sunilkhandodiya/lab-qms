// app/api/config/machines/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');
  const activeOnly = searchParams.get('active') === 'true';

  const records = await prisma.machineConfig.findMany({
    where: {
      ...(locationId ? { locationId } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    include: { location: true },
    orderBy: { machineName: 'asc' },
  });
  return NextResponse.json(records);
}

export async function POST(request) {
  const body = await request.json();
  const { machineCode, machineName, systemMachineName, locationId } = body;

  if (!machineCode?.trim()) return NextResponse.json({ error: 'Machine code is required.' }, { status: 400 });
  if (!machineName?.trim()) return NextResponse.json({ error: 'Machine name is required.' }, { status: 400 });

  const record = await prisma.machineConfig.create({
    data: {
      machineCode: machineCode.trim(),
      machineName: machineName.trim(),
      systemMachineName: systemMachineName?.trim() || null,
      locationId: locationId || null,
    },
    include: { location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'MACHINE_CONFIG_CREATED', entity: 'MachineConfig', entityId: record.id, details: { machineName: record.machineName, machineCode: record.machineCode } },
  });

  return NextResponse.json(record, { status: 201 });
}
