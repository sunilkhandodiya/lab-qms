// prisma/seed.js — Lab QMS seed aligned to the Quality Model SOP (NABL ISO 15189:2022)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysAhead = (n) => new Date(Date.now() + n * 86400000);

function zGrade(sdi) {
  const a = Math.abs(sdi);
  if (a <= 0.5) return 'EXCELLENT';
  if (a <= 1.0) return 'GOOD';
  if (a <= 2.0) return 'ACCEPTABLE';
  if (a <= 3.0) return 'BORDERLINE';
  return 'UNACCEPTABLE';
}

async function reset() {
  // Wipe in FK-safe order so re-seeding is idempotent.
  const tables = [
    'qCResult', 'qCLevel', 'qCAnalyte',
    'eQASResult', 'eQASCycle', 'eQASScheme',
    'calibration', 'maintenance',
    'calibrationVerification', 'qcLotVerification', 'lisVerification',
    'ilc', 'interPersonnelValidation', 'cvRecord',
    'riskAssessment', 'qualityRecord',
    'documentApproval', 'training', 'document', 'capa',
    'qCTest', 'qCProfile', 'lot', 'instrument',
    'equipment', 'auditLog', 'userActivity',
  ];
  for (const t of tables) {
    try { await prisma[t].deleteMany(); } catch { /* table may be empty / new */ }
  }
  // Users keep, but detach location & remove non-admin seed users
  await prisma.user.updateMany({ data: { locationId: null } });
}

