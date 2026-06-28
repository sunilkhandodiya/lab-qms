// app/api/config/westgard/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId') || null;
  let config = await prisma.westgardConfig.findFirst({
    where: locationId ? { locationId } : { locationId: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!config) {
    config = { rule12s: true, rule13s: true, rule22s: true, ruleR4s: true, rule41s: false, rule10x: true };
  }
  return NextResponse.json(config);
}

export async function POST(request) {
  const body = await request.json();
  const { locationId, rule12s, rule13s, rule22s, ruleR4s, rule41s, rule10x } = body;
  const existing = await prisma.westgardConfig.findFirst({
    where: locationId ? { locationId } : { locationId: null },
  });
  let config;
  if (existing) {
    config = await prisma.westgardConfig.update({
      where: { id: existing.id },
      data: {
        ...(rule12s !== undefined && { rule12s }),
        ...(rule13s !== undefined && { rule13s }),
        ...(rule22s !== undefined && { rule22s }),
        ...(ruleR4s !== undefined && { ruleR4s }),
        ...(rule41s !== undefined && { rule41s }),
        ...(rule10x !== undefined && { rule10x }),
      },
    });
  } else {
    config = await prisma.westgardConfig.create({
      data: {
        locationId: locationId || null,
        rule12s: rule12s ?? true,
        rule13s: rule13s ?? true,
        rule22s: rule22s ?? true,
        ruleR4s: ruleR4s ?? true,
        rule41s: rule41s ?? false,
        rule10x: rule10x ?? true,
      },
    });
  }
  await prisma.auditLog.create({
    data: { action: 'WESTGARD_CONFIG_UPDATED', entity: 'WestgardConfig', entityId: config.id, details: body },
  });
  return NextResponse.json(config);
}
