// app/api/equipment/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const equipment = await prisma.equipment.findMany({
    include: {
      calibrations: { orderBy: { performedAt: 'desc' }, take: 5 },
      maintenances: { orderBy: { performedAt: 'desc' }, take: 5 },
    },
    orderBy: { assetId: 'asc' },
  });
  return NextResponse.json(equipment);
}

export async function POST(request) {
  const body = await request.json();

  // Resolve the active centre: prefer an explicit locationId, else the cookie.
  let locationId = body.locationId || null;
  if (!locationId) {
    const cookieStore = await cookies();
    locationId = cookieStore.get('qms_loc')?.value || null;
  }

  const eq = await prisma.equipment.create({
    data: {
      assetId: body.assetId,
      name: body.name,
      type: body.type || null,
      manufacturer: body.manufacturer || null,
      model: body.model || null,
      serialNumber: body.serialNumber || null,
      instId: body.instId || null,
      department: body.department || null,
      agency: body.agency || null,
      frequency: body.frequency || null,
      contactPerson: body.contactPerson || null,
      locationId,
      status: body.status || 'ACTIVE',
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
      installedAt: body.installedAt ? new Date(body.installedAt) : null,
      calibrationDue: body.calibrationDue ? new Date(body.calibrationDue) : null,
      pmDue: body.pmDue ? new Date(body.pmDue) : null,
    },
  });
  await prisma.auditLog.create({
    data: { action: 'EQUIPMENT_ADDED', entity: 'Equipment', entityId: eq.id, equipmentId: eq.id },
  });
  return NextResponse.json(eq, { status: 201 });
}
