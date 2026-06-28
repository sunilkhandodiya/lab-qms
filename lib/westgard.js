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
export function evaluateWestgard(results, config = null) {
  const enabled = {
    rule12s: config ? config.rule12s !== false : true,
    rule13s: config ? config.rule13s !== false : true,
    rule22s: config ? config.rule22s !== false : true,
    ruleR4s: config ? config.ruleR4s !== false : true,
    rule41s: config ? config.rule41s === true : false,
    rule10x: config ? config.rule10x !== false : true,
  };

  const violations = [];
  const n = results.length;
  if (n === 0) return violations;

  const zScores = results.map(r => r.zScore ?? 0);
  const last = zScores[n - 1];

  if (enabled.rule13s && Math.abs(last) > 3) {
    violations.push({ rule: '1-3s', description: 'One result exceeds ±3 SD', severity: 'REJECT' });
  }

  if (enabled.rule12s && Math.abs(last) > 2) {
    violations.push({ rule: '1-2s', description: 'One result exceeds ±2 SD', severity: 'WARNING' });
  }

  if (n >= 2) {
    const prev = zScores[n - 2];

    if (enabled.rule22s && Math.abs(last) > 2 && Math.abs(prev) > 2 && Math.sign(last) === Math.sign(prev)) {
      violations.push({ rule: '2-2s', description: 'Two consecutive results exceed ±2 SD on same side', severity: 'REJECT' });
    }

    if (enabled.ruleR4s && Math.abs(last - prev) > 4) {
      violations.push({ rule: 'R-4s', description: 'Range between two consecutive results exceeds 4 SD', severity: 'REJECT' });
    }
  }

  if (n >= 4 && enabled.rule41s) {
    const last4 = zScores.slice(-4);
    if (last4.every(z => z > 1) || last4.every(z => z < -1)) {
      violations.push({ rule: '4-1s', description: 'Four consecutive results beyond ±1 SD on same side', severity: 'REJECT' });
    }
  }

  if (n >= 10 && enabled.rule10x) {
    const last10 = zScores.slice(-10);
    if (last10.every(z => z > 0) || last10.every(z => z < 0)) {
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
