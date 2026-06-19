// app/api/qc/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeZScore, qcStatusFromZScore, evaluateWestgard } from '@/lib/westgard';

// GET /api/qc — list all analytes with their levels and recent results
export async function GET() {
  const analytes = await prisma.qCAnalyte.findMany({
    include: {
      levels: {
        include: {
          results: {
            orderBy: { measuredAt: 'desc' },
            take: 30,
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(analytes);
}

// POST /api/qc — add a new QC result
export async function POST(request) {
  const body = await request.json();
  const { levelId, value, measuredBy, comment } = body;

  // Fetch the level to calculate z-score
  const level = await prisma.qCLevel.findUnique({ where: { id: levelId } });
  if (!level) return NextResponse.json({ error: 'Level not found' }, { status: 404 });

  const zScore = computeZScore(value, level.mean, level.sd);
  const status = qcStatusFromZScore(zScore);

  // Get recent results to evaluate Westgard rules
  const recentResults = await prisma.qCResult.findMany({
    where: { levelId },
    orderBy: { measuredAt: 'asc' },
    take: 10,
  });

  const allResults = [...recentResults, { zScore }];
  const violations = evaluateWestgard(allResults);
  const westgardFlags = violations.map(v => v.rule);
  const finalStatus = violations.some(v => v.severity === 'REJECT') ? 'REJECT'
    : violations.some(v => v.severity === 'WARNING') ? 'WARNING'
    : 'ACCEPT';

  const result = await prisma.qCResult.create({
    data: { levelId, value, zScore, westgardFlags, status: finalStatus, measuredBy, comment },
  });

  await prisma.auditLog.create({
    data: { action: 'QC_RESULT_ADDED', entity: 'QCResult', entityId: result.id, details: { value, zScore, status: finalStatus, flags: westgardFlags } },
  });

  return NextResponse.json({ result, violations });
}
