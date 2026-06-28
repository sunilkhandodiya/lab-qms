// app/playbook/new/page.js
import { prisma } from '@/lib/prisma';
import PlaybookBuilderClient from '../[id]/PlaybookBuilderClient';

export default async function NewPlaybookPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  const departments = await prisma.departmentConfig.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  return <PlaybookBuilderClient playbook={null} locations={locations} departments={departments} />;
}
