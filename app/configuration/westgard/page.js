// app/configuration/westgard/page.js
import { prisma } from '@/lib/prisma';
import WestgardConfigClient from './WestgardConfigClient';

export default async function WestgardConfigPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
  const config = await prisma.westgardConfig.findFirst({ orderBy: { createdAt: 'desc' } });
  return <WestgardConfigClient initialConfig={config} locations={locations} />;
}
