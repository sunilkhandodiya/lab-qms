// app/configuration/instruments/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import InstrumentConfigClient from './InstrumentConfigClient';

export default async function InstrumentConfigPage() {
  const [locations, where, machines] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
    prisma.machineConfig.findMany({ where: { active: true }, include: { location: true }, orderBy: { machineName: 'asc' } }),
  ]);

  const instruments = await prisma.instrumentConfig.findMany({
    where,
    include: { location: true, machineConfig: true },
    orderBy: { name: 'asc' },
  });

  return (
    <InstrumentConfigClient
      initialInstruments={instruments}
      locations={locations}
      machines={machines}
    />
  );
}
