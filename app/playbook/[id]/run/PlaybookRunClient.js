'use client';
// app/playbook/[id]/run/PlaybookRunClient.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const CAT_LABELS = {
  DAILY_QC: 'Daily QC', INSTRUMENT_STARTUP: 'Instrument Startup', INSTRUMENT_SHUTDOWN: 'Instrument Shutdown',
  CALIBRATION: 'Calibration', SAMPLE_HANDLING: 'Sample Handling', REAGENT_PREPARATION: 'Reagent Prep',
  EQUIPMENT_MAINTENANCE: 'Equipment Maint.', SAFETY_CHECK: 'Safety Check',
  SHIFT_HANDOVER: 'Shift Handover', INCIDENT_RESPONSE: 'Incident Response', CUSTOM: 'Custom',
};

const REJECT_FLAGS = ['1-3s', '2-2s', 'R-4s', '4-1s', '10x'];

function parseConfig(str) {
  try { return str ? JSON.parse(str) : {}; } catch { return {}; }
}

function inRange(val, min, max) {
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  if (min == null && max == null) return true;
  if (min != null && n < min) return false;
  if (max != null && n > max) return false;
  return true;
}

function computePassed(resp, step) {
  if (step.stepType === 'CHOICE') return resp.value === 'PASS' ? true : resp.value === 'FAIL' ? false : null;
  if (step.stepType === 'NUMBER' || step.stepType === 'TEMPERATURE') return inRange(resp.value, step.passMin, step.passMax);
  if (step.stepType === 'CHECKBOX') return resp.value === 'done' ? true : null;
  if (step.stepType === 'FORM') {
    if (!resp.value) return null;
    try {
      const data = JSON.parse(resp.value);
      if (step.functionality === 'IQC_ENTRY') {
        return !((data.flags || []).some(f => REJECT_FLAGS.includes(f)));
      }
      if (step.functionality === 'NC_REPORT') return false;
      return data.passed !== undefined ? data.passed : true;
    } catch { return null; }
  }
  return null;
}

