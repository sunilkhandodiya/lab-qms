// app/api/eqas/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeSDI, eqasGradeFromSDI } from '@/lib/westgard';

// GET /api/eqas — all schemes with cycles and results
export async function GET() {
  const schemes = await prisma.eQASScheme.findMany({
    include: {
      cycles: {
        include: { results: true },
        orderBy: { dueDate: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(schemes);
}

// POST /api/eqas/result — submit an EQAS result
export async function POST(request) {
  const body = await request.json();
  const { cycleId, analyte, unit, yourResult, allLabsMean, allLabsSD } = body;

  const sdi = allLabsMean && allLabsSD ? computeSDI(yourResult, allLabsMean, allLabsSD) : null;
  const biasPercent = allLabsMean ? ((yourResult - allLabsMean) / allLabsMean) * 100 : null;
  const grade = sdi !== null ? eqasGradeFromSDI(sdi) : null;
  const performance = sdi !== null
    ? (Math.abs(sdi) <= 2 ? 'Acceptable' : Math.abs(sdi) <= 3 ? 'Borderline' : 'Unacceptable')
    : null;

  const result = await prisma.eQASResult.create({
    data: { cycleId, analyte, unit, yourResult, allLabsMean, allLabsSD, sdi, biasPercent, grade, performance },
  });

  await prisma.auditLog.create({
    data: { action: 'EQAS_RESULT_SUBMITTED', entity: 'EQASResult', entityId: result.id, details: { analyte, yourResult, sdi, grade } },
  });

  return NextResponse.json(result);
}
