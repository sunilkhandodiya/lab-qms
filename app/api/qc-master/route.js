// app/api/qc-master/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/qc-master?locationId=xxx
// Returns all master lists, optionally filtered by location for cascading
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('locationId');

  const [locations, departments, instruments, lots] = await Promise.all([
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.instrument.findMany({
      where: locationId ? { locationId } : {},
      include: { location: true },
      orderBy: { name: 'asc' },
    }),
    prisma.lot.findMany({
      where: locationId ? { locationId } : {},
      include: { location: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({ locations, departments, instruments, lots });
}

// POST /api/qc-master — create a new master entry on the fly
export async function POST(request) {
  const body = await request.json();
  const { type, name, locationId } = body;

  let record;

  switch (type) {
    case 'location':
      record = await prisma.location.upsert({
        where: { name }, update: {}, create: { name },
      });
      break;
    case 'instrument':
      if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });
      record = await prisma.instrument.upsert({
        where: { name_locationId: { name, locationId } },
        update: {},
        create: { name, locationId },
      });
      break;
    case 'department':
      record = await prisma.department.upsert({
        where: { name }, update: {}, create: { name },
      });
      break;
    case 'lot':
      if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });
      record = await prisma.lot.upsert({
        where: { name_locationId: { name, locationId } },
        update: {},
        create: { name, locationId },
      });
      break;
    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  return NextResponse.json(record, { status: 201 });
}
