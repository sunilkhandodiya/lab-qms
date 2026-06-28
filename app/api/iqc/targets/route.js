// app/api/iqc/targets/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('testId');
  if (!testId) return NextResponse.json({ error: 'testId required' }, { status: 400 });
  const targets = await prisma.qCTestTarget.findMany({
    where: { qcTestId: testId },
    orderBy: { effectiveFrom: 'desc' },
  });
  return NextResponse.json(targets);
}

export async function POST(request) {
  const body = await request.json();
  const { qcTestId, targetType, effectiveFrom, lot1Mean, lot1SD, lot2Mean, lot2SD, lot3Mean, lot3SD } = body;
  if (!qcTestId) return NextResponse.json({ error: 'qcTestId required' }, { status: 400 });

  // Deactivate previous targets
  await prisma.qCTestTarget.updateMany({ where: { qcTestId, active: true }, data: { active: false } });

  const target = await prisma.qCTestTarget.create({
    data: {
      qcTestId,
      targetType: targetType || 'Fixed',
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      lot1Mean: lot1Mean != null && lot1Mean !== '' ? parseFloat(lot1Mean) : null,
      lot1SD:   lot1SD   != null && lot1SD   !== '' ? parseFloat(lot1SD)   : null,
      lot2Mean: lot2Mean != null && lot2Mean !== '' ? parseFloat(lot2Mean) : null,
      lot2SD:   lot2SD   != null && lot2SD   !== '' ? parseFloat(lot2SD)   : null,
      lot3Mean: lot3Mean != null && lot3Mean !== '' ? parseFloat(lot3Mean) : null,
      lot3SD:   lot3SD   != null && lot3SD   !== '' ? parseFloat(lot3SD)   : null,
      active: true,
    },
  });

  await prisma.auditLog.create({
    data: { action: 'QC_TARGET_SET', entity: 'QCTestTarget', entityId: target.id, details: { qcTestId, lot1Mean, lot1SD, lot2Mean, lot2SD, lot3Mean, lot3SD } },
  });

  return NextResponse.json(target, { status: 201 });
}
