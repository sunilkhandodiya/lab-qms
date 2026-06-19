// app/api/training/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const trainings = await prisma.training.findMany({
    include: {
      user: true,
      document: true,
    },
    orderBy: { assignedAt: 'desc' },
  });
  return NextResponse.json(trainings);
}

export async function POST(request) {
  const body = await request.json();

  // Sign off on training
  if (body.action === 'signoff') {
    const training = await prisma.training.update({
      where: { id: body.trainingId },
      data: {
        status: 'COMPLETED',
        signedOff: true,
        completedAt: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: { action: 'TRAINING_SIGNED_OFF', entity: 'Training', entityId: training.id },
    });
    return NextResponse.json(training);
  }

  // Assign new training
  const training = await prisma.training.create({
    data: {
      documentId: body.documentId,
      userId: body.userId,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    },
  });
  return NextResponse.json(training, { status: 201 });
}
