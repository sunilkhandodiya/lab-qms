'use client';
// app/nc/NCClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';
import { format } from 'date-fns';

const TYPE_LABELS = { EQUIPMENT_FAILURE:'Equipment Failure',REAGENT_ISSUE:'Reagent Issue',SAMPLE_REJECTION:'Sample Rejection',QC_FAILURE:'QC Failure',PROCESS_DEVIATION:'Process Deviation',DOCUMENTATION:'Documentation',STAFF_COMPETENCY:'Staff Competency',OTHER:'Other' };
const SOURCE_LABELS = { INTERNAL_AUDIT:'Internal Audit',EXTERNAL_AUDIT:'External Audit',DAILY_QC:'Daily QC',PATIENT_COMPLAINT:'Patient Complaint',STAFF_OBSERVATION:'Staff Observation',EQAS:'EQAS',OTHER:'Other' };
const SEV_STYLES = { MINOR:{bg:'rgba(100,116,139,0.1)',color:'#64748b'}, MAJOR:{bg:'rgba(217,119,6,0.1)',color:'#d97706'}, CRITICAL:{bg:'rgba(220,38,38,0.1)',color:'#dc2626'} };
const STATUS_STYLES = { OPEN:{bg:'rgba(220,38,38,0.1)',color:'#dc2626'}, INVESTIGATION:{bg:'rgba(217,119,6,0.1)',color:'#d97706'}, ACTION_TAKEN:{bg:'rgba(37,99,235,0.1)',color:'#2563eb'}, CLOSED:{bg:'rgba(22,163,74,0.1)',color:'#16a34a'} };

function NCModal({ locations, departments, onSave, onClose }) {
  const [form, setForm] = useState({ title:'',type:'QC_FAILURE',source:'STAFF_OBSERVATION',severity:'MINOR',department:'',description:'',detectedBy:'',locationId:'',immediateAction:'' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function set(k,v) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() {
    if (!form.title.trim()||!form.description.trim()||!form.detectedBy.trim()) { setError('Title, description, and detected by are required.'); return; }
    setError(''); setSaving(true);
    const err = await onSave(form);
    if (err) { setError(err); setSaving(false); }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:600 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">⚠ Raise Non-Conformance</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body" style={{ maxHeight:'65vh',overflowY:'auto' }}>
          {error&&<div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Brief description of the non-conformance" />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <div className="form-group">
              <label className="form-label">Type *</label>
              <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                {Object.entries(TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source} onChange={e=>set('source',e.target.value)}>
                {Object.entries(SOURCE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <div style={{ display:'flex',gap:8 }}>
              {[['MINOR','Minor'],['MAJOR','Major'],['CRITICAL','Critical']].map(([v,l])=>(
                <button key={v} type="button" onClick={()=>set('severity',v)}
                  style={{ flex:1,padding:'8px',borderRadius:8,border:`2px solid ${form.severity===v?(SEV_STYLES[v]?.color||'#64748b'):'var(--border)'}`,
                    background:form.severity===v?(SEV_STYLES[v]?.bg||'transparent'):'var(--bg-input)',
                    color:form.severity===v?(SEV_STYLES[v]?.color||'var(--text-primary)'):'var(--text-secondary)',
                    cursor:'pointer',fontWeight:form.severity===v?700:400,fontSize:13 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={form.department} onChange={e=>set('department',e.target.value)}>
                <option value="">Select department</option>
                {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.locationId} onChange={e=>set('locationId',e.target.value)}>
                <option value="">All locations</option>
                {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" value={form.description} onChange={e=>set('description',e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="What happened? Include equipment, reagent, time, impact..." />
          </div>
          <div className="form-group">
            <label className="form-label">Immediate Action Taken</label>
            <textarea className="form-input" value={form.immediateAction} onChange={e=>set('immediateAction',e.target.value)} rows={2} style={{ resize:'vertical' }} placeholder="e.g. Quarantined samples, stopped analysis, notified supervisor..." />
          </div>
          <div className="form-group">
            <label className="form-label">Detected By *</label>
            <input className="form-input" value={form.detectedBy} onChange={e=>set('detectedBy',e.target.value)} placeholder="Your name" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Raise NC'}</button>
        </div>
      </div>
    </div>
  );
}

function NCDetailModal({ nc, onClose, onUpdate }) {
  const [status, setStatus] = useState(nc.status);
  const [rootCause, setRootCause] = useState(nc.rootCause || '');
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/nc/${nc.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ status, rootCause }) });
    if (res.ok) { const updated = await res.json(); onUpdate(updated); onClose(); }
    setSaving(false);
  }
  const ss = STATUS_STYLES[status]||STATUS_STYLES.OPEN;
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)' }}>{nc.ncNumber}</div>
            <div className="modal-title" style={{ marginTop:2 }}>{nc.title}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16 }}>
            <div><div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:3 }}>TYPE</div><div style={{ fontSize:13 }}>{TYPE_LABELS[nc.type]}</div></div>
            <div><div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:3 }}>SEVERITY</div><span style={{ fontSize:12,padding:'2px 8px',borderRadius:10,background:SEV_STYLES[nc.severity]?.bg,color:SEV_STYLES[nc.severity]?.color,fontWeight:600 }}>{nc.severity}</span></div>
            <div><div style={{ fontSize:11,color:'var(--text-muted)',marginBottom:3 }}>DATE</div><div style={{ fontSize:13 }}>{format(new Date(nc.detectedAt),'dd MMM yy')}</div></div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <div style={{ fontSize:13,color:'var(--text-secondary)',background:'var(--bg-secondary)',borderRadius:6,padding:'10px 12px',lineHeight:1.6 }}>{nc.description}</div>
          </div>
          {nc.immediateAction&&<div className="form-group"><label className="form-label">Immediate Action Taken</label><div style={{ fontSize:13,color:'var(--text-secondary)',background:'var(--bg-secondary)',borderRadius:6,padding:'10px 12px' }}>{nc.immediateAction}</div></div>}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={e=>setStatus(e.target.value)}>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATION">Under Investigation</option>
              <option value="ACTION_TAKEN">Action Taken</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Root Cause Analysis</label>
            <textarea className="form-input" value={rootCause} onChange={e=>setRootCause(e.target.value)} rows={3} style={{ resize:'vertical' }} placeholder="Document the root cause..." />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Update'}</button>
        </div>
      </div>
    </div>
  );
}

