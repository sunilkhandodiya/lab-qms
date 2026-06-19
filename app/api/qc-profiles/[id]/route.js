// app/api/qc-profiles/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const body = await request.json();
  const profile = await prisma.qCProfile.update({
    where: { id: params.id },
    data: body,
    include: { department: true, location: true },
  });
  return NextResponse.json(profile);
}

export async function DELETE(request, { params }) {
  await prisma.qCProfile.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
