// app/api/documents/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const docs = await prisma.document.findMany({
    include: { author: true, approvals: { include: { reviewer: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json(docs);
}

export async function POST(request) {
  const body = await request.json();
  const doc = await prisma.document.create({
    data: {
      docNumber: body.docNumber,
      title: body.title,
      category: body.category,
      content: body.content,
      authorId: body.authorId,
      department: body.department || null,
      instrument: body.instrument || null,
      version: body.version || undefined,
      reviewDue: body.reviewDue ? new Date(body.reviewDue) : null,
    },
  });
  await prisma.auditLog.create({
    data: { action: 'DOCUMENT_CREATED', entity: 'Document', entityId: doc.id, documentId: doc.id },
  });
  return NextResponse.json(doc, { status: 201 });
}