export default function NCClient({ initialNCs, locations, departments }) {
  const [ncs, setNCs] = useState(initialNCs);
  const [showAdd, setShowAdd] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSev, setFilterSev] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => ncs.filter(n => {
    if (filterStatus && n.status !== filterStatus) return false;
    if (filterSev && n.severity !== filterSev) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.ncNumber.includes(search)) return false;
    return true;
  }), [ncs, filterStatus, filterSev, search]);

  async function handleAdd(form) {
    const res = await fetch('/api/nc', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error||'Failed to save.'; }
    const created = await res.json();
    setNCs(prev => [created, ...prev]);
    setShowAdd(false);
  }

  const openCount = ncs.filter(n=>n.status==='OPEN').length;
  const critCount = ncs.filter(n=>n.severity==='CRITICAL'&&n.status!=='CLOSED').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>Dashboard › Non-Conformance</div>
          <div className="page-title">Non-Conformance Register</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:2 }}>Track lab incidents, deviations, and quality failures.</div>
        </div>
        <CanDo permission="nc:create">
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>⚠ Raise NC</button>
        </CanDo>
      </div>

      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20 }}>
        {[
          { label:'Total',value:ncs.length,color:'var(--text-primary)' },
          { label:'Open',value:openCount,color:'#dc2626' },
          { label:'Critical',value:critCount,color:'#b91c1c' },
          { label:'Closed',value:ncs.filter(n=>n.status==='CLOSED').length,color:'#16a34a' },
        ].map(s=>(
          <div key={s.label} className="card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:26,fontWeight:700,color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex',gap:10,marginBottom:16,flexWrap:'wrap' }}>
        <input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search NC…" style={{ width:200,fontSize:13 }} />
        <select className="form-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ width:160,fontSize:13 }}>
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATION">Investigation</option>
          <option value="ACTION_TAKEN">Action Taken</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select className="form-select" value={filterSev} onChange={e=>setFilterSev(e.target.value)} style={{ width:140,fontSize:13 }}>
          <option value="">All Severities</option>
          <option value="MINOR">Minor</option>
          <option value="MAJOR">Major</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr>{['NC No.','Title','Type','Severity','Department','Detected','Status',''].map((h,i)=><th key={i}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length===0
                ?<tr><td colSpan={8} style={{ padding:32,textAlign:'center',color:'var(--text-muted)' }}>No non-conformances found.</td></tr>
                :filtered.map(n=>{
                  const ss=STATUS_STYLES[n.status]||STATUS_STYLES.OPEN;
                  const sv=SEV_STYLES[n.severity]||SEV_STYLES.MINOR;
                  return (
                    <tr key={n.id}>
                      <td style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)' }}>{n.ncNumber}</td>
                      <td style={{ fontWeight:500,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.title}</td>
                      <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{TYPE_LABELS[n.type]}</td>
                      <td><span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:sv.bg,color:sv.color,fontWeight:600 }}>{n.severity}</span></td>
                      <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{n.department||'—'}</td>
                      <td style={{ fontSize:12 }}>{format(new Date(n.detectedAt),'dd MMM yy')}</td>
                      <td><span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:ss.bg,color:ss.color,fontWeight:600 }}>{n.status.replace('_',' ')}</span></td>
                      <td>
                        <button onClick={()=>setViewing(n)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-blue)',fontSize:13 }}>View</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-secondary)' }}>
          Showing {filtered.length} of {ncs.length} records
        </div>
      </div>

      {showAdd&&<NCModal locations={locations} departments={departments} onSave={handleAdd} onClose={()=>setShowAdd(false)} />}
      {viewing&&<NCDetailModal nc={viewing} onClose={()=>setViewing(null)} onUpdate={updated=>setNCs(prev=>prev.map(n=>n.id===updated.id?updated:n))} />}
    </div>
  );
}