// ── IQC Entry Form ────────────────────────────────────────────────────────────
function IQCEntryForm({ step, onComplete }) {
  const cfg = parseConfig(step.expectedValue);
  const [tests, setTests] = useState([]);
  const [testId, setTestId] = useState(cfg.qcTestId || '');
  const [selectedTest, setSelectedTest] = useState(null);
  const [measuredBy, setMeasuredBy] = useState('');
  const [lot1, setLot1] = useState('');
  const [lot2, setLot2] = useState('');
  const [lot3, setLot3] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (cfg.qcTestId) {
      fetch(`/api/qc-tests/${cfg.qcTestId}`)
        .then(r => r.json())
        .then(t => { setSelectedTest(t); setTests([t]); })
        .catch(() => {});
    } else {
      fetch('/api/qc-tests?active=true')
        .then(r => r.json())
        .then(d => setTests(Array.isArray(d) ? d : d.data || []))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (testId && tests.length) setSelectedTest(tests.find(t => t.id === testId) || null);
  }, [testId, tests]);

  async function handleSubmit() {
    if (!testId) { setError('Please select a QC test.'); return; }
    if (!lot1 && !lot2 && !lot3) { setError('At least one lot value is required.'); return; }
    setError(''); setSubmitting(true);
    const res = await fetch('/api/iqc/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qcTestId: testId, measuredBy, lot1Value: lot1 || undefined, lot2Value: lot2 || undefined, lot3Value: lot3 || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save entry.'); return; }
    const entry = await res.json();
    const flags = [...(entry.lot1Flags || []), ...(entry.lot2Flags || []), ...(entry.lot3Flags || [])];
    const hasReject = flags.some(f => REJECT_FLAGS.includes(f));
    setResult({ entry, flags, hasReject });
    onComplete(JSON.stringify({ qcTestId: testId, testName: selectedTest?.testName, measuredBy, lot1Value: lot1, lot2Value: lot2, lot3Value: lot3, entryId: entry.id, flags }));
  }

  if (result) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${result.hasReject ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}`, background: result.hasReject ? 'rgba(220,38,38,0.06)' : 'rgba(22,163,74,0.06)' }}>
        <div style={{ fontWeight: 600, color: result.hasReject ? '#dc2626' : '#16a34a', marginBottom: 6 }}>
          {result.hasReject ? '⚠ Westgard violation — review required' : '✓ QC result saved successfully'}
        </div>
        {result.flags.length > 0 && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 4 }}>Flags: {result.flags.join(', ')}</div>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Entry ID: {result.entry.id.slice(-8)} · Click "Next Step →" to continue.</div>
        {step.onFail && result.hasReject && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 6, fontSize: 13, color: '#dc2626' }}>
            Action: {step.onFail}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {!cfg.qcTestId && (
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">QC Test *</label>
          <select className="form-select" value={testId} onChange={e => setTestId(e.target.value)}>
            <option value="">— Select a QC test —</option>
            {tests.map(t => <option key={t.id} value={t.id}>{t.testName} ({t.testCode})</option>)}
          </select>
        </div>
      )}
      {selectedTest && (
        <div style={{ fontSize: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {selectedTest.instrument?.name && <span>Instrument: <strong>{selectedTest.instrument.name}</strong></span>}
          {selectedTest.unit && <span>Unit: <strong>{selectedTest.unit}</strong></span>}
          {selectedTest.lot1 && <span style={{ color: 'var(--accent-blue)' }}>L1: {selectedTest.lot1.name}</span>}
          {selectedTest.lot2 && <span style={{ color: 'var(--accent-blue)' }}>L2: {selectedTest.lot2.name}</span>}
          {selectedTest.lot3 && <span style={{ color: 'var(--accent-blue)' }}>L3: {selectedTest.lot3.name}</span>}
        </div>
      )}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Measured By</label>
        <input className="form-input" value={measuredBy} onChange={e => setMeasuredBy(e.target.value)} placeholder="Technician name" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[1, 2, 3].map(i => {
          const lotObj = selectedTest?.['lot' + i];
          const val = i === 1 ? lot1 : i === 2 ? lot2 : lot3;
          const setVal = v => i === 1 ? setLot1(v) : i === 2 ? setLot2(v) : setLot3(v);
          return (
            <div key={i} className="form-group" style={{ margin: 0, opacity: selectedTest && !lotObj ? 0.35 : 1 }}>
              <label className="form-label">
                LOT {i}{lotObj ? <span style={{ color: 'var(--accent-blue)' }}> — {lotObj.name}</span> : selectedTest ? ' (N/A)' : ''}
              </label>
              <input className="form-input" type="number" step="any" value={val}
                onChange={e => setVal(e.target.value)}
                disabled={selectedTest && !lotObj}
                placeholder={lotObj || !selectedTest ? 'Value' : '—'}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 16 }}
              />
            </div>
          );
        })}
      </div>
      {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !testId}>
        {submitting ? 'Saving…' : '✓ Submit QC Result'}
      </button>
    </div>
  );
}

// ── Temperature Log Form ──────────────────────────────────────────────────────
function TemperatureLogForm({ step, onComplete }) {
  const cfg = parseConfig(step.expectedValue);
  const expectedTemp = cfg.expectedTemp ? parseFloat(cfg.expectedTemp) : null;
  const tolerance = cfg.tolerance ? parseFloat(cfg.tolerance) : null;
  const passMin = expectedTemp != null && tolerance != null ? expectedTemp - tolerance : null;
  const passMax = expectedTemp != null && tolerance != null ? expectedTemp + tolerance : null;

  const [instrument, setInstrument] = useState(cfg.instrumentName || '');
  const [value, setValue] = useState('');
  const [done, setDone] = useState(null);

  function handleSubmit() {
    if (!value) return;
    const numVal = parseFloat(value);
    const passed = passMin != null && passMax != null ? (numVal >= passMin && numVal <= passMax) : true;
    setDone({ instrument, value, passed });
    onComplete(JSON.stringify({ instrument, value: numVal, unit: '°C', passed, expectedTemp, passMin, passMax }));
  }

  if (done) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${done.passed ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, background: done.passed ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)' }}>
        <div style={{ fontWeight: 600, color: done.passed ? '#16a34a' : '#dc2626' }}>
          {done.passed ? '✓ Temperature within range' : '⚠ Temperature out of range'}
        </div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
          {done.instrument && <span>{done.instrument} · </span>}
          Recorded: <strong>{done.value} °C</strong>
          {passMin != null && passMax != null && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>(range {passMin}–{passMax} °C)</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Instrument / Location</label>
        <input className="form-input" value={instrument} onChange={e => setInstrument(e.target.value)} placeholder="e.g. Water Bath #2" />
      </div>
      <div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Temperature (°C) *</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input className="form-input" type="number" step="any" value={value} onChange={e => setValue(e.target.value)}
              placeholder="Enter reading"
              style={{ fontSize: 20, padding: '14px 16px', fontFamily: 'var(--font-mono)', flex: 1,
                borderColor: value && passMin != null ? (parseFloat(value) >= passMin && parseFloat(value) <= passMax ? '#16a34a' : '#dc2626') : undefined }} />
            <span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 600 }}>°C</span>
          </div>
          {passMin != null && passMax != null && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Expected: {expectedTemp} °C ± {tolerance} → acceptable range {passMin}–{passMax} °C
            </div>
          )}
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!value}>✓ Record Temperature</button>
    </div>
  );
}

// ── Reagent Check Form ────────────────────────────────────────────────────────
function ReagentCheckForm({ step, onComplete }) {
  const cfg = parseConfig(step.expectedValue);
  const [reagent, setReagent] = useState(cfg.reagentName || '');
  const [lotNo, setLotNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [appearance, setAppearance] = useState('');
  const [done, setDone] = useState(null);

  function handleSubmit() {
    if (!reagent || !appearance) return;
    const expired = expiry ? new Date(expiry) < new Date() : false;
    const passed = (appearance === 'Clear' || appearance === 'Normal') && !expired;
    setDone({ reagent, lotNo, expiry, appearance, expired, passed });
    onComplete(JSON.stringify({ reagentName: reagent, lotNumber: lotNo, expiryDate: expiry, appearance, expired, passed }));
  }

  if (done) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${done.passed ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, background: done.passed ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)' }}>
        <div style={{ fontWeight: 600, color: done.passed ? '#16a34a' : '#dc2626' }}>
          {done.passed ? '✓ Reagent check passed' : `⚠ Reagent check failed${done.expired ? ' — Expired' : ''}`}
        </div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
          {done.reagent} · Lot {done.lotNo || '—'} · Appearance: {done.appearance}
          {done.expiry && <span> · Expiry: {done.expiry}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Reagent Name *</label>
          <input className="form-input" value={reagent} onChange={e => setReagent(e.target.value)} placeholder="e.g. Glucose Reagent Kit" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Lot Number</label>
          <input className="form-input" value={lotNo} onChange={e => setLotNo(e.target.value)} placeholder="e.g. R24051" />
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Expiry Date</label>
        <input className="form-input" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
        {expiry && new Date(expiry) < new Date() && (
          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠ This lot has expired</div>
        )}
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Visual Appearance *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {['Clear', 'Turbid', 'Precipitate', 'Discoloured'].map(opt => (
            <button key={opt} onClick={() => setAppearance(opt)}
              style={{ padding: '10px 6px', borderRadius: 8, border: `2px solid ${appearance === opt ? (opt === 'Clear' ? '#16a34a' : '#dc2626') : 'var(--border)'}`,
                background: appearance === opt ? (opt === 'Clear' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)') : 'var(--bg-input)',
                cursor: 'pointer', fontSize: 12, fontWeight: appearance === opt ? 600 : 400,
                color: appearance === opt ? (opt === 'Clear' ? '#16a34a' : '#dc2626') : 'var(--text-secondary)' }}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!reagent || !appearance}>✓ Record Reagent Check</button>
    </div>
  );
}

// ── Equipment Check Form ──────────────────────────────────────────────────────
function EquipmentCheckForm({ step, onComplete }) {
  const cfg = parseConfig(step.expectedValue);
  const [equipment, setEquipment] = useState(cfg.equipmentName || '');
  const [condition, setCondition] = useState('');
  const [issues, setIssues] = useState('');
  const [done, setDone] = useState(null);

  function handleSubmit() {
    if (!equipment || !condition) return;
    const passed = condition === 'Good' || condition === 'Satisfactory';
    setDone({ equipment, condition, issues, passed });
    onComplete(JSON.stringify({ equipment, condition, issues, passed }));
  }

  if (done) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, border: `1px solid ${done.passed ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, background: done.passed ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)' }}>
        <div style={{ fontWeight: 600, color: done.passed ? '#16a34a' : '#dc2626' }}>
          {done.passed ? '✓ Equipment check passed' : '⚠ Equipment issue found'}
        </div>
        <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)' }}>
          {done.equipment} · Condition: {done.condition}
          {done.issues && <div style={{ marginTop: 4 }}>Issue: {done.issues}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Equipment Name *</label>
        <input className="form-input" value={equipment} onChange={e => setEquipment(e.target.value)} placeholder="e.g. Centrifuge #3" />
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Overall Condition *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[['Good', '#16a34a'], ['Satisfactory', '#0d9488'], ['Needs Attention', '#d97706'], ['Out of Service', '#dc2626']].map(([opt, color]) => (
            <button key={opt} onClick={() => setCondition(opt)}
              style={{ padding: '10px 6px', borderRadius: 8, border: `2px solid ${condition === opt ? color : 'var(--border)'}`,
                background: condition === opt ? color + '14' : 'var(--bg-input)',
                cursor: 'pointer', fontSize: 12, fontWeight: condition === opt ? 600 : 400,
                color: condition === opt ? color : 'var(--text-secondary)' }}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Issues / Observations</label>
        <textarea className="form-input" value={issues} onChange={e => setIssues(e.target.value)}
          placeholder="Describe any issues observed..." rows={2} style={{ resize: 'vertical', fontSize: 13 }} />
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!equipment || !condition}>✓ Record Inspection</button>
    </div>
  );
}

