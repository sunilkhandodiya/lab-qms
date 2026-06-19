// app/api/risk/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const risks = await prisma.riskAssessment.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(risks);
}

export async function POST(request) {
  const body = await request.json();

  const c = await cookies();
  const locationId = c.get('qms_loc')?.value || null;

  const risk = await prisma.riskAssessment.create({
    data: {
      locationId,
      stage: body.stage || 'OTHER',
      potentialRisk: body.potentialRisk,
      riskLevel: body.riskLevel || 'MEDIUM',
      mitigation: body.mitigation || null,
      monitoring: body.monitoring || null,
      responsibility: body.responsibility || null,
    },
  });

  return NextResponse.json(risk, { status: 201 });
}
