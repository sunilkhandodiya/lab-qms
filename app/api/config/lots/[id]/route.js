// app/api/config/lots/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { lotNo, name, expiry, department, locationId, active } = body;

  const record = await prisma.lotConfig.update({
    where: { id },
    data: {
      ...(lotNo !== undefined && { lotNo: lotNo.trim() }),
      ...(name !== undefined && { name: name.trim() }),
      expiry: expiry !== undefined ? (expiry ? new Date(expiry) : null) : undefined,
      department: department !== undefined ? (department?.trim() || null) : undefined,
      ...(locationId !== undefined && { locationId: locationId || null }),
      ...(active !== undefined && { active }),
    },
    include: { location: true },
  });

  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.lotConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
