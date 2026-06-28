// app/api/iqc/entries/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeZScore, evaluateWestgard } from '@/lib/westgard';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get('testId');
  if (!testId) return NextResponse.json({ error: 'testId required' }, { status: 400 });
  const entries = await prisma.qCEntry.findMany({
    where: { qcTestId: testId },
    orderBy: { entryDate: 'desc' },
  });
  return NextResponse.json(entries);
}

export async function POST(request) {
  const body = await request.json();
  const { qcTestId, entryDate, measuredBy, lot1Value, lot2Value, lot3Value, locationId } = body;
  if (!qcTestId) return NextResponse.json({ error: 'qcTestId required' }, { status: 400 });

  // Get latest active target for z-score calculation
  const target = await prisma.qCTestTarget.findFirst({
    where: { qcTestId, active: true },
    orderBy: { effectiveFrom: 'desc' },
  });

  // Get previous entries for Westgard (up to 10, oldest first)
  const prev = await prisma.qCEntry.findMany({
    where: { qcTestId },
    orderBy: { entryDate: 'asc' },
    take: 10,
  });

  function calcLot(value, mean, sd, prevZScores) {
    if (value == null || value === '') return { zScore: null, flags: [] };
    const zScore = (mean && sd) ? computeZScore(parseFloat(value), mean, sd) : null;
    const history = [...prevZScores.map(z => ({ zScore: z })), { zScore }];
    const violations = zScore != null ? evaluateWestgard(history) : [];
    return { zScore, flags: violations.map(v => v.rule) };
  }

  const lot1 = calcLot(lot1Value, target?.lot1Mean, target?.lot1SD, prev.map(e => e.lot1ZScore).filter(z => z != null));
  const lot2 = calcLot(lot2Value, target?.lot2Mean, target?.lot2SD, prev.map(e => e.lot2ZScore).filter(z => z != null));
  const lot3 = calcLot(lot3Value, target?.lot3Mean, target?.lot3SD, prev.map(e => e.lot3ZScore).filter(z => z != null));

  const entry = await prisma.qCEntry.create({
    data: {
      qcTestId,
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      measuredBy: measuredBy || '',
      lot1Value: lot1Value != null && lot1Value !== '' ? parseFloat(lot1Value) : null,
      lot1ZScore: lot1.zScore,
      lot1Flags: lot1.flags,
      lot2Value: lot2Value != null && lot2Value !== '' ? parseFloat(lot2Value) : null,
      lot2ZScore: lot2.zScore,
      lot2Flags: lot2.flags,
      lot3Value: lot3Value != null && lot3Value !== '' ? parseFloat(lot3Value) : null,
      lot3ZScore: lot3.zScore,
      lot3Flags: lot3.flags,
      locationId: locationId || null,
    },
  });

  // Mark test as having results
  await prisma.qCTest.update({ where: { id: qcTestId }, data: { hasResult: true } });

  await prisma.auditLog.create({
    data: { action: 'QC_ENTRY_ADDED', entity: 'QCEntry', entityId: entry.id, details: { lot1Value, lot2Value, lot3Value } },
  });

  return NextResponse.json(entry, { status: 201 });
}
