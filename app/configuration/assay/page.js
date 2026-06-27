// app/configuration/assay/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import AssayConfigClient from './AssayConfigClient';

export default async function AssayConfigPage() {
  const [locations, where, departments, methods] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.methodConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  const assays = await prisma.assayConfig.findMany({
    where,
    include: { location: true },
    orderBy: { analyte: 'asc' },
  });

  return (
    <AssayConfigClient
      initialAssays={assays}
      locations={locations}
      departments={departments}
      methods={methods}
    />
  );
}
