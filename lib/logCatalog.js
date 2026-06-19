// lib/logCatalog.js
// Catalogue of all General Quality and QMS record formats from the Quality Model SOP.
// Each entry defines a record type and the fields its data-entry form should capture.

// Common reusable field builders
const f = (key, label, type = 'text', opts) => ({ key, label, type, ...(opts || {}) });

const TEMP_FIELDS = [
  f('equipment', 'Equipment / Unit'),
  f('reading', 'Temperature (°C)', 'number'),
  f('humidity', 'Humidity (%)', 'number'),
  f('acceptableRange', 'Acceptable Range'),
  f('withinRange', 'Within Range?', 'boolean'),
  f('action', 'Corrective Action', 'textarea'),
];

const GENERIC_LOG_FIELDS = [
  f('reference', 'Reference / Sample / Item'),
  f('details', 'Details', 'textarea'),
  f('outcome', 'Outcome / Status'),
  f('action', 'Action Taken', 'textarea'),
];

export const GENERAL_LOGS = [
  { code: '001', title: 'Internal QC CAPA Log', fields: [f('parameter', 'Parameter / Analyte'), f('nonConformance', 'Non-conformance', 'textarea'), f('rootCause', 'Root Cause', 'textarea'), f('correctiveAction', 'Corrective Action', 'textarea'), f('preventiveAction', 'Preventive Action', 'textarea'), f('closedOn', 'Closed On', 'date')] },
  { code: '002', title: 'Reagent Usage Log', fields: [f('reagent', 'Reagent'), f('lotNumber', 'Lot No.'), f('expiry', 'Expiry', 'date'), f('openedOn', 'Opened On', 'date'), f('quantity', 'Quantity Used'), f('balance', 'Balance')] },
  { code: '003', title: 'New Reagent Lot Verification', fields: [f('reagent', 'Reagent'), f('oldLot', 'Old Lot'), f('newLot', 'New Lot'), f('oldValue', 'Value (Old Lot)', 'number'), f('newValue', 'Value (New Lot)', 'number'), f('acceptable', 'Acceptable?', 'boolean')] },
  { code: '004', title: 'New QC Lot Verification', fields: [f('qcName', 'QC Name'), f('oldLot', 'Old Lot'), f('newLot', 'New Lot'), f('oldValue', 'Value (Old Lot)', 'number'), f('newValue', 'Value (New Lot)', 'number'), f('acceptable', 'Acceptable?', 'boolean')] },
  { code: '005', title: 'Critical Alert Log — LAB', fields: [f('patient', 'Patient / Sample ID'), f('parameter', 'Parameter'), f('value', 'Critical Value'), f('notifiedTo', 'Notified To'), f('notifiedAt', 'Notified At', 'datetime'), f('readback', 'Read-back Confirmed?', 'boolean')] },
  { code: '006', title: 'Sample Rejection Log', fields: [f('sampleId', 'Sample ID'), f('test', 'Test'), f('reason', 'Rejection Reason', 'textarea'), f('action', 'Action / Recollection', 'textarea')] },
  { code: '007', title: 'Hypochlorite Preparation Log', fields: [f('concentration', 'Concentration (%)'), f('volumePrepared', 'Volume Prepared'), f('preparedBy', 'Prepared By'), f('expiry', 'Use Before', 'date')] },
  { code: '008', title: 'Sample Discarding Log', fields: [f('sampleId', 'Sample ID'), f('discardMethod', 'Discard Method'), f('discardedOn', 'Discarded On', 'date'), f('witnessedBy', 'Witnessed By')] },
  { code: '009', title: 'Department Cleaning Log', fields: [f('area', 'Area / Bench'), f('cleaningAgent', 'Cleaning Agent'), f('cleanedBy', 'Cleaned By'), f('verifiedBy', 'Verified By')] },
  { code: '010', title: 'Inter Personnel Validation', fields: [f('parameter', 'Parameter'), f('analystA', 'Analyst A'), f('analystB', 'Analyst B'), f('resultA', 'Result A', 'number'), f('resultB', 'Result B', 'number'), f('diffPercent', '% Difference', 'number'), f('acceptable', 'Acceptable?', 'boolean')] },
  { code: '011', title: 'Inter-Laboratory Comparison (ILC)', fields: [f('test', 'Test'), f('analyte', 'Analyte'), f('ourResult', 'Our Result', 'number'), f('refLabResult', 'Reference Lab Result', 'number'), f('diffPercent', '% Difference', 'number'), f('acceptable', 'Acceptable?', 'boolean')] },
  { code: '012', title: 'Sample Receiving Log', fields: [f('sampleId', 'Sample ID'), f('receivedFrom', 'Received From'), f('condition', 'Condition'), f('receivedAt', 'Received At', 'datetime')] },
  { code: '013', title: 'Room Temperature & Humidity Log', fields: TEMP_FIELDS },
  { code: '014', title: 'Daily Temperature Log — Refrigerator / Cold Room / Deep Freezer', fields: TEMP_FIELDS },
  { code: '015', title: 'Maintenance Log — Centrifuge', fields: [f('equipment', 'Centrifuge ID'), f('task', 'Maintenance Task'), f('rpmCheck', 'RPM Check OK?', 'boolean'), f('performedBy', 'Performed By')] },
  { code: '016', title: 'Repeat Testing Log', fields: [f('sampleId', 'Sample ID'), f('test', 'Test'), f('firstResult', 'First Result'), f('repeatResult', 'Repeat Result'), f('reason', 'Reason', 'textarea')] },
  { code: '017', title: 'Daily Temperature Log — Incubator', fields: TEMP_FIELDS },
  { code: '018', title: 'Maintenance Log — Microscope', fields: [f('equipment', 'Microscope ID'), f('task', 'Maintenance Task'), f('performedBy', 'Performed By')] },
  { code: '019', title: 'Water Quality Check Log', fields: [f('source', 'Water Source'), f('conductivity', 'Conductivity (µS/cm)', 'number'), f('ph', 'pH', 'number'), f('acceptable', 'Acceptable?', 'boolean')] },
  { code: '020', title: 'Patient Complaint Log', fields: [f('patient', 'Patient'), f('complaint', 'Complaint', 'textarea'), f('action', 'Action Taken', 'textarea'), f('resolvedOn', 'Resolved On', 'date')] },
  { code: '021', title: 'Retained Sample Log', fields: [f('sampleId', 'Sample ID'), f('storedLocation', 'Storage Location'), f('retainUntil', 'Retain Until', 'date')] },
  { code: '022', title: 'Laboratory Fire Safety Checklist', fields: [f('extinguisherOk', 'Extinguishers OK?', 'boolean'), f('exitsClear', 'Exits Clear?', 'boolean'), f('alarmsOk', 'Alarms OK?', 'boolean'), f('remarks', 'Remarks', 'textarea')] },
  { code: '023', title: 'Emergency Sample Log', fields: [f('sampleId', 'Sample ID'), f('test', 'Test'), f('receivedAt', 'Received At', 'datetime'), f('reportedAt', 'Reported At', 'datetime')] },
  { code: '024', title: 'List of Controlled Signatures', fields: [f('name', 'Name'), f('designation', 'Designation'), f('specimenSignature', 'Specimen Signature Ref')] },
  { code: '025', title: 'Advisory Services', fields: [f('query', 'Clinical Query', 'textarea'), f('advisedBy', 'Advised By'), f('advice', 'Advice Given', 'textarea')] },
  { code: '026', title: 'Incident Form', fields: [f('incident', 'Incident', 'textarea'), f('severity', 'Severity'), f('immediateAction', 'Immediate Action', 'textarea'), f('rootCause', 'Root Cause', 'textarea')] },
  { code: '027', title: 'Maintenance & QC Log — Autoclave', fields: [f('cycleNo', 'Cycle No.'), f('temperature', 'Temperature (°C)', 'number'), f('pressure', 'Pressure'), f('bowieDick', 'Bowie-Dick Pass?', 'boolean'), f('spore', 'Spore Test Pass?', 'boolean')] },
  { code: '028', title: 'TAT Outliers', fields: [f('test', 'Test'), f('expectedTat', 'Expected TAT'), f('actualTat', 'Actual TAT'), f('reason', 'Reason for Delay', 'textarea')] },
  { code: '029', title: 'Vendor BMW', fields: [f('vendor', 'BMW Vendor'), f('quantity', 'Quantity (kg)'), f('collectedOn', 'Collected On', 'date'), f('manifestNo', 'Manifest No.')] },
  { code: '030', title: 'Spill Log', fields: [f('material', 'Spilled Material'), f('location', 'Location'), f('cleanedBy', 'Cleaned By'), f('action', 'Action', 'textarea')] },
  { code: '031', title: 'Vendor Evaluation Log', fields: [f('vendor', 'Vendor'), f('score', 'Evaluation Score', 'number'), f('outcome', 'Outcome')] },
  { code: '032', title: 'Vendor Evaluation Criteria', fields: GENERIC_LOG_FIELDS },
  { code: '033', title: 'List of Selected and Approved Vendors', fields: [f('vendor', 'Vendor'), f('category', 'Category'), f('approvedOn', 'Approved On', 'date')] },
  { code: '034', title: 'Staff Suggestion Form', fields: [f('staff', 'Staff Name'), f('suggestion', 'Suggestion', 'textarea')] },
  { code: '035', title: 'Patient Feedback Form', fields: [f('patient', 'Patient'), f('rating', 'Rating (1-5)', 'number'), f('feedback', 'Feedback', 'textarea')] },
  { code: '036', title: 'Feedback Form (Doctors)', fields: [f('doctor', 'Doctor'), f('rating', 'Rating (1-5)', 'number'), f('feedback', 'Feedback', 'textarea')] },
];

