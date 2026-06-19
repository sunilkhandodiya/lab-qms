// app/api/qc-profiles/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const locationId   = searchParams.get('locationId');
  const departmentId = searchParams.get('departmentId');
  const search       = searchParams.get('search');

  const where = {};
  if (locationId)   where.locationId   = locationId;
  if (departmentId) where.departmentId = departmentId;
  if (search) where.profileName = { contains: search, mode: 'insensitive' };

  const profiles = await prisma.qCProfile.findMany({
    where,
    include: { department: true, location: true },
    orderBy: { profileName: 'asc' },
  });

  return NextResponse.json(profiles);
}

export async function POST(request) {
  const body = await request.json();
  const { profileName, departmentId, locationId } = body;

  if (!profileName) {
    return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
  }

  const profile = await prisma.qCProfile.create({
    data: { profileName, departmentId: departmentId || null, locationId: locationId || null },
    include: { department: true, location: true },
  });

  await prisma.auditLog.create({
    data: { action: 'QC_PROFILE_CREATED', entity: 'QCProfile', entityId: profile.id, details: { profileName } },
  });

  return NextResponse.json(profile, { status: 201 });
}
