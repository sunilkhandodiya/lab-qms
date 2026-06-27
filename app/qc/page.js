// app/qc/page.js
import QCTestsClient from './QCTestsClient';
import { prisma } from '@/lib/prisma';

export default async function QCPage() {
  const [tests, profiles, master] = await Promise.all([
    prisma.qCTest.findMany({
      include: { location: true, instrument: true, department: true, lot1: true, lot2: true, lot3: true },
      orderBy: { testName: 'asc' },
    }),
    prisma.qCProfile.findMany({
      include: { department: true, location: true },
      orderBy: { profileName: 'asc' },
    }),
    Promise.all([
      prisma.location.findMany({ orderBy: { name: 'asc' } }),
      prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.instrument.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
      prisma.lot.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
    ]).then(([locations, departments, instruments, lots]) => ({
      locations, departments, instruments, lots,
    })),
  ]);

  return <QCTestsClient initialTests={tests} initialProfiles={profiles} initialMaster={master} />;
}
