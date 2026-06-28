// app/upload-documents/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import UploadDocumentsClient from './UploadDocumentsClient';

export default async function UploadDocumentsPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);
  const docs = await prisma.uploadedDocument.findMany({
    where,
    include: { location: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, code: true, fileType: true,
      fileSize: true, locationId: true, location: true,
      uploadedBy: true, createdAt: true,
    },
  });
  return <UploadDocumentsClient initialDocs={docs} locations={locations} />;
}
