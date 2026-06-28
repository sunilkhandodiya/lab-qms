// app/api/upload-documents/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';

export async function GET() {
  const where = await locationWhere();
  const docs = await prisma.uploadedDocument.findMany({
    where,
    include: { location: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(docs.map(d => ({
    id: d.id,
    name: d.name,
    code: d.code,
    fileType: d.fileType,
    fileSize: d.fileSize,
    locationId: d.locationId,
    location: d.location,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt,
  })));
}

export async function POST(request) {
  const body = await request.json();
  const { name, code, fileType, fileSize, fileData, locationId, uploadedBy } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Document name is required.' }, { status: 400 });
  if (!fileData) return NextResponse.json({ error: 'File data is required.' }, { status: 400 });
  const doc = await prisma.uploadedDocument.create({
    data: {
      name: name.trim(),
      code: code?.trim() || null,
      fileType: fileType || null,
      fileSize: fileSize || null,
      fileData,
      locationId: locationId || null,
      uploadedBy: uploadedBy || null,
    },
    include: { location: true },
  });
  await prisma.auditLog.create({
    data: { action: 'DOCUMENT_UPLOADED', entity: 'UploadedDocument', entityId: doc.id, details: { name: doc.name, code: doc.code } },
  });
  return NextResponse.json({
    id: doc.id, name: doc.name, code: doc.code, fileType: doc.fileType,
    fileSize: doc.fileSize, locationId: doc.locationId, location: doc.location,
    uploadedBy: doc.uploadedBy, createdAt: doc.createdAt,
  }, { status: 201 });
}
