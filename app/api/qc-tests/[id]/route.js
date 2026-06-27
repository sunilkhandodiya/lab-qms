// app/api/qc-tests/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();

  const test = await prisma.qCTest.update({
    where: { id },
    data: {
      ...(body.active !== undefined && { active: body.active }),
      ...(body.testName !== undefined && { testName: body.testName }),
      ...(body.testCode !== undefined && { testCode: body.testCode }),
    },
    include: { location: true, instrument: true, department: true, lot1: true, lot2: true, lot3: true },
  });

  return NextResponse.json(test);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.qCTest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
