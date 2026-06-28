'use client';
// app/configuration/westgard/WestgardConfigClient.js
import { useState } from 'react';
import { CanDo } from '@/components/RoleGuard';

const RULES = [
  { key:'rule12s', name:'1-2s', severity:'WARNING', description:'One result exceeds ±2 SD — triggers a warning and prompts inspection.', detail:'Most sensitive rule. High false-positive rate. Use as a trigger to check subsequent rules.' },
  { key:'rule13s', name:'1-3s', severity:'REJECT', description:'One result exceeds ±3 SD — immediate run rejection.', detail:'High probability of true error. Should always be active per NABL/ISO 15189.' },
  { key:'rule22s', name:'2-2s', severity:'REJECT', description:'Two consecutive results exceed ±2 SD on the same side.', detail:'Detects systematic error. Strong indicator of calibration drift.' },
  { key:'ruleR4s', name:'R-4s', severity:'REJECT', description:'Range between two consecutive results exceeds 4 SD.', detail:'Detects random error. Range = |last - previous| > 4 SD.' },
  { key:'rule41s', name:'4-1s', severity:'REJECT', description:'Four consecutive results beyond ±1 SD on same side.', detail:'Detects early systematic bias before it becomes 2-2s. Recommended for high-volume labs.' },
  { key:'rule10x', name:'10x', severity:'REJECT', description:'Ten consecutive results on same side of mean.', detail:'Long-run systematic bias detection. Allows short-term fluctuations but catches trend.' },
];

const SEV_COLORS = { WARNING:'#d97706', REJECT:'#dc2626' };

function RuleCard({ rule, enabled, onToggle, canEdit }) {
  return (
    <div style={{ display:'flex',alignItems:'flex-start',gap:16,padding:'16px 20px',borderBottom:'1px solid var(--border)' }}>
      <div style={{ paddingTop:2 }}>
        <button role="switch" aria-checked={enabled} disabled={!canEdit}
          onClick={()=>canEdit&&onToggle(!enabled)}
          style={{ width:44,height:24,borderRadius:12,border:'none',cursor:canEdit?'pointer':'default',padding:2,
            background:enabled?'var(--accent-blue)':'var(--border-strong)',transition:'background 0.2s',position:'relative',display:'inline-block',flexShrink:0 }}>
          <span style={{ display:'block',width:20,height:20,borderRadius:'50%',background:'#fff',
            transition:'transform 0.2s',transform:enabled?'translateX(20px)':'translateX(0)' }} />
        </button>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
          <span style={{ fontFamily:'var(--font-mono)',fontSize:15,fontWeight:700,color:'var(--text-primary)' }}>{rule.name}</span>
          <span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,fontWeight:600,
            background:SEV_COLORS[rule.severity]+'22',color:SEV_COLORS[rule.severity] }}>{rule.severity}</span>
          {!enabled&&<span style={{ fontSize:11,color:'var(--text-muted)',padding:'2px 6px',borderRadius:4,background:'var(--bg-secondary)' }}>Disabled</span>}
        </div>
        <div style={{ fontSize:13,color:'var(--text-primary)',marginBottom:3 }}>{rule.description}</div>
        <div style={{ fontSize:12,color:'var(--text-muted)',lineHeight:1.5 }}>{rule.detail}</div>
      </div>
    </div>
  );
}

export default function WestgardConfigClient({ initialConfig, locations }) {
  const defaults = { rule12s:true,rule13s:true,rule22s:true,ruleR4s:true,rule41s:false,rule10x:true };
  const [config, setConfig] = useState(initialConfig || defaults);
  const [locationId, setLocationId] = useState(initialConfig?.locationId || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggleRule(key, val) {
    setConfig(c=>({...c,[key]:val}));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/config/westgard', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ ...config, locationId:locationId||null }),
      });
      if (!res.ok) { const d=await res.json(); setError(d.error||'Failed to save.'); }
      else { setSaved(true); setTimeout(()=>setSaved(false),3000); }
    } catch(e) { setError('Network error.'); }
    setSaving(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>Dashboard › Configuration › Westgard</div>
          <div className="page-title">Westgard Rule Configuration</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:2 }}>Enable or disable Westgard multi-rules for IQC result evaluation. Changes apply immediately to new QC results.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:6 }}>Apply Rules For</div>
        <select className="form-select" value={locationId} onChange={e=>setLocationId(e.target.value)} style={{ maxWidth:360 }}>
          <option value="">All Locations (Global)</option>
          {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:6 }}>Each location can have its own Westgard configuration. Select a location or configure globally.</div>
      </div>

      <div className="card" style={{ padding:0,marginBottom:20 }}>
        <div style={{ padding:'12px 20px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ fontSize:14,fontWeight:600 }}>Active Rules</div>
          <div style={{ fontSize:12,color:'var(--text-muted)' }}>{RULES.filter(r=>config[r.key]).length} of {RULES.length} enabled</div>
        </div>
        {RULES.map(rule=>(
          <CanDo key={rule.key} permission="config:edit" fallback={
            <RuleCard rule={rule} enabled={config[rule.key]} onToggle={()=>{}} canEdit={false} />
          }>
            <RuleCard rule={rule} enabled={config[rule.key]} onToggle={v=>toggleRule(rule.key,v)} canEdit={true} />
          </CanDo>
        ))}
      </div>

      {error&&<div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
      {saved&&<div className="alert alert-success" style={{ marginBottom:16 }}>Westgard configuration saved.</div>}

      <CanDo permission="config:edit">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Configuration'}</button>
      </CanDo>
    </div>
  );
}
