// app/playbook/[id]/run/page.js
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PlaybookRunClient from './PlaybookRunClient';

export default async function PlaybookRunPage({ params }) {
  const { id } = await params;
  const playbook = await prisma.playbook.findUnique({
    where: { id },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  if (!playbook) notFound();
  return <PlaybookRunClient playbook={playbook} />;
}
