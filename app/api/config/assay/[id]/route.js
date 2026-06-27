// app/api/config/assay/[id]/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const { analyte, department, method, unit, reagentSupplier, temperature, locationId } = body;

  const record = await prisma.assayConfig.update({
    where: { id },
    data: {
      ...(analyte !== undefined && { analyte: analyte.trim() }),
      department: department?.trim() || null,
      method: method?.trim() || null,
      unit: unit?.trim() || null,
      reagentSupplier: reagentSupplier?.trim() || null,
      temperature: temperature != null && !isNaN(Number(temperature)) ? Number(temperature) : null,
      ...(locationId !== undefined && { locationId: locationId || null }),
    },
    include: { location: true },
  });

  return NextResponse.json(record);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.assayConfig.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
