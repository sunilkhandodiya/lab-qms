// app/playbook/[id]/page.js
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PlaybookBuilderClient from './PlaybookBuilderClient';
import Link from 'next/link';

export default async function PlaybookDetailPage({ params }) {
  const { id } = await params;
  const [playbook, locations, departments] = await Promise.all([
    prisma.playbook.findUnique({ where: { id }, include: { steps: { orderBy: { order: 'asc' } }, location: true } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);
  if (!playbook) notFound();
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Link href={`/playbook/${id}/run`} className="btn btn-primary">▶ Run This Playbook</Link>
      </div>
      <PlaybookBuilderClient playbook={playbook} locations={locations} departments={departments} />
    </div>
  );
}
