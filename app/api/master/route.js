// app/api/master/route.js — Master Data CRUD-lite (States, Centres, Departments, Instruments)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [states, locations, departments, instruments] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ include: { state: true }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.instrument.findMany({ include: { location: true }, orderBy: { name: 'asc' } }),
  ]);
  return NextResponse.json({ states, locations, departments, instruments });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const type = body?.type;

  try {
    let created;
    switch (type) {
      case 'state': {
        const name = (body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'State name is required.' }, { status: 400 });
        created = await prisma.state.create({
          data: { name, code: body.code?.trim() || null },
        });
        break;
      }
      case 'location': {
        const name = (body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'Centre name is required.' }, { status: 400 });
        created = await prisma.location.create({
          data: {
            name,
            code: body.code?.trim() || null,
            address: body.address?.trim() || null,
            stateId: body.stateId || null,
          },
        });
        break;
      }
      case 'department': {
        const name = (body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'Department name is required.' }, { status: 400 });
        created = await prisma.department.create({ data: { name } });
        break;
      }
      case 'instrument': {
        const name = (body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'Instrument name is required.' }, { status: 400 });
        if (!body.locationId) return NextResponse.json({ error: 'Centre is required.' }, { status: 400 });
        created = await prisma.instrument.create({
          data: { name, locationId: body.locationId },
        });
        break;
      }
      default:
        return NextResponse.json({ error: 'Unknown master type.' }, { status: 400 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // Prisma unique constraint violation
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'A record with these details already exists.' }, { status: 400 });
    }
    // Foreign key / other known request errors
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Referenced record does not exist.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save record.' }, { status: 400 });
  }
}
