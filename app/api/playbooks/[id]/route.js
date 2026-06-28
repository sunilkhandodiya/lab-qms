// app/api/playbooks/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id } = await params;
  const playbook = await prisma.playbook.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } }, location: true },
  });
  if (!playbook) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(playbook);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { title, code, category, description, department, locationId, active, steps } = body;

  const updated = await prisma.$transaction(async tx => {
    const pb = await tx.playbook.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(code !== undefined && { code: code?.trim() || null }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(department !== undefined && { department: department?.trim() || null }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(active !== undefined && { active }),
      },
    });
    if (steps !== undefined) {
      await tx.playbookStep.deleteMany({ where: { playbookId: id } });
      if (steps.length > 0) {
        await tx.playbookStep.createMany({
          data: steps.map((s, i) => ({
            playbookId: id,
            order: i + 1,
            title: s.title?.trim() || 'Step ' + (i + 1),
            instruction: s.instruction?.trim() || '',
            stepType: s.stepType || 'CHECKBOX',
            required: s.required !== false,
            expectedValue: s.expectedValue?.trim() || null,
            unit: s.unit?.trim() || null,
            passMin: s.passMin != null ? parseFloat(s.passMin) : null,
            passMax: s.passMax != null ? parseFloat(s.passMax) : null,
            onFail: s.onFail?.trim() || null,
          })),
        });
      }
    }
    return tx.playbook.findUnique({
      where: { id: pb.id },
      include: { steps: { orderBy: { order: 'asc' } }, location: true },
    });
  });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.playbook.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
