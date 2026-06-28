// app/configuration/units/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import UnitConfigClient from './UnitConfigClient';

export default async function UnitConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);
  const units = await prisma.unitConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });
  return <UnitConfigClient initialUnits={units} locations={locations} />;
}
