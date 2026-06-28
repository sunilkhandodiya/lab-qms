// app/api/playbook-runs/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id } = await params;
  const run = await prisma.playbookRun.findUnique({
    where: { id },
    include: {
      playbook: { include: { steps: { orderBy: { order: 'asc' } } } },
      responses: { include: { step: true }, orderBy: { recordedAt: 'asc' } },
    },
  });
  if (!run) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(run);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { status, notes, responses } = body;

  const run = await prisma.$transaction(async tx => {
    if (responses?.length) {
      for (const r of responses) {
        await tx.playbookResponse.upsert({
          where: { id: r.id || '__none__' },
          create: {
            runId: id,
            stepId: r.stepId,
            value: r.value ?? null,
            passed: r.passed ?? null,
            skipped: r.skipped ?? false,
            note: r.note ?? null,
          },
          update: {
            value: r.value ?? null,
            passed: r.passed ?? null,
            skipped: r.skipped ?? false,
            note: r.note ?? null,
          },
        });
      }
    }
    const anyFailed = responses?.some(r => r.passed === false);
    return tx.playbookRun.update({
      where: { id },
      data: {
        ...(status && { status: anyFailed && status === 'COMPLETED' ? 'FLAGGED' : status }),
        ...(notes !== undefined && { notes }),
        ...(status === 'COMPLETED' || status === 'FLAGGED' ? { completedAt: new Date() } : {}),
      },
      include: {
        playbook: { include: { steps: { orderBy: { order: 'asc' } } } },
        responses: { include: { step: true } },
      },
    });
  });
  return NextResponse.json(run);
}
