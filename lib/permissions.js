// lib/permissions.js
// Central role / access definitions — aligned to the Quality Model SOP (NABL ISO 15189:2022)

export const ROLES = [
  'ADMIN',
  'DR_PATHOLOGY',
  'QUALITY_MANAGER',
  'CLUSTER_MANAGER',
  'LAB_MANAGER',
  'SR_LAB_TECHNICIAN',
  'LAB_TECHNICIAN',
];

export const ROLE_LABELS = {
  ADMIN:             { label: 'Admin',             color: '#dc2626', desc: 'Full system access incl. masters & user management' },
  DR_PATHOLOGY:      { label: 'Dr. Pathology',     color: '#7c3aed', desc: 'All quality modules, approvals, sign-off' },
  QUALITY_MANAGER:   { label: 'Quality Manager',   color: '#2563eb', desc: 'All quality modules, approvals, audit' },
  CLUSTER_MANAGER:   { label: 'Cluster Manager',   color: '#0d9488', desc: 'Calibration, equipment & dashboard across centres' },
  LAB_MANAGER:       { label: 'Lab Manager',       color: '#d97706', desc: 'Run & record QC, calibration, equipment at centre' },
  SR_LAB_TECHNICIAN: { label: 'Sr. Lab Technician',color: '#0891b2', desc: 'Record QC/calibration, raise logs' },
  LAB_TECHNICIAN:    { label: 'Lab Technician',    color: '#64748b', desc: 'Record QC results and daily logs' },
};

// Page-level access: which roles can SEE each module
const ALL = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'CLUSTER_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'];
const QUALITY_LEADS = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER'];
const OPS = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'CLUSTER_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'];

export const PAGE_ACCESS = {
  dashboard:        ALL,
  general_quality:  ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'],
  sop:              ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'],
  calibration:      OPS,
  equipment:        OPS,
  risk:             ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'CLUSTER_MANAGER', 'LAB_MANAGER'],
  master:           ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER'],
  // legacy module routes (still reachable under Control & Calibration / SOP)
  qc:               OPS,
  eqas:             OPS,
  documents:        ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'],
  training:         ALL,
  capa:             ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN'],
  admin_users:      ['ADMIN'],
  admin_audit:      QUALITY_LEADS,
};

// Action-level permissions. Approval/closure restricted to leads & managers; entry open to techs.
export const PERMISSIONS = {
  // QC
  'qc:add_test':       ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'qc:edit_test':      ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'qc:delete_test':    ['ADMIN', 'QUALITY_MANAGER'],
  'qc:add_profile':    ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'qc:edit_profile':   ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'qc:delete_profile': ['ADMIN', 'QUALITY_MANAGER'],
  'qc:toggle_status':  ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY'],
  'qc:add_result':     OPS,
  'qc:approve':        ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'qc:export':         QUALITY_LEADS.concat('CLUSTER_MANAGER', 'LAB_MANAGER'),

  // Calibration / Control
  'calibration:add':     OPS,
  'calibration:approve': ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER', 'CLUSTER_MANAGER'],

  // General Quality logs
  'gq:create':  ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'],
  'gq:approve': ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER'],

  // Documents / SOP
  'documents:create':  ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'documents:edit':    ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'documents:approve': ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY'],
  'documents:retire':  ['ADMIN', 'QUALITY_MANAGER'],

  // Equipment
  'equipment:add':       ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'CLUSTER_MANAGER', 'LAB_MANAGER'],
  'equipment:edit':      ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'CLUSTER_MANAGER', 'LAB_MANAGER'],
  'equipment:add_calib': OPS,

  // Risk assessment
  'risk:create':  ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER'],
  'risk:approve': ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER'],

  // CAPA
  'capa:create':  ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN'],
  'capa:edit':    ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'capa:close':   ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY'],
  'capa:delete':  ['ADMIN'],

  // Training
  'training:assign':  ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY', 'LAB_MANAGER'],
  'training:signoff': ALL,

  // EQAS
  'eqas:add_result': OPS,
  'eqas:approve':    ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY'],

  // Record review (read-only calibration tables) — only the pathologist & admin
  // may set/change a record's review status & date. Every change is audit-logged.
  'review:update': ['ADMIN', 'DR_PATHOLOGY'],

  // Dashboard warnings — only the pathologist & admin may acknowledge a flagged
  // record so it drops off the dashboard. Every ack / un-ack is audit-logged.
  'warning:ack': ['ADMIN', 'DR_PATHOLOGY'],

  // Masters
  'master:edit': ['ADMIN', 'QUALITY_MANAGER', 'DR_PATHOLOGY'],

  // Users
  'users:view':    ['ADMIN'],
  'users:create':  ['ADMIN'],
  'users:edit':    ['ADMIN'],
  'users:disable': ['ADMIN'],
  'users:delete':  ['ADMIN'],

  // Audit
  'audit:view': QUALITY_LEADS,
};

export function can(role, permission) {
  if (!role || !permission) return false;
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

export function canAccessPage(role, page) {
  if (!role || !page) return false;
  return PAGE_ACCESS[page]?.includes(role) ?? false;
}

export function getRolePermissions(role) {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([perm]) => perm);
}
