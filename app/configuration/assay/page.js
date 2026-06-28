// app/configuration/assay/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import AssayConfigClient from './AssayConfigClient';

export default async function AssayConfigPage() {
  const [locations, where, departments, methods, units, suppliers, temperatures] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.methodConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.unitConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.reagentSupplierConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.temperatureConfig.findMany({ where: { active: true }, orderBy: { label: 'asc' } }),
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
      units={units}
      suppliers={suppliers}
      temperatures={temperatures}
    />
  );
}
