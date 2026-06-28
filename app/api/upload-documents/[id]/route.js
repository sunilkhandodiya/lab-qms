// app/api/upload-documents/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id } = await params;
  const doc = await prisma.uploadedDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.uploadedDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
