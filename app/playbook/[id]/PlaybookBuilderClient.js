'use client';
// app/playbook/[id]/PlaybookBuilderClient.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CanDo } from '@/components/RoleGuard';

const CATEGORIES = [
  ['DAILY_QC','Daily QC'],['INSTRUMENT_STARTUP','Instrument Startup'],['INSTRUMENT_SHUTDOWN','Instrument Shutdown'],
  ['CALIBRATION','Calibration'],['SAMPLE_HANDLING','Sample Handling'],['REAGENT_PREPARATION','Reagent Preparation'],
  ['EQUIPMENT_MAINTENANCE','Equipment Maintenance'],['SAFETY_CHECK','Safety Check'],
  ['SHIFT_HANDOVER','Shift Handover'],['INCIDENT_RESPONSE','Incident Response'],['CUSTOM','Custom'],
];

const STEP_TYPES = [
  ['CHECKBOX',    '✅ Checkbox — confirm done'],
  ['TEXT',        '📝 Text — free-text observation'],
  ['NUMBER',      '🔢 Number — numeric entry with range'],
  ['TEMPERATURE', '🌡 Temperature — numeric + units'],
  ['CHOICE',      '☑ Choice — Pass / Fail / N/A'],
  ['FORM',        '⚙ Form — embedded system form'],
];

const FUNCTIONALITIES = [
  { value: 'IQC_ENTRY',       icon: '🧪', label: 'IQC Result Entry',      desc: 'Enter QC lot values — Westgard rules evaluated automatically' },
  { value: 'TEMPERATURE_LOG', icon: '🌡', label: 'Temperature Log',        desc: 'Record temperature reading with pass/fail range check' },
  { value: 'REAGENT_CHECK',   icon: '🔬', label: 'Reagent Verification',   desc: 'Verify reagent lot number, expiry date and visual appearance' },
  { value: 'EQUIPMENT_CHECK', icon: '⚙', label: 'Equipment Inspection',   desc: 'Record equipment visual inspection result and any issues' },
  { value: 'NC_REPORT',       icon: '⚑', label: 'Raise Non-Conformance',  desc: 'Log an NC event — creates a new record in the NC register' },
];

const EMPTY_STEP = {
  title: '', instruction: '', stepType: 'CHECKBOX', required: true,
  expectedValue: '', unit: '', passMin: '', passMax: '', onFail: '', functionality: '',
};

function parseConfig(str) {
  try { return str ? JSON.parse(str) : {}; } catch { return {}; }
}

