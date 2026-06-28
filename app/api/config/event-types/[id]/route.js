// app/api/config/event-types/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { name, category, locationId, active } = body;
  const record = await prisma.eventTypeConfig.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(category !== undefined && { category: category?.trim() || null }),
      ...(locationId !== undefined && { locationId: locationId || null }),
      ...(active !== undefined && { active }),
    },
    include: { location: true },
  });
  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.eventTypeConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
