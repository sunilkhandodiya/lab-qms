// app/api/playbooks/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';

export async function GET() {
  const where = await locationWhere();
  const playbooks = await prisma.playbook.findMany({
    where: { ...where, active: true },
    include: { _count: { select: { steps: true, runs: true } }, location: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(playbooks);
}

export async function POST(request) {
  const body = await request.json();
  const { title, code, category, description, department, locationId, steps = [] } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  if (!category) return NextResponse.json({ error: 'Category is required.' }, { status: 400 });

  const playbook = await prisma.playbook.create({
    data: {
      title: title.trim(),
      code: code?.trim() || null,
      category,
      description: description?.trim() || null,
      department: department?.trim() || null,
      locationId: locationId || null,
      steps: {
        create: steps.map((s, i) => ({
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
          functionality: s.functionality?.trim() || null,
        })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } }, location: true },
  });
  return NextResponse.json(playbook, { status: 201 });
}