function StepCard({ step, index, total, onChange, onRemove, onMoveUp, onMoveDown, qcTests }) {
  const [expanded, setExpanded] = useState(index === 0);
  function set(k, v) { onChange({ ...step, [k]: v }); }
  function setConfig(key, val) {
    const cfg = parseConfig(step.expectedValue);
    onChange({ ...step, expectedValue: JSON.stringify({ ...cfg, [key]: val }) });
  }

  const isForm = step.stepType === 'FORM';
  const hasRange = (step.stepType === 'NUMBER' || step.stepType === 'TEMPERATURE') && !isForm;
  const funcInfo = FUNCTIONALITIES.find(f => f.value === step.functionality);
  const cfg = isForm ? parseConfig(step.expectedValue) : {};

  const typeLabel = STEP_TYPES.find(s => s[0] === step.stepType)?.[1].split(' — ')[0] || step.stepType;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>
          {step.title || <span style={{ color: 'var(--text-muted)' }}>Untitled step</span>}
          {isForm && step.functionality && (
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent-blue)' }}>
              {funcInfo?.icon} {funcInfo?.label}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10 }}>
          {typeLabel}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button onClick={e => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: index === 0 ? 0.3 : 1, padding: '2px 4px' }}>▲</button>
          <button onClick={e => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', opacity: index === total - 1 ? 0.3 : 1, padding: '2px 4px' }}>▼</button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-red)', padding: '2px 4px', fontSize: 15 }}>✕</button>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Step Title *</label>
              <input className="form-input" value={step.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. Run Glucose QC" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Step Type</label>
              <select className="form-select" value={step.stepType} onChange={e => set('stepType', e.target.value)}>
                {STEP_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Instruction</label>
            <textarea className="form-input" value={step.instruction} onChange={e => set('instruction', e.target.value)}
              placeholder="Describe what the operator should do..." rows={2} style={{ resize: 'vertical' }} />
          </div>

          {/* ── FORM type ── */}
          {isForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Functionality *</label>
                <select className="form-select" value={step.functionality || ''}
                  onChange={e => onChange({ ...step, functionality: e.target.value, expectedValue: '{}' })}>
                  <option value="">— Select a form —</option>
                  {FUNCTIONALITIES.map(f => (
                    <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
                  ))}
                </select>
              </div>

              {funcInfo && (
                <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                    {funcInfo.icon} {funcInfo.label}
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: funcInfo.value === 'IQC_ENTRY' || funcInfo.value === 'TEMPERATURE_LOG' ? 12 : 0 }}>
                    {funcInfo.desc}
                  </div>

                  {/* IQC_ENTRY: optional pre-select QC test */}
                  {step.functionality === 'IQC_ENTRY' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Pre-select QC Test (optional)</label>
                      <select className="form-select" value={cfg.qcTestId || ''}
                        onChange={e => setConfig('qcTestId', e.target.value)}>
                        <option value="">— Operator selects at runtime —</option>
                        {qcTests.map(t => (
                          <option key={t.id} value={t.id}>{t.testName} ({t.testCode})</option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        If pre-selected, the operator goes straight to entering lot values.
                      </div>
                    </div>
                  )}

                  {/* TEMPERATURE_LOG: pre-fill instrument name */}
                  {step.functionality === 'TEMPERATURE_LOG' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                      <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                        <label className="form-label">Instrument / Location (pre-fill)</label>
                        <input className="form-input" value={cfg.instrumentName || ''} onChange={e => setConfig('instrumentName', e.target.value)} placeholder="e.g. Water Bath #2" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Expected (°C)</label>
                        <input className="form-input" type="number" step="any" value={cfg.expectedTemp || ''} onChange={e => setConfig('expectedTemp', e.target.value)} placeholder="37" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Tolerance (±°C)</label>
                        <input className="form-input" type="number" step="any" value={cfg.tolerance || ''} onChange={e => setConfig('tolerance', e.target.value)} placeholder="0.5" />
                      </div>
                    </div>
                  )}

                  {/* REAGENT_CHECK: pre-fill reagent name */}
                  {step.functionality === 'REAGENT_CHECK' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Reagent Name (pre-fill)</label>
                      <input className="form-input" value={cfg.reagentName || ''} onChange={e => setConfig('reagentName', e.target.value)} placeholder="e.g. Glucose Reagent Kit" />
                    </div>
                  )}

                  {/* EQUIPMENT_CHECK: pre-fill equipment name */}
                  {step.functionality === 'EQUIPMENT_CHECK' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Equipment Name (pre-fill)</label>
                      <input className="form-input" value={cfg.equipmentName || ''} onChange={e => setConfig('equipmentName', e.target.value)} placeholder="e.g. Centrifuge #3" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Range fields (NUMBER / TEMPERATURE only) ── */}
          {hasRange && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Min (pass)</label>
                <input className="form-input" type="number" value={step.passMin} onChange={e => set('passMin', e.target.value)} placeholder="e.g. 36.5" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Max (pass)</label>
                <input className="form-input" type="number" value={step.passMax} onChange={e => set('passMax', e.target.value)} placeholder="e.g. 37.5" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Unit</label>
                <input className="form-input" value={step.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. °C" />
              </div>
            </div>
          )}

          {/* ── Expected + onFail (not for FORM type) ── */}
          {!isForm && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Expected Value (hint)</label>
                <input className="form-input" value={step.expectedValue} onChange={e => set('expectedValue', e.target.value)}
                  placeholder="e.g. Clear, no turbidity" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Action if Fail / Out of Range</label>
                <input className="form-input" value={step.onFail} onChange={e => set('onFail', e.target.value)}
                  placeholder="e.g. Stop and notify supervisor" />
              </div>
            </div>
          )}

          {/* onFail for FORM type */}
          {isForm && (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Action if Form Fails</label>
              <input className="form-input" value={step.onFail} onChange={e => set('onFail', e.target.value)}
                placeholder="e.g. Repeat QC run, notify supervisor" />
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={step.required} onChange={e => set('required', e.target.checked)} />
            Required step (cannot be skipped)
          </label>
        </div>
      )}
    </div>
  );
}

