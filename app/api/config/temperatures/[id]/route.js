// app/api/config/temperatures/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { label, value, unit, locationId, active } = body;
  const record = await prisma.temperatureConfig.update({
    where: { id },
    data: {
      ...(label !== undefined && { label: label.trim() }),
      ...(value !== undefined && { value: value != null && value !== '' ? parseFloat(value) : null }),
      ...(unit !== undefined && { unit }),
      ...(locationId !== undefined && { locationId: locationId || null }),
      ...(active !== undefined && { active }),
    },
    include: { location: true },
  });
  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.temperatureConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
