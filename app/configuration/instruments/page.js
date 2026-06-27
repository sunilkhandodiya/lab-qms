// app/configuration/instruments/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import InstrumentConfigClient from './InstrumentConfigClient';

export default async function InstrumentConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const instruments = await prisma.instrumentConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });

  return (
    <InstrumentConfigClient
      initialInstruments={instruments}
      locations={locations}
    />
  );
}
