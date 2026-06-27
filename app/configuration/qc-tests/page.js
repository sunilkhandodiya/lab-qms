// app/configuration/qc-tests/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import QCTestConfigClient from './QCTestConfigClient';

export default async function QCTestConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const [tests, master] = await Promise.all([
    prisma.qCTest.findMany({
      where,
      include: { location: true, instrument: true, department: true, lot1: true, lot2: true, lot3: true },
      orderBy: { testName: 'asc' },
    }),
    Promise.all([
      prisma.location.findMany({ orderBy: { name: 'asc' } }),
      prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.instrument.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
      prisma.lot.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
      prisma.methodConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    ]).then(([locations, departments, instruments, lots, methods]) => ({ locations, departments, instruments, lots, methods })),
  ]);

  return (
    <QCTestConfigClient
      initialTests={tests}
      locations={locations}
      master={master}
    />
  );
}
