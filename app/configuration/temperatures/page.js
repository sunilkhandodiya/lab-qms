// app/configuration/temperatures/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import TemperatureConfigClient from './TemperatureConfigClient';

export default async function TemperatureConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);
  const temps = await prisma.temperatureConfig.findMany({
    where,
    include: { location: true },
    orderBy: { label: 'asc' },
  });
  return <TemperatureConfigClient initialTemps={temps} locations={locations} />;
}
