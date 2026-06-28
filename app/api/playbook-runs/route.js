// app/api/playbook-runs/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';

export async function GET() {
  const where = await locationWhere();
  const runs = await prisma.playbookRun.findMany({
    where: where.locationId ? { locationId: where.locationId } : {},
    include: {
      playbook: { select: { title: true, category: true } },
      _count: { select: { responses: true } },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
  return NextResponse.json(runs);
}

export async function POST(request) {
  const body = await request.json();
  const { playbookId, runBy, locationId } = body;
  if (!playbookId) return NextResponse.json({ error: 'playbookId required.' }, { status: 400 });
  const run = await prisma.playbookRun.create({
    data: { playbookId, runBy: runBy || 'Unknown', locationId: locationId || null },
    include: { playbook: { include: { steps: { orderBy: { order: 'asc' } } } } },
  });
  return NextResponse.json(run, { status: 201 });
}
