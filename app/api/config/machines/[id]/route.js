// app/api/config/machines/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { machineCode, machineName, systemMachineName, locationId, active } = body;

  const record = await prisma.machineConfig.update({
    where: { id },
    data: {
      ...(machineCode !== undefined && { machineCode: machineCode.trim() }),
      ...(machineName !== undefined && { machineName: machineName.trim() }),
      ...(systemMachineName !== undefined && { systemMachineName: systemMachineName?.trim() || null }),
      ...(locationId !== undefined && { locationId: locationId || null }),
      ...(active !== undefined && { active }),
    },
    include: { location: true },
  });

  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.machineConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
