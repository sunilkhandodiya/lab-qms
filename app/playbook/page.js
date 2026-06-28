// app/playbook/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import PlaybookClient from './PlaybookClient';

export default async function PlaybookPage() {
  const where = await locationWhere();
  const [playbooks, recentRuns, locations] = await Promise.all([
    prisma.playbook.findMany({
      where: { ...where, active: true },
      include: { _count: { select: { steps: true, runs: true } }, location: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.playbookRun.findMany({
      where: where.locationId ? { locationId: where.locationId } : {},
      include: { playbook: { select: { title: true, category: true } } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return <PlaybookClient initialPlaybooks={playbooks} initialRuns={recentRuns} locations={locations} />;
}
