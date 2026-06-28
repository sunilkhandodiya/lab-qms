'use client';
// app/playbook/[id]/PlaybookBuilderClient.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CanDo } from '@/components/RoleGuard';

const CATEGORIES = [
  ['DAILY_QC','Daily QC'],['INSTRUMENT_STARTUP','Instrument Startup'],['INSTRUMENT_SHUTDOWN','Instrument Shutdown'],
  ['CALIBRATION','Calibration'],['SAMPLE_HANDLING','Sample Handling'],['REAGENT_PREPARATION','Reagent Preparation'],
  ['EQUIPMENT_MAINTENANCE','Equipment Maintenance'],['SAFETY_CHECK','Safety Check'],
  ['SHIFT_HANDOVER','Shift Handover'],['INCIDENT_RESPONSE','Incident Response'],['CUSTOM','Custom'],
];
const STEP_TYPES = [
  ['CHECKBOX','✅ Checkbox — confirm done'],
  ['TEXT','📝 Text — free-text observation'],
  ['NUMBER','🔢 Number — numeric entry with range'],
  ['TEMPERATURE','🌡 Temperature — numeric + units'],
  ['CHOICE','☑ Choice — Pass / Fail / N/A'],
];

const EMPTY_STEP = { title: '', instruction: '', stepType: 'CHECKBOX', required: true, expectedValue: '', unit: '', passMin: '', passMax: '', onFail: '' };

function StepCard({ step, index, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(index === 0);
  function set(k, v) { onChange({ ...step, [k]: v }); }
  const hasRange = step.stepType === 'NUMBER' || step.stepType === 'TEMPERATURE';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-blue)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </span>
        <div style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{step.title || <span style={{ color: 'var(--text-muted)' }}>Untitled step</span>}</div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10 }}>
          {STEP_TYPES.find(s => s[0] === step.stepType)?.[1].split(' ')[0]}
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
              <input className="form-input" value={step.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Check QC sample appearance" />
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Expected Value (hint)</label>
              <input className="form-input" value={step.expectedValue} onChange={e => set('expectedValue', e.target.value)} placeholder="e.g. Clear, no turbidity" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Action if Fail / Out of Range</label>
              <input className="form-input" value={step.onFail} onChange={e => set('onFail', e.target.value)} placeholder="e.g. Stop and notify supervisor" />
            </div>
          </div>
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
    ? playbook.steps.map(s => ({ ...s, passMin: s.passMin ?? '', passMax: s.passMax ?? '', unit: s.unit ?? '', expectedValue: s.expectedValue ?? '', onFail: s.onFail ?? '' }))
    : [{ ...EMPTY_STEP }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addStep() { setSteps(s => [...s, { ...EMPTY_STEP }]); }
  function removeStep(i) { setSteps(s => s.filter((_, idx) => idx !== i)); }
  function updateStep(i, s) { setSteps(prev => prev.map((x, idx) => idx === i ? s : x)); }
  function moveUp(i) { if (i === 0) return; setSteps(s => { const n = [...s]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); }
  function moveDown(i) { setSteps(s => { if (i >= s.length - 1) return s; const n = [...s]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (steps.length === 0) { setError('Add at least one step.'); return; }
    setError(''); setSaving(true);
    const body = { ...form, steps: steps.map((s, i) => ({ ...s, order: i + 1, passMin: s.passMin === '' ? null : Number(s.passMin), passMax: s.passMax === '' ? null : Number(s.passMax) })) };
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
        </div>

        {/* Right: steps */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Steps <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({steps.length})</span></div>
            <button className="btn btn-ghost" onClick={addStep} style={{ fontSize: 13 }}>＋ Add Step</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {steps.map((s, i) => (
              <StepCard key={i} step={s} index={i} total={steps.length}
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
