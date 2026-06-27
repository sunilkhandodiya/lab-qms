// app/configuration/departments/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import DepartmentConfigClient from './DepartmentConfigClient';

export default async function DepartmentConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);

  const departments = await prisma.departmentConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });

  return <DepartmentConfigClient initialDepts={departments} locations={locations} />;
}