export const QMS_LOGS = [
  { code: '001', title: 'Amendment Log', fields: [f('document', 'Document'), f('amendment', 'Amendment', 'textarea'), f('version', 'New Version')] },
  { code: '002', title: 'Non Conformance', fields: [f('nonConformance', 'Non-conformance', 'textarea'), f('rootCause', 'Root Cause', 'textarea'), f('correction', 'Correction', 'textarea')] },
  { code: '003', title: 'Deviation in Service Agreement', fields: [f('agreement', 'Agreement'), f('deviation', 'Deviation', 'textarea'), f('action', 'Action', 'textarea')] },
  { code: '004', title: 'Risk Assessment', fields: [f('stage', 'Stage'), f('risk', 'Potential Risk', 'textarea'), f('riskLevel', 'Risk Level'), f('mitigation', 'Mitigation', 'textarea')] },
  { code: '005', title: 'Risk Assessment Schedule', fields: [f('activity', 'Activity'), f('scheduledMonth', 'Scheduled Month'), f('responsible', 'Responsible')] },
  { code: '008', title: 'LIS Verification', fields: [f('parameter', 'Parameter'), f('equipmentResult', 'Equipment Result', 'number'), f('lisResult', 'LIS Result', 'number'), f('match', 'Match?', 'boolean')] },
  { code: '009', title: 'Read and Understood', fields: [f('document', 'Document / SOP'), f('staff', 'Staff'), f('readOn', 'Read On', 'date')] },
  { code: '010', title: 'Referral Lab Selection', fields: [f('lab', 'Referral Lab'), f('scope', 'Scope'), f('selectedOn', 'Selected On', 'date')] },
  { code: '011', title: 'Referral Lab Evaluation', fields: [f('lab', 'Referral Lab'), f('score', 'Score', 'number'), f('outcome', 'Outcome')] },
  { code: '013', title: 'List of Authorized Signatories', fields: [f('name', 'Name'), f('scope', 'Authorized Scope')] },
  { code: '014', title: 'Document Distribution Record', fields: [f('document', 'Document'), f('issuedTo', 'Issued To'), f('copyNo', 'Copy No.')] },
  { code: '017', title: 'Critical Value Alerts', fields: [f('parameter', 'Parameter'), f('value', 'Value'), f('notifiedTo', 'Notified To'), f('notifiedAt', 'Notified At', 'datetime')] },
  { code: '018', title: 'Authorization of Personnel Using LIS', fields: [f('name', 'Name'), f('accessLevel', 'Access Level'), f('authorizedOn', 'Authorized On', 'date')] },
  { code: '019', title: 'List of Referral Laboratories', fields: [f('lab', 'Laboratory'), f('contact', 'Contact'), f('scope', 'Scope')] },
  { code: '022', title: 'Training Annual Schedule', fields: [f('topic', 'Training Topic'), f('month', 'Month'), f('trainer', 'Trainer')] },
  { code: '024', title: 'Preventive Maintenance', fields: [f('equipment', 'Equipment'), f('task', 'PM Task'), f('dueOn', 'Due On', 'date'), f('doneOn', 'Done On', 'date')] },
  { code: '025', title: 'Mock Drill Report', fields: [f('drillType', 'Drill Type'), f('conductedOn', 'Conducted On', 'date'), f('outcome', 'Outcome', 'textarea')] },
  { code: '026', title: 'Opening and Closing Meeting Record', fields: [f('meetingType', 'Meeting Type'), f('attendees', 'Attendees', 'textarea'), f('minutes', 'Minutes', 'textarea')] },
  { code: '027', title: 'Issuance and Retrieval Record Form', fields: [f('document', 'Document'), f('issuedTo', 'Issued To'), f('retrievedOn', 'Retrieved On', 'date')] },
  { code: '028', title: 'Result Reversal Log', fields: [f('sampleId', 'Sample ID'), f('parameter', 'Parameter'), f('oldResult', 'Original Result'), f('newResult', 'Revised Result'), f('reason', 'Reason', 'textarea'), f('authorizedBy', 'Authorized By')] },
];

export function allLogs() {
  return [
    ...GENERAL_LOGS.map(l => ({ ...l, category: 'GENERAL' })),
    ...QMS_LOGS.map(l => ({ ...l, category: 'QMS' })),
  ];
}

export function findLog(category, code) {
  const list = category === 'QMS' ? QMS_LOGS : GENERAL_LOGS;
  return list.find(l => l.code === code);
}
