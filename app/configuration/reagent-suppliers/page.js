// app/configuration/reagent-suppliers/page.js
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import ReagentSupplierConfigClient from './ReagentSupplierConfigClient';

export default async function ReagentSupplierConfigPage() {
  const [locations, where] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    locationWhere(),
  ]);
  const suppliers = await prisma.reagentSupplierConfig.findMany({
    where,
    include: { location: true },
    orderBy: { name: 'asc' },
  });
  return <ReagentSupplierConfigClient initialSuppliers={suppliers} locations={locations} />;
}
