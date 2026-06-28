// app/qc/[testId]/page.js
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ResultEntryClient from './ResultEntryClient';

export default async function TestResultPage({ params }) {
  const { testId } = await params;
  const [test, entries, targets] = await Promise.all([
    prisma.qCTest.findUnique({
      where: { id: testId },
      include: { instrument: true, department: true, location: true, lot1: true, lot2: true, lot3: true },
    }),
    prisma.qCEntry.findMany({
      where: { qcTestId: testId },
      orderBy: { entryDate: 'desc' },
      take: 90,
    }),
    prisma.qCTestTarget.findMany({
      where: { qcTestId: testId },
      orderBy: { effectiveFrom: 'desc' },
    }),
  ]);
  if (!test) notFound();
  return <ResultEntryClient test={test} initialEntries={entries} initialTargets={targets} />;
}
