// app/configuration/lots/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import LotConfigClient from './LotConfigClient';

export default async function LotConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const lots = await prisma.lotConfig.findMany({
    where,
    include: { location: true },
    orderBy: { lotNo: 'asc' },
  });

  return <LotConfigClient initialLots={lots} locations={locations} />;
}
