// app/configuration/lots/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import LotConfigClient from './LotConfigClient';

export default async function LotConfigPage() {
  const [locations, where, departments] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  const lots = await prisma.lotConfig.findMany({
    where,
    include: { location: true },
    orderBy: { lotNo: 'asc' },
  });

  return <LotConfigClient initialLots={lots} locations={locations} departments={departments} />;
}