// ── NC Report Form ────────────────────────────────────────────────────────────
function NCReportForm({ step, onComplete }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  async function handleSubmit() {
    if (!description.trim()) { setError('Description is required.'); return; }
    setError(''); setSubmitting(true);
    const res = await fetch('/api/nc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, category, severity, source: 'PLAYBOOK' }),
    });
    setSubmitting(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to raise NC.'); return; }
    const nc = await res.json();
    setDone({ nc, description, severity });
    onComplete(JSON.stringify({ ncId: nc.id, ncCode: nc.code, description, severity, passed: false }));
  }

  if (done) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)' }}>
        <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>⚑ Non-Conformance raised</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          <strong>{done.nc.code}</strong> · Severity: {done.severity}
          <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>{done.description}</div>
        </div>
      </div>
    );
  }

  const severities = [['LOW','#16a34a'],['MEDIUM','#d97706'],['HIGH','#dc2626'],['CRITICAL','#7c3aed']];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.06)', borderRadius: 8, fontSize: 13, color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
        This will create a new Non-Conformance record in the NC register.
      </div>
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Description of Non-Conformance *</label>
        <textarea className="form-input" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe what went wrong..." rows={3} style={{ resize: 'vertical', fontSize: 13 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">— Select —</option>
            {['Equipment Failure','QC Failure','Reagent Issue','Documentation','Process Deviation','Other'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Severity *</label>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            {severities.map(([s, c]) => (
              <button key={s} onClick={() => setSeverity(s)}
                style={{ flex: 1, padding: '7px 4px', borderRadius: 6, border: `2px solid ${severity === s ? c : 'var(--border)'}`,
                  background: severity === s ? c + '14' : 'var(--bg-input)', cursor: 'pointer', fontSize: 11, fontWeight: severity === s ? 700 : 400,
                  color: severity === s ? c : 'var(--text-muted)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !description.trim()}>
        {submitting ? 'Raising NC…' : '⚑ Raise Non-Conformance'}
      </button>
    </div>
  );
}

// ── Dispatch the right form ───────────────────────────────────────────────────
function InlineForm({ step, onComplete }) {
  switch (step.functionality) {
    case 'IQC_ENTRY':       return <IQCEntryForm       step={step} onComplete={onComplete} />;
    case 'TEMPERATURE_LOG': return <TemperatureLogForm  step={step} onComplete={onComplete} />;
    case 'REAGENT_CHECK':   return <ReagentCheckForm    step={step} onComplete={onComplete} />;
    case 'EQUIPMENT_CHECK': return <EquipmentCheckForm  step={step} onComplete={onComplete} />;
    case 'NC_REPORT':       return <NCReportForm        step={step} onComplete={onComplete} />;
    default: return <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Unknown form type: {step.functionality}</div>;
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────
export default function PlaybookRunClient({ playbook }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [runId, setRunId] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [responses, setResponses] = useState(() =>
    playbook.steps.map(s => ({ stepId: s.id, value: '', passed: null, skipped: false, note: '' }))
  );
  const [finalNotes, setFinalNotes] = useState('');
  const [phase, setPhase] = useState('run');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/playbook-runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookId: playbook.id, runBy: session?.user?.name || 'Unknown' }),
    }).then(r => r.json()).then(run => setRunId(run.id));
  }, []);

  const step = playbook.steps[stepIdx];
  const resp = responses[stepIdx];
  const progress = (stepIdx / playbook.steps.length) * 100;

  function setResp(k, v) {
    setResponses(prev => prev.map((r, i) => i === stepIdx ? { ...r, [k]: v } : r));
  }

  function handleNext() {
    const passed = computePassed(resp, step);
    setResponses(prev => prev.map((x, i) => i === stepIdx ? { ...x, passed } : x));
    if (stepIdx < playbook.steps.length - 1) setStepIdx(i => i + 1);
    else setPhase('summary');
  }

  function handleSkip() {
    if (step.required) return;
    setResponses(prev => prev.map((x, i) => i === stepIdx ? { ...x, skipped: true } : x));
    if (stepIdx < playbook.steps.length - 1) setStepIdx(i => i + 1);
    else setPhase('summary');
  }

  async function handleComplete() {
    if (!runId) { setError('Run not initialized.'); return; }
    setSaving(true);
    const finalResponses = responses.map((r, i) => ({ ...r, passed: computePassed(r, playbook.steps[i]) }));
    const res = await fetch(`/api/playbook-runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', notes: finalNotes, responses: finalResponses }),
    });
    if (!res.ok) { setError('Failed to save run.'); setSaving(false); return; }
    router.push('/playbook');
  }

  async function handleAbandon() {
    if (runId) {
      await fetch(`/api/playbook-runs/${runId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ABANDONED' }),
      });
    }
    router.push('/playbook');
  }

  const flaggedCount = responses.filter((r, i) => computePassed(r, playbook.steps[i]) === false && !r.skipped).length;

  // ── Summary phase ──
  if (phase === 'summary') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Playbook › Run Summary</div>
            <div className="page-title">{playbook.title}</div>
          </div>
        </div>

        {flaggedCount > 0 ? (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: '#dc2626' }}>⚠ {flaggedCount} step{flaggedCount > 1 ? 's' : ''} failed or out of range</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              This run will be marked <strong>Flagged</strong>. Review results and raise a Non-Conformance if needed.
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: '#16a34a' }}>✓ All steps completed — no failures detected</div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Step Results</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {playbook.steps.map((s, i) => {
              const r = responses[i];
              const passed = computePassed(r, s);
              let statusLabel = '—', statusColor = 'var(--text-muted)';
              if (r.skipped) { statusLabel = 'Skipped'; statusColor = '#94a3b8'; }
              else if (passed === true) { statusLabel = '✓ Pass'; statusColor = '#16a34a'; }
              else if (passed === false) { statusLabel = '✕ Fail'; statusColor = '#dc2626'; }
              else if (r.value) { statusLabel = 'Done'; statusColor = '#16a34a'; }

              let valueDisplay = r.value;
              if (s.stepType === 'FORM' && r.value) {
                try {
                  const d = JSON.parse(r.value);
                  if (s.functionality === 'IQC_ENTRY') valueDisplay = `${d.testName || 'QC'} — L1:${d.lot1Value||'—'} L2:${d.lot2Value||'—'} L3:${d.lot3Value||'—'}${d.flags?.length ? ' ['+d.flags.join(' ')+']' : ''}`;
                  else if (s.functionality === 'TEMPERATURE_LOG') valueDisplay = `${d.instrument||''} ${d.value} °C`;
                  else if (s.functionality === 'REAGENT_CHECK') valueDisplay = `${d.reagentName} · Lot ${d.lotNumber||'—'} · ${d.appearance}`;
                  else if (s.functionality === 'EQUIPMENT_CHECK') valueDisplay = `${d.equipment} · ${d.condition}`;
                  else if (s.functionality === 'NC_REPORT') valueDisplay = `NC ${d.ncCode} raised — ${d.description}`;
                } catch { valueDisplay = r.value; }
              }

              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.title}</div>
                    {valueDisplay && !r.skipped && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{valueDisplay}</div>
                    )}
                    {r.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{r.note}</div>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, whiteSpace: 'nowrap', marginTop: 2 }}>{statusLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Run Notes (optional)</label>
          <textarea className="form-input" value={finalNotes} onChange={e => setFinalNotes(e.target.value)}
            placeholder="Any observations or follow-up actions..." rows={3} style={{ resize: 'vertical' }} />
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => { setStepIdx(playbook.steps.length - 1); setPhase('run'); }}>← Back to Steps</button>
          <button className="btn btn-primary" onClick={handleComplete} disabled={saving}>
            {saving ? 'Saving…' : 'Complete & Save Run'}
          </button>
        </div>
      </div>
    );
  }

  // ── Run phase ──
  const isNumeric = step?.stepType === 'NUMBER' || step?.stepType === 'TEMPERATURE';
  const rangeResult = isNumeric ? inRange(resp.value, step.passMin, step.passMax) : null;
  const outOfRange = rangeResult === false;
  const isFormStep = step?.stepType === 'FORM';
  const formSubmitted = isFormStep && !!resp.value;
  const canProceed = !step?.required || resp.value || resp.skipped;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{CAT_LABELS[playbook.category] || playbook.category}</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{playbook.title}</div>
        </div>
        <button className="btn btn-ghost" onClick={handleAbandon} style={{ fontSize: 12, color: 'var(--text-muted)' }}>✕ Abandon</button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Step {stepIdx + 1} of {playbook.steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'var(--accent-blue)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {playbook.steps.map((s, i) => {
            const r = responses[i];
            const p = computePassed(r, s);
            const bg = i === stepIdx ? 'var(--accent-blue)' : i < stepIdx ? (p === false ? '#dc2626' : '#16a34a') : 'var(--bg-secondary)';
            return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: bg, transition: 'background 0.2s' }} />;
          })}
        </div>
      </div>

      {/* Step card */}
      {step && (
        <div className="card" style={{ padding: 28, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
              {stepIdx + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{step.title}</div>
              {!step.required && <span style={{ fontSize: 11, color: '#94a3b8', background: 'var(--bg-secondary)', padding: '1px 8px', borderRadius: 10 }}>Optional</span>}
            </div>
          </div>

          {step.instruction && (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 20, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
              {step.instruction}
            </div>
          )}

          {/* Non-form steps: expected value hint */}
          {!isFormStep && (step.expectedValue || step.passMin != null || step.passMax != null) && (
            <div style={{ fontSize: 13, color: 'var(--accent-blue)', marginBottom: 16, display: 'flex', gap: 16 }}>
              {step.expectedValue && <span>Expected: <strong>{step.expectedValue}</strong></span>}
              {(step.passMin != null || step.passMax != null) && (
                <span style={{ color: 'var(--text-muted)' }}>Range: {step.passMin ?? '—'} – {step.passMax ?? '—'}{step.unit ? ' ' + step.unit : ''}</span>
              )}
            </div>
          )}

          {/* ── FORM step ── */}
          {isFormStep && (
            <InlineForm step={step} onComplete={value => setResp('value', value)} />
          )}

          {/* ── CHECKBOX ── */}
          {step.stepType === 'CHECKBOX' && (
            <button onClick={() => setResp('value', resp.value === 'done' ? '' : 'done')}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                border: `2px solid ${resp.value === 'done' ? '#16a34a' : 'var(--border)'}`,
                borderRadius: 10, background: resp.value === 'done' ? 'rgba(22,163,74,0.06)' : 'var(--bg-input)',
                cursor: 'pointer', width: '100%', fontSize: 15, transition: 'all 0.15s' }}>
              <span style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${resp.value === 'done' ? '#16a34a' : 'var(--border)'}`,
                background: resp.value === 'done' ? '#16a34a' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', flexShrink: 0 }}>
                {resp.value === 'done' ? '✓' : ''}
              </span>
              <span style={{ color: resp.value === 'done' ? '#16a34a' : 'var(--text-primary)', fontWeight: resp.value === 'done' ? 600 : 400 }}>
                {resp.value === 'done' ? 'Confirmed — step completed' : 'Tap to confirm this step is done'}
              </span>
            </button>
          )}

          {/* ── NUMBER / TEMPERATURE ── */}
          {isNumeric && (
            <div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <input className="form-input" type="number" step="any" value={resp.value}
                  onChange={e => setResp('value', e.target.value)}
                  placeholder="Enter value..."
                  style={{ fontSize: 20, padding: '14px 16px', fontFamily: 'var(--font-mono)', flex: 1,
                    borderColor: outOfRange ? '#dc2626' : resp.value && rangeResult === true ? '#16a34a' : undefined }} />
                {step.unit && <span style={{ fontSize: 18, color: 'var(--text-secondary)', fontWeight: 600, minWidth: 40 }}>{step.unit}</span>}
              </div>
              {outOfRange && (
                <div style={{ marginTop: 10, padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, fontSize: 13 }}>
                  <strong style={{ color: '#dc2626' }}>⚠ Out of acceptable range</strong>
                  {step.onFail && <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>{step.onFail}</div>}
                </div>
              )}
              {resp.value && rangeResult === true && (
                <div style={{ marginTop: 10, padding: '10px 16px', background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                  ✓ Within acceptable range
                </div>
              )}
            </div>
          )}

          {/* ── TEXT ── */}
          {step.stepType === 'TEXT' && (
            <textarea className="form-input" value={resp.value} onChange={e => setResp('value', e.target.value)}
              placeholder="Enter your observation..." rows={3} style={{ resize: 'vertical', fontSize: 14 }} />
          )}

          {/* ── CHOICE ── */}
          {step.stepType === 'CHOICE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[['PASS', '✓ Pass', '#16a34a'], ['FAIL', '✕ Fail', '#dc2626'], ['NA', '— N/A', '#64748b']].map(([v, l, c]) => (
                <button key={v} onClick={() => setResp('value', v)}
                  style={{ padding: '16px', borderRadius: 10, border: `2px solid ${resp.value === v ? c : 'var(--border)'}`,
                    background: resp.value === v ? c + '12' : 'var(--bg-input)', cursor: 'pointer',
                    color: resp.value === v ? c : 'var(--text-secondary)', fontWeight: resp.value === v ? 700 : 400, fontSize: 15,
                    transition: 'all 0.15s' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Note field — not shown for FORM steps (they have their own UI) */}
          {!isFormStep && (
            <div style={{ marginTop: 18 }}>
              <input className="form-input" value={resp.note} onChange={e => setResp('note', e.target.value)}
                placeholder="Add a note (optional)..." style={{ fontSize: 13 }} />
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {stepIdx > 0 && <button className="btn btn-ghost" onClick={() => setStepIdx(i => i - 1)}>← Back</button>}
          {!step?.required && <button className="btn btn-ghost" onClick={handleSkip} style={{ color: 'var(--text-muted)' }}>Skip</button>}
        </div>
        <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed} style={{ minWidth: 140 }}>
          {stepIdx === playbook.steps.length - 1 ? 'Review & Complete →' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
}
