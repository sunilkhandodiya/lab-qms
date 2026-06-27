// app/configuration/machines/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import MachineConfigClient from './MachineConfigClient';

export default async function MachineConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const machines = await prisma.machineConfig.findMany({
    where,
    include: { location: true },
    orderBy: { machineName: 'asc' },
  });

  return <MachineConfigClient initialMachines={machines} locations={locations} />;
}
