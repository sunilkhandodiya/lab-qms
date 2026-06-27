// app/api/qc-analytes/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/qc-analytes — create a new QCAnalyte with optional initial levels
export async function POST(request) {
  const body = await request.json();
  const { name, unit, method, department, instrument, locationId, mean, sd, cv, levels = [] } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Analyte name is required.' }, { status: 400 });
  if (!unit?.trim()) return NextResponse.json({ error: 'Unit is required.' }, { status: 400 });
  if (mean == null || isNaN(Number(mean))) return NextResponse.json({ error: 'Mean is required.' }, { status: 400 });
  if (sd == null || isNaN(Number(sd)) || Number(sd) <= 0) return NextResponse.json({ error: 'SD must be a positive number.' }, { status: 400 });

  for (const [i, lv] of levels.entries()) {
    if (!lv.levelName?.trim()) return NextResponse.json({ error: `Level ${i + 1}: level name is required.` }, { status: 400 });
    if (lv.mean == null || isNaN(Number(lv.mean))) return NextResponse.json({ error: `Level ${i + 1}: mean is required.` }, { status: 400 });
    if (lv.sd == null || isNaN(Number(lv.sd)) || Number(lv.sd) <= 0) return NextResponse.json({ error: `Level ${i + 1}: SD must be a positive number.` }, { status: 400 });
  }

  const analyte = await prisma.qCAnalyte.create({
    data: {
      name: name.trim(),
      unit: unit.trim(),
      method: method?.trim() || null,
      department: department?.trim() || null,
      instrument: instrument?.trim() || null,
      locationId: locationId || null,
      mean: Number(mean),
      sd: Number(sd),
      cv: cv != null && !isNaN(Number(cv)) ? Number(cv) : null,
      levels: levels.length > 0 ? {
        create: levels.map(lv => ({
          levelName: lv.levelName.trim(),
          lotNumber: lv.lotNumber?.trim() || null,
          expiryDate: lv.expiryDate ? new Date(lv.expiryDate) : null,
          mean: Number(lv.mean),
          sd: Number(lv.sd),
        })),
      } : undefined,
    },
    include: { levels: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'IQC_ANALYTE_CREATED',
      entity: 'QCAnalyte',
      entityId: analyte.id,
      details: { name: analyte.name, unit: analyte.unit, levelCount: analyte.levels.length },
    },
  });

  return NextResponse.json(analyte, { status: 201 });
}
