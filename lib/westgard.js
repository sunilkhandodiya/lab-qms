// lib/westgard.js

/**
 * Evaluates Westgard rules on an array of QC results (ordered oldest → newest).
 * Returns an array of { rule, description, severity } violations.
 *
 * Rules implemented:
 *  1-2s  Warning: one result > ±2 SD
 *  1-3s  Reject:  one result > ±3 SD
 *  2-2s  Reject:  two consecutive results on same side > ±2 SD
 *  R-4s  Reject:  range between two consecutive results > 4 SD
 * 10x    Reject:  ten consecutive results on same side of mean
 */
export function evaluateWestgard(results) {
  const violations = [];
  const n = results.length;
  if (n === 0) return violations;

  const zScores = results.map(r => r.zScore ?? 0);
  const last = zScores[n - 1];

  // 1-3s: Single value beyond ±3 SD — immediate reject
  if (Math.abs(last) > 3) {
    violations.push({ rule: '1-3s', description: 'One result exceeds ±3 SD', severity: 'REJECT' });
  }

  // 1-2s: Single value beyond ±2 SD — warning
  if (Math.abs(last) > 2) {
    violations.push({ rule: '1-2s', description: 'One result exceeds ±2 SD', severity: 'WARNING' });
  }

  // 2-2s: Two consecutive values beyond ±2 SD on same side
  if (n >= 2) {
    const prev = zScores[n - 2];
    if (Math.abs(last) > 2 && Math.abs(prev) > 2 && Math.sign(last) === Math.sign(prev)) {
      violations.push({ rule: '2-2s', description: 'Two consecutive results exceed ±2 SD on same side', severity: 'REJECT' });
    }

    // R-4s: Range between last two results > 4 SD
    if (Math.abs(last - prev) > 4) {
      violations.push({ rule: 'R-4s', description: 'Range between two consecutive results exceeds 4 SD', severity: 'REJECT' });
    }
  }

  // 10x: Ten consecutive results on same side of mean
  if (n >= 10) {
    const last10 = zScores.slice(-10);
    const allPositive = last10.every(z => z > 0);
    const allNegative = last10.every(z => z < 0);
    if (allPositive || allNegative) {
      violations.push({ rule: '10x', description: 'Ten consecutive results on same side of mean (systematic bias)', severity: 'REJECT' });
    }
  }

  return violations;
}

/**
 * Compute the SDI (Standard Deviation Index) for EQAS
 * SDI = (your result - peer mean) / peer SD
 * Acceptable: |SDI| ≤ 2.0
 */
export function computeSDI(yourResult, peerMean, peerSD) {
  if (!peerSD || peerSD === 0) return null;
  return (yourResult - peerMean) / peerSD;
}

/**
 * Compute z-score for internal QC
 */
export function computeZScore(value, mean, sd) {
  if (!sd || sd === 0) return null;
  return (value - mean) / sd;
}

/**
 * Determine QC status from z-score
 */
export function qcStatusFromZScore(zScore) {
  const abs = Math.abs(zScore);
  if (abs > 3) return 'REJECT';
  if (abs > 2) return 'WARNING';
  return 'ACCEPT';
}

/**
 * Determine EQAS grade from SDI
 */
export function eqasGradeFromSDI(sdi) {
  const abs = Math.abs(sdi);
  if (abs <= 0.5) return 'EXCELLENT';
  if (abs <= 1.0) return 'GOOD';
  if (abs <= 2.0) return 'ACCEPTABLE';
  if (abs <= 3.0) return 'BORDERLINE';
  return 'UNACCEPTABLE';
}
