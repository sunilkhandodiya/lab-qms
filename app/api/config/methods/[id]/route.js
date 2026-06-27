// app/api/config/methods/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { name, locationId, active } = body;

  const record = await prisma.methodConfig.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(locationId !== undefined && { locationId: locationId || null }),
      ...(active !== undefined && { active }),
    },
    include: { location: true },
  });

  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.methodConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
