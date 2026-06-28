// app/nc/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import NCClient from './NCClient';

export default async function NCPage() {
  const where = await locationWhere();
  const [ncs, locations, departments] = await Promise.all([
    prisma.nonConformance.findMany({ where, include: { location: true }, orderBy: { createdAt: 'desc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);
  return <NCClient initialNCs={ncs} locations={locations} departments={departments} />;
}
