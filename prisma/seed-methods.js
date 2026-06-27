// prisma/seed-methods.js — Seed MethodConfig with common lab analytical methods
// Run: node prisma/seed-methods.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const METHOD_NAMES = [
  'AMP',
  'Arsenazo',
  'Arsenazo III',
  'BCG',
  'Biuret',
  'Biuret Method',
  'Bromocresol Green',
  'Calculated',
  'Calculated (Impedance)',
  'DHBS',
  'DTNB',
  'Electrolyte Exclusion Effect',
  'Enzymatic',
  'Enzymatic Colorimetric',
  'Ferrozine',
  'GLDH',
  'GOD-POD',
  'Hexokinase',
  'HPLC',
  'Immunoturbidimetry',
  'ISE Direct',
  'ISE Indirect',
  'Isotope Dilution',
  'Jaffe',
  'Kinematic',
  'Kinetic',
  'Kinetic UV',
  'Latex Agglutination',
  'Molybdate UV',
  'NADH',
  'Nephelometry',
  'PAP',
  'Potentiometric',
  'Rate Blanked',
  'Spectrophotometry',
  'Trichloroacetic Acid',
  'Turbidimetry',
  'Urease',
  'UV Kinetic',
  'Xanthine Oxidase',
];

async function main() {
  console.log('🌱 Seeding MethodConfig...');

  // Try to find a Gurugram location, otherwise use null
  const gurugramLoc = await prisma.location.findFirst({
    where: { name: { contains: 'Gurugram', mode: 'insensitive' } },
  });
  const locationId = gurugramLoc?.id || null;

  if (locationId) {
    console.log(`  Using location: ${gurugramLoc.name} (${locationId})`);
  } else {
    console.log('  No Gurugram location found — seeding without location (visible everywhere)');
  }

  let created = 0, skipped = 0;
  for (const name of METHOD_NAMES) {
    const existing = await prisma.methodConfig.findFirst({ where: { name, locationId } });
    if (existing) { skipped++; continue; }
    await prisma.methodConfig.create({ data: { name, locationId, active: true } });
    created++;
  }

  console.log(`✅ Done — ${created} methods created, ${skipped} already existed.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
