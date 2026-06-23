// lib/reviewable.js
// Single source of truth for the read-only Control & Calibration tables that
// Dr. Pathology / Admin can apply a review status + date to. Both the API route
// and the ReviewControl UI key off the same `type` slug.

export const REVIEWABLE = {
  qclot: { model: 'qcLotVerification',         entity: 'QcLotVerification',         label: 'QC Lot Verification' },
  lis:   { model: 'lisVerification',           entity: 'LisVerification',           label: 'LIS Verification' },
  ilc:   { model: 'ilc',                       entity: 'Ilc',                       label: 'Inter-Laboratory Comparison' },
  ipv:   { model: 'interPersonnelValidation',  entity: 'InterPersonnelValidation',  label: 'Inter-Personnel Validation' },
};

export const REVIEW_STATUSES = ['PENDING', 'REVIEWED', 'REJECTED'];

export function reviewableEntity(type) {
  return REVIEWABLE[type]?.entity ?? null;
}
