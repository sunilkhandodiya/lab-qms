// app/api/iqc/targets/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { targetType, effectiveFrom, lot1Mean, lot1SD, lot2Mean, lot2SD, lot3Mean, lot3SD, active } = body;
  const target = await prisma.qCTestTarget.update({
    where: { id },
    data: {
      ...(targetType !== undefined && { targetType }),
      ...(effectiveFrom !== undefined && { effectiveFrom: new Date(effectiveFrom) }),
      ...(lot1Mean !== undefined && { lot1Mean: lot1Mean != null && lot1Mean !== '' ? parseFloat(lot1Mean) : null }),
      ...(lot1SD   !== undefined && { lot1SD:   lot1SD   != null && lot1SD   !== '' ? parseFloat(lot1SD)   : null }),
      ...(lot2Mean !== undefined && { lot2Mean: lot2Mean != null && lot2Mean !== '' ? parseFloat(lot2Mean) : null }),
      ...(lot2SD   !== undefined && { lot2SD:   lot2SD   != null && lot2SD   !== '' ? parseFloat(lot2SD)   : null }),
      ...(lot3Mean !== undefined && { lot3Mean: lot3Mean != null && lot3Mean !== '' ? parseFloat(lot3Mean) : null }),
      ...(lot3SD   !== undefined && { lot3SD:   lot3SD   != null && lot3SD   !== '' ? parseFloat(lot3SD)   : null }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json(target);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.qCTestTarget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
