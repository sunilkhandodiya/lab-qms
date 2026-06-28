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
  if (step.stepType === 'NUMBER' || step.stepType === 'TEMPERATURE') {
    const res = inRange(resp.value, step.passMin, step.passMax);
    return res;
  }
  if (step.stepType === 'CHECKBOX') return resp.value === 'done' ? true : null;
  return null;
}

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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ABANDONED' }),
      });
    }
    router.push('/playbook');
  }

  const flaggedCount = responses.filter((r, i) => computePassed(r, playbook.steps[i]) === false && !r.skipped).length;

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
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{s.title}</div>
                    {r.value && !r.skipped && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Value: <strong>{r.value}</strong>{s.unit ? ' ' + s.unit : ''}
                        {(s.passMin != null || s.passMax != null) && (
                          <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
                            (range: {s.passMin ?? '—'} – {s.passMax ?? '—'})
                          </span>
                        )}
                      </div>
                    )}
                    {r.note && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>{r.note}</div>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, whiteSpace: 'nowrap' }}>{statusLabel}</span>
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

  const isNumeric = step?.stepType === 'NUMBER' || step?.stepType === 'TEMPERATURE';
  const rangeResult = isNumeric ? inRange(resp.value, step.passMin, step.passMax) : null;
  const outOfRange = rangeResult === false;
  const canProceed = !step?.required || resp.value || resp.skipped;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{CAT_LABELS[playbook.category] || playbook.category}</div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>{playbook.title}</div>
        </div>
        <button className="btn btn-ghost" onClick={handleAbandon} style={{ fontSize: 12, color: 'var(--text-muted)' }}>✕ Abandon</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span>Step {stepIdx + 1} of {playbook.steps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'var(--accent-blue)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {playbook.steps.map((s, i) => {
            const r = responses[i];
            const p = computePassed(r, s);
            let bg = i === stepIdx ? 'var(--accent-blue)' : i < stepIdx ? (p === false ? '#dc2626' : '#16a34a') : 'var(--bg-secondary)';
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

          {(step.expectedValue || step.passMin != null || step.passMax != null) && (
            <div style={{ fontSize: 13, color: 'var(--accent-blue)', marginBottom: 16, display: 'flex', gap: 16 }}>
              {step.expectedValue && <span>Expected: <strong>{step.expectedValue}</strong></span>}
              {(step.passMin != null || step.passMax != null) && (
                <span style={{ color: 'var(--text-muted)' }}>
                  Range: {step.passMin ?? '—'} – {step.passMax ?? '—'}{step.unit ? ' ' + step.unit : ''}
                </span>
              )}
            </div>
          )}

          {/* CHECKBOX */}
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

          {/* NUMBER / TEMPERATURE */}
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

          {/* TEXT */}
          {step.stepType === 'TEXT' && (
            <textarea className="form-input" value={resp.value} onChange={e => setResp('value', e.target.value)}
              placeholder="Enter your observation..." rows={3} style={{ resize: 'vertical', fontSize: 14 }} />
          )}

          {/* CHOICE */}
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

          {/* Note field */}
          <div style={{ marginTop: 18 }}>
            <input className="form-input" value={resp.note} onChange={e => setResp('note', e.target.value)}
              placeholder="Add a note (optional)..." style={{ fontSize: 13 }} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {stepIdx > 0 && (
            <button className="btn btn-ghost" onClick={() => setStepIdx(i => i - 1)}>← Back</button>
          )}
          {!step?.required && (
            <button className="btn btn-ghost" onClick={handleSkip} style={{ color: 'var(--text-muted)' }}>Skip</button>
          )}
        </div>
        <button className="btn btn-primary" onClick={handleNext} disabled={!canProceed}
          style={{ minWidth: 140 }}>
          {stepIdx === playbook.steps.length - 1 ? 'Review & Complete →' : 'Next Step →'}
        </button>
      </div>
    </div>
  );
}
