// simulate.js
// Simulates a lab analyser pushing QC and patient results to the QMS API
// Run: node simulate.js

const BASE_URL = 'http://localhost:3000/api';

// ── Config ────────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  {
    name: 'Roche Cobas c501',
    analytes: [
      { name: 'Glucose',    unit: 'mmol/L', mean: 5.5,   sd: 0.15,  drift: 0 },
      { name: 'Sodium',     unit: 'mmol/L', mean: 140.0, sd: 1.5,   drift: 0 },
      { name: 'Potassium',  unit: 'mmol/L', mean: 4.1,   sd: 0.1,   drift: 0 },
      { name: 'Creatinine', unit: 'µmol/L', mean: 88.0,  sd: 4.0,   drift: 0 },
    ],
  },
];

// Simulation modes
const MODES = {
  NORMAL:     'normal',      // Results within ±2 SD — all green
  DRIFT:      'drift',       // Gradual upward drift — triggers 10x rule eventually
  RANDOM_OOC: 'random_ooc', // Occasional out-of-control results
  CRISIS:     'crisis',      // Repeated rejects — simulates reagent failure
};

let currentMode = MODES.NORMAL;
let driftOffset = 0;
let resultCount = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomGaussian(mean, sd) {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

function generateValue(analyte, mode) {
  const { mean, sd } = analyte;

  switch (mode) {
    case MODES.NORMAL:
      // Mostly within ±1.5 SD
      return randomGaussian(mean, sd * 0.8);

    case MODES.DRIFT:
      // Gradually shifts upward — will trigger 2-2s or 10x Westgard rule
      driftOffset += 0.05;
      return randomGaussian(mean + driftOffset * sd, sd * 0.6);

    case MODES.RANDOM_OOC:
      // 20% chance of out-of-control result
      if (Math.random() < 0.2) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        return mean + direction * sd * (2.5 + Math.random() * 1.5);
      }
      return randomGaussian(mean, sd);

    case MODES.CRISIS:
      // Consistent high bias — simulates wrong calibrator lot
      return randomGaussian(mean + 3.2 * sd, sd * 0.5);

    default:
      return randomGaussian(mean, sd);
  }
}

function round(val, dp = 2) {
  return Math.round(val * Math.pow(10, dp)) / Math.pow(10, dp);
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchLevels() {
  const res = await fetch(`${BASE_URL}/qc`);
  if (!res.ok) throw new Error(`Failed to fetch QC levels: ${res.status}`);
  const analytes = await res.json();

  const levels = [];
  for (const analyte of analytes) {
    for (const level of analyte.levels) {
      if (level.levelName.includes('Normal')) {
        levels.push({ ...level, analyteName: analyte.name, unit: analyte.unit });
      }
    }
  }
  return levels;
}

async function postQCResult(levelId, value, analyte) {
  const res = await fetch(`${BASE_URL}/qc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      levelId,
      value,
      measuredBy: 'Simulator (Auto)',
      comment: `Mode: ${currentMode}`,
    }),
  });

  if (!res.ok) {
    console.error(`  ✗ Failed to post result: ${res.status}`);
    return null;
  }
  return res.json();
}

// ── Display ───────────────────────────────────────────────────────────────────

function statusIcon(status) {
  return { ACCEPT: '✓', WARNING: '⚠', REJECT: '✗', REPEAT: '↻' }[status] ?? '?';
}

function modeLabel(mode) {
  return {
    [MODES.NORMAL]:     '🟢 NORMAL',
    [MODES.DRIFT]:      '🟡 DRIFT',
    [MODES.RANDOM_OOC]: '🟠 RANDOM OOC',
    [MODES.CRISIS]:     '🔴 CRISIS',
  }[mode];
}

function printResult(analyte, value, unit, response) {
  const { result, violations } = response;
  const icon = statusIcon(result.status);
  const z = result.zScore?.toFixed(2).padStart(6);
  const flags = violations?.length > 0 ? violations.map(v => `[${v.rule}]`).join(' ') : '';

  console.log(
    `  ${icon} ${analyte.padEnd(12)} ${String(value).padEnd(8)} ${unit.padEnd(8)} z=${z}  ${result.status.padEnd(8)} ${flags}`
  );
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function runCycle(levels) {
  resultCount++;
  console.log(`\n─── Cycle ${resultCount}  [${modeLabel(currentMode)}]  ${new Date().toLocaleTimeString()} ───`);

  for (const level of levels) {
    const analyte = INSTRUMENTS[0].analytes.find(a => a.name === level.analyteName);
    if (!analyte) continue;

    const value = round(generateValue(analyte, currentMode));
    const response = await postQCResult(level.id, value, level.analyteName);
    if (response) printResult(level.analyteName, value, level.unit, response);

    // Small delay between analytes
    await new Promise(r => setTimeout(r, 300));
  }
}

function printHelp() {
  console.log('\n━━━ Lab QMS Instrument Simulator ━━━');
  console.log('Commands (press key + Enter):');
  console.log('  n  →  Normal mode (within control)');
  console.log('  d  →  Drift mode (gradual upward shift)');
  console.log('  r  →  Random OOC mode (20% chance of reject)');
  console.log('  c  →  Crisis mode (reagent failure simulation)');
  console.log('  q  →  Quit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function main() {
  console.log('🔬 Lab QMS Instrument Simulator');
  console.log('   Connecting to', BASE_URL, '...\n');

  let levels;
  try {
    levels = await fetchLevels();
    if (levels.length === 0) {
      console.error('No QC levels found. Make sure db:seed has been run.');
      process.exit(1);
    }
    console.log(`✓ Found ${levels.length} QC level(s): ${levels.map(l => l.analyteName).join(', ')}`);
  } catch (err) {
    console.error('✗ Could not connect to API:', err.message);
    console.error('  Make sure npm run dev is running on port 3000.');
    process.exit(1);
  }

  printHelp();

  // Read keyboard input to change mode
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => {
    if (key === 'q') { console.log('\nStopping simulator.'); process.exit(0); }
    if (key === 'n') { currentMode = MODES.NORMAL;     driftOffset = 0; console.log('\n→ Switched to NORMAL mode'); }
    if (key === 'd') { currentMode = MODES.DRIFT;      driftOffset = 0; console.log('\n→ Switched to DRIFT mode'); }
    if (key === 'r') { currentMode = MODES.RANDOM_OOC; console.log('\n→ Switched to RANDOM OOC mode'); }
    if (key === 'c') { currentMode = MODES.CRISIS;     console.log('\n→ Switched to CRISIS mode'); }
    if (key === '\u0003') process.exit(0); // Ctrl+C
  });

  // Run a cycle every 5 seconds
  await runCycle(levels);
  setInterval(() => runCycle(levels), 5000);
}

main();
