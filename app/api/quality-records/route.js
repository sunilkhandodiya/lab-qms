// app/api/quality-records/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const logCode = searchParams.get('logCode');

  const where = {};
  if (category === 'GENERAL' || category === 'QMS') where.category = category;
  if (logCode) where.logCode = logCode;

  const records = await prisma.qualityRecord.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(records);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { logCode, logTitle, category, date, summary, imageUrl, data } = body || {};

  if (!logCode || !logTitle) {
    return NextResponse.json({ error: 'logCode and logTitle are required.' }, { status: 400 });
  }

  const c = await cookies();
  const locationId = c.get('qms_loc')?.value || null;

  const record = await prisma.qualityRecord.create({
    data: {
      logCode,
      logTitle,
      category: category === 'QMS' ? 'QMS' : 'GENERAL',
      locationId,
      date: date ? new Date(date) : new Date(),
      summary: summary || null,
      imageUrl: imageUrl || null,
      data: data || {},
      status: 'SUBMITTED',
      recordedBy: body.recordedBy || 'System',
    },
  });

  return NextResponse.json(record, { status: 201 });
}
