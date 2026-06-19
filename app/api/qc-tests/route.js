// app/api/qc-tests/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId   = searchParams.get('locationId');
  const departmentId = searchParams.get('departmentId');
  const hasResult    = searchParams.get('hasResult');
  const search       = searchParams.get('search');

  const where = {};
  if (locationId)   where.locationId   = locationId;
  if (departmentId) where.departmentId = departmentId;
  if (hasResult !== null && hasResult !== '') where.hasResult = hasResult === 'true';
  if (search) {
    where.OR = [
      { testName: { contains: search, mode: 'insensitive' } },
      { testCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const tests = await prisma.qCTest.findMany({
    where,
    include: {
      location:   true,
      instrument: true,
      department: true,
      lot1: true,
      lot2: true,
      lot3: true,
    },
    orderBy: { testName: 'asc' },
  });

  return NextResponse.json(tests);
}

export async function POST(request) {
  const body = await request.json();

  // Auto-create location/instrument/lot on the fly if IDs not provided but names are
  let locationId = body.locationId;
  if (!locationId && body.locationName) {
    const loc = await prisma.location.upsert({
      where:  { name: body.locationName },
      update: {},
      create: { name: body.locationName },
    });
    locationId = loc.id;
  }

  let instrumentId = body.instrumentId;
  if (!instrumentId && body.instrumentName && locationId) {
    const inst = await prisma.instrument.upsert({
      where:  { name_locationId: { name: body.instrumentName, locationId } },
      update: {},
      create: { name: body.instrumentName, locationId },
    });
    instrumentId = inst.id;
  }

  let departmentId = body.departmentId;
  if (!departmentId && body.departmentName) {
    const dept = await prisma.department.upsert({
      where:  { name: body.departmentName },
      update: {},
      create: { name: body.departmentName },
    });
    departmentId = dept.id;
  }

  const resolveLot = async (id, name) => {
    if (id) return id;
    if (!name || !locationId) return undefined;
    const lot = await prisma.lot.upsert({
      where:  { name_locationId: { name, locationId } },
      update: {},
      create: { name, locationId },
    });
    return lot.id;
  };

  const lot1Id = await resolveLot(body.lot1Id, body.lot1Name);
  const lot2Id = await resolveLot(body.lot2Id, body.lot2Name);
  const lot3Id = await resolveLot(body.lot3Id, body.lot3Name);

  const test = await prisma.qCTest.create({
    data: {
      testCode:     body.testCode,
      testName:     body.testName,
      method:       body.method || null,
      unit:         body.unit   || null,
      locationId,
      instrumentId,
      departmentId,
      lot1Id,
      lot2Id,
      lot3Id,
    },
    include: { location: true, instrument: true, department: true, lot1: true, lot2: true, lot3: true },
  });

  await prisma.auditLog.create({
    data: { action: 'QC_TEST_CREATED', entity: 'QCTest', entityId: test.id, details: { testCode: test.testCode, testName: test.testName } },
  });

  return NextResponse.json(test, { status: 201 });
}
