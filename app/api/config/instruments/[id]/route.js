// app/api/config/instruments/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { name, manufacturer, group, model, lisMachineId, machineConfigId, locationId } = body;

  const record = await prisma.instrumentConfig.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      manufacturer: manufacturer?.trim() || null,
      group: group?.trim() || null,
      model: model?.trim() || null,
      lisMachineId: lisMachineId?.trim() || null,
      ...(machineConfigId !== undefined && { machineConfigId: machineConfigId || null }),
      ...(locationId !== undefined && { locationId: locationId || null }),
    },
    include: { location: true, machineConfig: true },
  });

  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.instrumentConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
