// app/configuration/methods/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import MethodConfigClient from './MethodConfigClient';

export default async function MethodConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const methods = await prisma.methodConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });

  return <MethodConfigClient initialMethods={methods} locations={locations} />;
}
