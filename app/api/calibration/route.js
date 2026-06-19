// app/api/calibration/route.js
// Dispatching POST handler for Control & Calibration records.
// body.type ∈ 'calibration' | 'qclot' | 'lis' | 'ilc' | 'ipv'
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// number helper — returns null for blank/invalid
function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function date(v) {
  if (!v) return undefined; // let prisma default kick in
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

// % difference relative to the "from" (baseline) value, rounded to 2 dp; null if not computable
function pctDiff(from, to) {
  if (from === null || to === null || from === 0) return null;
  return Math.round(((to - from) / from) * 10000) / 100;
}

export async function GET() {
  const records = await prisma.calibrationVerification.findMany({
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

  const c = await cookies();
  const locationId = c.get('qms_loc')?.value || null;
  const type = (body?.type || 'calibration').toLowerCase();

  try {
    let record;

    if (type === 'calibration') {
      if (!body.calibrationName) {
        return NextResponse.json({ error: 'calibrationName is required.' }, { status: 400 });
      }
      record = await prisma.calibrationVerification.create({
        data: {
          locationId,
          department: body.department || null,
          instrument: body.instrument || null,
          date: date(body.date),
          calibrationName: body.calibrationName,
          oldLot: body.oldLot || null,
          newLot: body.newLot || null,
          valueOldLot: num(body.valueOldLot),
          valueNewLot: num(body.valueNewLot),
          difference: num(body.difference) ?? pctDiff(num(body.valueOldLot), num(body.valueNewLot)),
          acceptableLimit: body.acceptableLimit || null,
          acceptable: !!body.acceptable,
          technicianBy: body.technicianBy || null,
          supervisorBy: body.supervisorBy || null,
        },
      });
    } else if (type === 'qclot') {
      if (!body.qcName) {
        return NextResponse.json({ error: 'qcName is required.' }, { status: 400 });
      }
      record = await prisma.qcLotVerification.create({
        data: {
          locationId,
          department: body.department || null,
          instrument: body.instrument || null,
          date: date(body.date),
          qcName: body.qcName,
          oldLot: body.oldLot || null,
          newLot: body.newLot || null,
          valueOldLot: num(body.valueOldLot),
          valueNewLot: num(body.valueNewLot),
          difference: num(body.difference) ?? pctDiff(num(body.valueOldLot), num(body.valueNewLot)),
          acceptableLimit: body.acceptableLimit || null,
          acceptable: !!body.acceptable,
          technicianBy: body.technicianBy || null,
          supervisorBy: body.supervisorBy || null,
        },
      });
    } else if (type === 'lis') {
      if (!body.parameter) {
        return NextResponse.json({ error: 'parameter is required.' }, { status: 400 });
      }
      record = await prisma.lisVerification.create({
        data: {
          locationId,
          date: date(body.date),
          barcode: body.barcode || null,
          parameter: body.parameter,
          equipmentResult: num(body.equipmentResult),
          transferredTo: body.transferredTo || null,
          transferredResult: num(body.transferredResult),
          diffPercent: num(body.diffPercent) ?? pctDiff(num(body.equipmentResult), num(body.transferredResult)),
          acceptable: !!body.acceptable,
          recordedBy: body.recordedBy || null,
        },
      });
    } else if (type === 'ilc') {
      if (!body.analyte) {
        return NextResponse.json({ error: 'analyte is required.' }, { status: 400 });
      }
      record = await prisma.ilc.create({
        data: {
          locationId,
          date: date(body.date),
          sampleDetails: body.sampleDetails || null,
          testName: body.testName || null,
          analyte: body.analyte,
          ourResult: num(body.ourResult),
          refLabResult: num(body.refLabResult),
          diffPercent: num(body.diffPercent) ?? pctDiff(num(body.ourResult), num(body.refLabResult)),
          acceptable: !!body.acceptable,
          comment: body.comment || null,
        },
      });
    } else if (type === 'ipv') {
      if (!body.parameter) {
        return NextResponse.json({ error: 'parameter is required.' }, { status: 400 });
      }
      record = await prisma.interPersonnelValidation.create({
        data: {
          locationId,
          date: date(body.date),
          department: body.department || null,
          machineA: body.machineA || null,
          machineB: body.machineB || null,
          parameter: body.parameter,
          resultA: num(body.resultA),
          resultB: num(body.resultB),
          diffPercent: num(body.diffPercent) ?? pctDiff(num(body.resultA), num(body.resultB)),
          acceptable: !!body.acceptable,
          comment: body.comment || null,
        },
      });
    } else {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json(record, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to create record.' }, { status: 500 });
  }
}