async function main() {
  console.log('🌱 Seeding Lab QMS (Quality Model SOP)...');
  await reset();

  // ── States & Centres ───────────────────────────────────────────────────────
  const bihar = await prisma.state.upsert({ where: { name: 'Bihar' }, update: {}, create: { name: 'Bihar', code: 'BR' } });
  const mp    = await prisma.state.upsert({ where: { name: 'Madhya Pradesh' }, update: {}, create: { name: 'Madhya Pradesh', code: 'MP' } });

  async function centre(name, code, state) {
    return prisma.location.upsert({
      where: { name_stateId: { name, stateId: state.id } },
      update: { code },
      create: { name, code, stateId: state.id },
    });
  }
  const patna   = await centre('Patna', 'BR-PAT', bihar);
  const nalanda = await centre('Nalanda', 'BR-NAL', bihar);
  const vaishali= await centre('Vaishali', 'BR-VAI', bihar);
  const rohtas  = await centre('Rohtas', 'BR-ROH', bihar);
  const munger  = await centre('Munger', 'BR-MUN', bihar);
  const sagar   = await centre('Sagar', 'MP-SAG', mp);
  const indore  = await centre('Indore', 'MP-IND', mp);
  const shivpuri= await centre('Shivpuri', 'MP-SHI', mp);
  const shahdol = await centre('Shahdol', 'MP-SHA', mp);
  const centres = [patna, nalanda, vaishali, rohtas, munger, sagar, indore, shivpuri, shahdol];

  // ── Departments ──────────────────────────────────────────────────────────────
  const deptBio  = await prisma.department.upsert({ where: { name: 'Clinical Biochemistry' }, update: {}, create: { name: 'Clinical Biochemistry' } });
  const deptHem  = await prisma.department.upsert({ where: { name: 'Hematology' }, update: {}, create: { name: 'Hematology' } });
  const deptImm  = await prisma.department.upsert({ where: { name: 'Immunology' }, update: {}, create: { name: 'Immunology' } });
  const deptPath = await prisma.department.upsert({ where: { name: 'Clinical Pathology' }, update: {}, create: { name: 'Clinical Pathology' } });

  // ── Instruments (Patna) ──────────────────────────────────────────────────────
  async function instr(name, loc) {
    return prisma.instrument.upsert({ where: { name_locationId: { name, locationId: loc.id } }, update: {}, create: { name, locationId: loc.id } });
  }
  const instAU800 = await instr('Beckman Coulter AU800', patna);
  const instBA200 = await instr('Biosystem BA200', patna);
  const instH560  = await instr('Hematology H560', patna);

  // ── Users (one per SOP role) ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@Lab2024!', 12);
  const staffHash = await bcrypt.hash('Staff@Lab2024!', 12);
  async function user(name, email, role, loc) {
    return prisma.user.upsert({
      where: { email }, update: { role, name, locationId: loc?.id ?? null },
      create: { name, email, role, password: role === 'ADMIN' ? adminHash : staffHash, locationId: loc?.id ?? null },
    });
  }
  await user('System Admin', 'admin@lab.com', 'ADMIN', null);
  const drPath = await user('Dr. R. Sharma', 'pathologist@lab.com', 'DR_PATHOLOGY', patna);
  const qm     = await user('Anita Verma', 'qm@lab.com', 'QUALITY_MANAGER', patna);
  await user('Suresh Kumar', 'cluster@lab.com', 'CLUSTER_MANAGER', null);
  const labMgr = await user('Priya Singh', 'labmanager@lab.com', 'LAB_MANAGER', patna);
  await user('Ravi Yadav', 'srtech@lab.com', 'SR_LAB_TECHNICIAN', patna);
  const tech   = await user('Amit Raj', 'tech@lab.com', 'LAB_TECHNICIAN', patna);

  // ── Documents / SOP ────────────────────────────────────────────────────────
  const qm1 = await prisma.document.create({ data: { docNumber: 'QM-001', title: 'Laboratory Quality Manual', category: 'QUALITY_MANUAL', status: 'EFFECTIVE', version: '3.0', content: 'Quality management system per NABL ISO 15189:2022.', effectiveAt: daysAgo(200), reviewDue: daysAhead(160), authorId: qm.id } });
  const sopBio = await prisma.document.create({ data: { docNumber: 'SOP-BIO-001', title: 'Glucose — GOD-POD Method', category: 'SOP', status: 'EFFECTIVE', version: '2.1', department: 'Clinical Biochemistry', instrument: 'Beckman Coulter AU800', content: 'Procedure for serum glucose by GOD-POD.', effectiveAt: daysAgo(120), reviewDue: daysAhead(245), authorId: drPath.id } });
  const sopHem = await prisma.document.create({ data: { docNumber: 'SOP-HEM-001', title: 'CBC on Hematology Analyser H560', category: 'SOP', status: 'IN_REVIEW', version: '1.0', department: 'Hematology', instrument: 'Hematology H560', content: 'Complete blood count procedure.', reviewDue: daysAhead(30), authorId: labMgr.id } });
  const scm = await prisma.document.create({ data: { docNumber: 'MAN-002', title: 'Sample Collection Manual', category: 'WORK_INSTRUCTION', status: 'EFFECTIVE', version: '1.4', content: 'Phlebotomy and sample collection guidance.', effectiveAt: daysAgo(90), reviewDue: daysAhead(275), authorId: qm.id } });
  await prisma.documentApproval.createMany({ data: [
    { documentId: qm1.id, reviewerId: drPath.id, status: 'APPROVED', signedAt: daysAgo(200) },
    { documentId: sopHem.id, reviewerId: drPath.id, status: 'PENDING' },
  ]});

  // ── Equipment (Patna) ────────────────────────────────────────────────────────
  const equipDefs = [
    { assetId: 'EQ-PAT-001', name: 'Beckman Coulter AU800', type: 'Analyser', manufacturer: 'Beckman Coulter', model: 'AU800', department: 'Clinical Biochemistry', agency: 'HW', frequency: 'Annual', calibrationDue: daysAhead(20), pmDue: daysAhead(45) },
    { assetId: 'EQ-PAT-002', name: 'Biosystem BA200', type: 'Analyser', manufacturer: 'Biosystem', model: 'BA200', department: 'Clinical Biochemistry', agency: 'HW', frequency: 'Annual', calibrationDue: daysAhead(-5), pmDue: daysAhead(60) },
    { assetId: 'EQ-PAT-003', name: 'Hematology Analyser H560', type: 'Analyser', manufacturer: 'HW', model: 'H560', department: 'Hematology', agency: 'HW', frequency: 'Annual', calibrationDue: daysAhead(120), pmDue: daysAhead(10) },
    { assetId: 'EQ-PAT-004', name: 'Refrigerated Centrifuge', type: 'Centrifuge', manufacturer: 'Remi', model: 'C-24', department: 'Clinical Pathology', agency: 'Remi', frequency: 'Half-yearly', calibrationDue: daysAhead(75), pmDue: daysAhead(30) },
    { assetId: 'EQ-PAT-005', name: 'Vertes Pipette 100-1000µL', type: 'Pipette', manufacturer: 'Vertes', model: '100-1000UL', department: 'Clinical Biochemistry', agency: 'HW', frequency: 'Half-yearly', calibrationDue: daysAhead(5) },
  ];
  const equipment = [];
  for (const e of equipDefs) {
    equipment.push(await prisma.equipment.create({ data: { ...e, locationId: patna.id, status: e.assetId === 'EQ-PAT-002' ? 'OUT_FOR_CALIBRATION' : 'ACTIVE', installedAt: daysAgo(400) } }));
  }
  await prisma.calibration.createMany({ data: [
    { equipmentId: equipment[0].id, performedAt: daysAgo(345), nextDue: daysAhead(20), performedBy: 'HW Service Engineer', result: 'PASS', certificate: 'CERT-AU800-24' },
    { equipmentId: equipment[2].id, performedAt: daysAgo(245), nextDue: daysAhead(120), performedBy: 'HW Service Engineer', result: 'PASS', certificate: 'CERT-H560-24' },
  ]});
  await prisma.maintenance.createMany({ data: [
    { equipmentId: equipment[3].id, type: 'Preventive', performedAt: daysAgo(20), performedBy: 'Amit Raj', notes: 'Brushes & rotor checked.' },
  ]});

  // ── Calibration lot verification (Patna, Bio) ─────────────────────────────────
  await prisma.calibrationVerification.createMany({ data: [
    { locationId: patna.id, department: 'Clinical Biochemistry', instrument: 'Beckman Coulter AU800', calibrationName: 'ALP', oldLot: '45302', newLot: '110086', valueOldLot: 110, valueNewLot: 115, difference: 4.54, acceptableLimit: '±10%', acceptable: true, technicianBy: 'Amit Raj', supervisorBy: 'Priya Singh', date: daysAgo(15) },
    { locationId: patna.id, department: 'Clinical Biochemistry', instrument: 'Beckman Coulter AU800', calibrationName: 'Glucose', oldLot: '120098', newLot: '120444', valueOldLot: 119, valueNewLot: 119, difference: 0.12, acceptableLimit: '±10%', acceptable: true, technicianBy: 'Amit Raj', supervisorBy: 'Priya Singh', date: daysAgo(10) },
  ]});
  await prisma.qcLotVerification.createMany({ data: [
    { locationId: patna.id, department: 'Clinical Biochemistry', instrument: 'Beckman Coulter AU800', qcName: 'ALP', oldLot: '45302', newLot: '110086', valueOldLot: 12, valueNewLot: 14, difference: 16.6, acceptableLimit: '±2SD', acceptable: true, technicianBy: 'Amit Raj', supervisorBy: 'Priya Singh', date: daysAgo(12) },
  ]});

  // ── LIS verification, ILC, IPV ─────────────────────────────────────────────────
  await prisma.lisVerification.createMany({ data: [
    { locationId: patna.id, parameter: 'ALP', barcode: '110089', equipmentResult: 188, transferredTo: 'LIS', transferredResult: 188, diffPercent: 0, acceptable: true, recordedBy: 'Amit Raj', date: daysAgo(8) },
    { locationId: patna.id, parameter: 'Glucose', barcode: '110090', equipmentResult: 96, transferredTo: 'LIS', transferredResult: 96, diffPercent: 0, acceptable: true, recordedBy: 'Amit Raj', date: daysAgo(8) },
  ]});
  await prisma.ilc.createMany({ data: [
    { locationId: patna.id, testName: 'CBC', analyte: 'HB', ourResult: 13.5, refLabResult: 13.0, diffPercent: 3.8, acceptable: true, comment: 'Within limits', date: daysAgo(20) },
    { locationId: patna.id, testName: 'LFT', analyte: 'SGOT', ourResult: 41, refLabResult: 35, diffPercent: 17.1, acceptable: false, comment: 'Repeat & investigate', date: daysAgo(20) },
  ]});
  await prisma.interPersonnelValidation.createMany({ data: [
    { locationId: patna.id, department: 'Clinical Biochemistry', machineA: 'AU800', machineB: 'BA200', parameter: 'Glucose', resultA: 96, resultB: 98, diffPercent: 2.0, acceptable: true, date: daysAgo(18) },
  ]});

  // ── CV% monitoring (Biochemistry, Patna) ──────────────────────────────────────
  const cvParams = [ ['Glucose', 3.09, 3.20, 1.30], ['SGOT', 4.20, 3.66, 4.00], ['ALP', 8.52, 10.33, 6.97], ['Creatinine', 2.45, 3.64, 2.83], ['Cholesterol Total', 5.87, 4.94, 3.95] ];
  for (const [param, l1, l2, l3] of cvParams) {
    await prisma.cvRecord.createMany({ data: [
      { locationId: patna.id, department: 'Clinical Biochemistry', parameter: param, level: 'L1', cv: l1, noOfPoints: 30, month: daysAgo(15) },
      { locationId: patna.id, department: 'Clinical Biochemistry', parameter: param, level: 'L2', cv: l2, noOfPoints: 30, month: daysAgo(15) },
      { locationId: patna.id, department: 'Clinical Biochemistry', parameter: param, level: 'L3', cv: l3, noOfPoints: 30, month: daysAgo(15) },
    ]});
  }

  // ── Internal QC analytes & results (Levey-Jennings) ────────────────────────────
  const glucose = await prisma.qCAnalyte.create({ data: {
    name: 'Glucose', unit: 'mg/dL', method: 'GOD-POD', department: 'Clinical Biochemistry', instrument: 'Beckman Coulter AU800', locationId: patna.id, mean: 96, sd: 3, cv: 3.1,
    levels: { create: [ { levelName: 'Level 1 (Normal)', mean: 96, sd: 3, lotNumber: 'BIORAD-N1' }, { levelName: 'Level 2 (High)', mean: 250, sd: 7, lotNumber: 'BIORAD-H1' } ] },
  }, include: { levels: true } });
  const glL1 = glucose.levels[0];
  const glSeries = [ {v:96,z:0}, {v:97,z:0.33}, {v:95,z:-0.33}, {v:99,z:1.0}, {v:94,z:-0.67}, {v:102,z:2.0,f:['1-2s'],s:'WARNING'}, {v:93,z:-1.0}, {v:105,z:3.0,f:['1-3s'],s:'REJECT'}, {v:96,z:0}, {v:97,z:0.33} ];
  for (let i = 0; i < glSeries.length; i++) {
    const d = glSeries[i];
    await prisma.qCResult.create({ data: { levelId: glL1.id, value: d.v, zScore: d.z, westgardFlags: d.f || [], status: d.s || 'ACCEPT', measuredBy: i % 2 ? 'Ravi Yadav' : 'Amit Raj', approvedBy: 'Priya Singh', measuredAt: daysAgo(glSeries.length - i) } });
  }

  const wbc = await prisma.qCAnalyte.create({ data: {
    name: 'WBC', unit: '10^3/µL', method: 'Flow Cytometry', department: 'Hematology', instrument: 'Hematology H560', locationId: patna.id, mean: 12, sd: 0.36, cv: 3.0,
    levels: { create: [ { levelName: 'Level 1 (Normal)', mean: 12, sd: 0.36, lotNumber: 'HEM-N1' } ] },
  }, include: { levels: true } });
  const wbcSeries = [12.0, 12.1, 11.9, 12.2, 11.8, 12.0, 12.3, 11.7, 12.1, 12.0];
  for (let i = 0; i < wbcSeries.length; i++) {
    const z = (wbcSeries[i] - 12) / 0.36;
    await prisma.qCResult.create({ data: { levelId: wbc.levels[0].id, value: wbcSeries[i], zScore: z, westgardFlags: [], status: Math.abs(z) > 2 ? 'WARNING' : 'ACCEPT', measuredBy: 'Amit Raj', approvedBy: 'Priya Singh', measuredAt: daysAgo(wbcSeries.length - i) } });
  }

  // ── EQAS: AIIMS EQAP (Hematology, Z-score) + CMC Vellore (Biochem, SDI) ─────────
  const aiims = await prisma.eQASScheme.create({ data: {
    name: 'AIIMS EQAP', provider: 'AIIMS', discipline: 'Hematology', scoreType: 'ZSCORE', frequency: 'Quarterly', accreditBody: 'ISO 17043', locationId: patna.id,
    analytes: ['TLC', 'RBC', 'Hb', 'HCT', 'MCV', 'Plt'],
    cycles: { create: [ { cycleRef: 'Q2-2026', dispatchDate: daysAgo(40), dueDate: daysAgo(25), submittedAt: daysAgo(28), status: 'REPORTED', results: { create: [
      { analyte: 'Hb', unit: 'g/dL', yourResult: 13.4, allLabsMean: 13.5, allLabsSD: 0.4, zScore: -0.25, sdi: -0.25, grade: 'EXCELLENT', performance: 'Satisfactory' },
      { analyte: 'TLC', unit: '10^3/µL', yourResult: 7.2, allLabsMean: 7.0, allLabsSD: 0.5, zScore: 0.40, sdi: 0.40, grade: 'EXCELLENT', performance: 'Satisfactory' },
      { analyte: 'Plt', unit: '10^3/µL', yourResult: 210, allLabsMean: 230, allLabsSD: 12, zScore: -1.67, sdi: -1.67, grade: 'ACCEPTABLE', performance: 'Satisfactory' },
    ] } } ] },
  } });

  const cmc = await prisma.eQASScheme.create({ data: {
    name: 'CMC Vellore', provider: 'CMC Vellore', discipline: 'Clinical Biochemistry', scoreType: 'SDI', frequency: 'Monthly', accreditBody: 'ISO 17043', locationId: patna.id,
    analytes: ['Glucose', 'SGOT', 'SGPT', 'ALP', 'Creatinine', 'HDL Cholesterol'],
    cycles: { create: [ { cycleRef: 'M-06-2026', dispatchDate: daysAgo(20), dueDate: daysAgo(5), submittedAt: daysAgo(7), status: 'REPORTED', results: { create: [
      { analyte: 'Glucose', unit: 'mg/dL', yourResult: 95, allLabsMean: 96, allLabsSD: 2.5, sdi: -0.40, grade: 'EXCELLENT', performance: 'Satisfactory' },
      { analyte: 'HDL Cholesterol', unit: 'mg/dL', yourResult: 44, allLabsMean: 45.5, allLabsSD: 2.8, sdi: -0.54, grade: 'GOOD', performance: 'Satisfactory', rootCause: 'Visually checked CMC EQAS control and reagent — OK. Rerun within range.' },
      { analyte: 'SGOT', unit: 'U/L', yourResult: 41, allLabsMean: 35, allLabsSD: 2.0, sdi: 3.0, grade: 'BORDERLINE', performance: 'Unsatisfactory', capaRaised: true, rootCause: 'Calibrator lot change under investigation.' },
    ] } } ] },
  } });

  // ── Risk Assessment ────────────────────────────────────────────────────────
  await prisma.riskAssessment.createMany({ data: [
    { locationId: patna.id, stage: 'SAFETY', potentialRisk: 'Chemical injury / exposure to biohazards / fire / electrical hazards', riskLevel: 'HIGH', mitigation: 'PPE, training, fire drills, electrical safety checks', monitoring: 'Monthly safety checklist', responsibility: 'Lab Manager', ltApproved: true, drApproved: true },
    { locationId: patna.id, stage: 'PRE_ANALYTICAL', potentialRisk: 'Patient misidentification / registration error / sample handling', riskLevel: 'HIGH', mitigation: 'Two-identifier policy, barcode, SOP training', monitoring: 'Sample rejection log review', responsibility: 'Sr. Lab Technician', ltApproved: true },
    { locationId: patna.id, stage: 'ANALYTICAL', potentialRisk: 'Incorrect results: calibration / IQC errors, lot change, untrained staff', riskLevel: 'MEDIUM', mitigation: 'Daily IQC, Westgard rules, calibration verification, competency assessment', monitoring: 'LJ chart & CV% review', responsibility: 'Quality Manager' },
    { locationId: patna.id, stage: 'POST_ANALYTICAL', potentialRisk: 'Report delay / typographical error in report', riskLevel: 'MEDIUM', mitigation: 'LIS auto-transfer verification, TAT monitoring, report double-check', monitoring: 'TAT outliers log', responsibility: 'Lab Manager' },
  ]});

  // ── General Quality / QMS log records ──────────────────────────────────────
  await prisma.qualityRecord.createMany({ data: [
    { logCode: '013', logTitle: 'Room Temperature & Humidity Log', category: 'GENERAL', locationId: patna.id, summary: 'AC bench — 23.4°C / 48%', status: 'APPROVED', recordedBy: 'Amit Raj', approvedBy: 'Priya Singh', data: { reading: 23.4, humidity: 48, withinRange: true }, date: daysAgo(1) },
    { logCode: '006', logTitle: 'Sample Rejection Log', category: 'GENERAL', locationId: patna.id, summary: 'Hemolysed sample rejected', status: 'SUBMITTED', recordedBy: 'Ravi Yadav', data: { sampleId: 'S-4521', test: 'Potassium', reason: 'Hemolysed', action: 'Recollection requested' }, date: daysAgo(2) },
    { logCode: '001', logTitle: 'Internal QC CAPA Log', category: 'GENERAL', locationId: patna.id, summary: 'Glucose L1 1-3s violation', status: 'SUBMITTED', recordedBy: 'Priya Singh', data: { parameter: 'Glucose', nonConformance: '1-3s on L1', rootCause: 'QC vial nearing expiry', correctiveAction: 'New QC vial opened & re-run' }, date: daysAgo(3) },
    { logCode: '028', logTitle: 'Result Reversal Log', category: 'QMS', locationId: patna.id, summary: 'Creatinine result revised', status: 'APPROVED', recordedBy: 'Amit Raj', approvedBy: 'Dr. R. Sharma', data: { sampleId: 'S-4480', parameter: 'Creatinine', oldResult: '1.9', newResult: '1.2', reason: 'Transcription error', authorizedBy: 'Dr. R. Sharma' }, date: daysAgo(5) },
  ]});

  // ── CAPA ────────────────────────────────────────────────────────────────────
  await prisma.capa.createMany({ data: [
    { capaNumber: 'CAPA-2026-001', title: 'EQAS unsatisfactory — SGOT (CMC Vellore)', type: 'CORRECTIVE', source: 'EQAS', description: 'SDI 3.0 for SGOT, unsatisfactory.', rootCause: 'Calibrator lot change not validated.', action: 'Re-validate calibrator lots before use.', status: 'OPEN', priority: 'CRITICAL', dueDate: daysAhead(14), ownerId: qm.id },
    { capaNumber: 'CAPA-2026-002', title: 'ILC mismatch — SGOT vs reference lab', type: 'CORRECTIVE', source: 'ILC', description: 'SGOT 17.1% difference vs reference lab.', rootCause: 'Under investigation.', action: 'Repeat ILC after recalibration.', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: daysAhead(10), ownerId: labMgr.id },
    { capaNumber: 'CAPA-2026-003', title: 'Calibration overdue — Biosystem BA200', type: 'PREVENTIVE', source: 'Equipment', description: 'BA200 calibration overdue by 5 days.', action: 'Schedule HW service engineer.', status: 'OPEN', priority: 'MEDIUM', dueDate: daysAhead(7), ownerId: labMgr.id },
  ]});

  // ── Training ──────────────────────────────────────────────────────────────────
  await prisma.training.createMany({ data: [
    { documentId: sopBio.id, userId: tech.id, status: 'COMPLETED', completedAt: daysAgo(60), signedOff: true, dueDate: daysAgo(45) },
    { documentId: sopHem.id, userId: tech.id, status: 'PENDING', dueDate: daysAhead(20) },
    { documentId: qm1.id, userId: labMgr.id, status: 'OVERDUE', dueDate: daysAgo(10) },
  ]});

  // ── QC Profiles ───────────────────────────────────────────────────────────────
  await prisma.qCProfile.createMany({ data: [
    { profileName: 'Biochemistry Daily IQC', departmentId: deptBio.id, locationId: patna.id, status: 'ENABLED' },
    { profileName: 'Hematology Daily IQC', departmentId: deptHem.id, locationId: patna.id, status: 'ENABLED' },
  ]});

  console.log('✅ Seed complete.');
  console.log(`   States: 2 | Centres: ${centres.length} | Departments: 4`);
  console.log('   Login (password Staff@Lab2024! / Admin@Lab2024! for admin):');
  console.log('   admin@lab.com · pathologist@lab.com · qm@lab.com · cluster@lab.com · labmanager@lab.com · srtech@lab.com · tech@lab.com');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