export default function PlaybookBuilderClient({ playbook, locations, departments }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: playbook?.title || '',
    code: playbook?.code || '',
    category: playbook?.category || 'DAILY_QC',
    description: playbook?.description || '',
    department: playbook?.department || '',
    locationId: playbook?.locationId || '',
  });
  const [steps, setSteps] = useState(playbook?.steps?.length
    ? playbook.steps.map(s => ({
        ...s,
        passMin: s.passMin ?? '', passMax: s.passMax ?? '',
        unit: s.unit ?? '', expectedValue: s.expectedValue ?? '',
        onFail: s.onFail ?? '', functionality: s.functionality ?? '',
      }))
    : [{ ...EMPTY_STEP }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qcTests, setQcTests] = useState([]);

  useEffect(() => {
    fetch('/api/qc-tests?active=true')
      .then(r => r.json())
      .then(d => setQcTests(Array.isArray(d) ? d : d.data || []))
      .catch(() => {});
  }, []);

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function addStep() { setSteps(s => [...s, { ...EMPTY_STEP }]); }
  function removeStep(i) { setSteps(s => s.filter((_, idx) => idx !== i)); }
  function updateStep(i, s) { setSteps(prev => prev.map((x, idx) => idx === i ? s : x)); }
  function moveUp(i) { if (i === 0) return; setSteps(s => { const n = [...s]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); }
  function moveDown(i) { setSteps(s => { if (i >= s.length - 1) return s; const n = [...s]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (steps.length === 0) { setError('Add at least one step.'); return; }
    const formSteps = steps.filter(s => s.stepType === 'FORM' && !s.functionality);
    if (formSteps.length > 0) { setError('One or more Form steps have no functionality selected.'); return; }
    setError(''); setSaving(true);
    const body = {
      ...form,
      steps: steps.map((s, i) => ({
        ...s,
        order: i + 1,
        passMin: s.passMin === '' ? null : Number(s.passMin),
        passMax: s.passMax === '' ? null : Number(s.passMax),
        functionality: s.functionality || null,
      })),
    };
    const url = playbook ? `/api/playbooks/${playbook.id}` : '/api/playbooks';
    const method = playbook ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed to save.'); setSaving(false); return; }
    const saved = await res.json();
    router.push(`/playbook/${saved.id}`);
    router.refresh();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Dashboard › Playbook › {playbook ? 'Edit' : 'New'}</div>
          <div className="page-title">{playbook ? 'Edit Playbook' : 'New Playbook'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
          <CanDo permission="playbook:create">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Playbook'}</button>
          </CanDo>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
        {/* Left: metadata */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Playbook Details</div>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Daily QC Morning Startup" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Code / Reference</label>
              <input className="form-input" value={form.code} onChange={e => setF('code', e.target.value)} placeholder="e.g. PB-001" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={e => setF('category', e.target.value)}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description} onChange={e => setF('description', e.target.value)}
              placeholder="Brief description of when/why this procedure is run..." rows={3} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e => setF('department', e.target.value)}>
                <option value="">All departments</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.locationId} onChange={e => setF('locationId', e.target.value)}>
                <option value="">All locations</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Right: steps */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Steps <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({steps.length})</span></div>
            <button className="btn btn-ghost" onClick={addStep} style={{ fontSize: 13 }}>＋ Add Step</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => (
              <StepCard key={i} step={s} index={i} total={steps.length} qcTests={qcTests}
                onChange={ns => updateStep(i, ns)}
                onRemove={() => removeStep(i)}
                onMoveUp={() => moveUp(i)}
                onMoveDown={() => moveDown(i)} />
            ))}
          </div>
          <button className="btn btn-ghost" onClick={addStep} style={{ width: '100%', marginTop: 8, fontSize: 13, border: '1px dashed var(--border)' }}>＋ Add Step</button>
        </div>
      </div>
    </div>
  );
}
