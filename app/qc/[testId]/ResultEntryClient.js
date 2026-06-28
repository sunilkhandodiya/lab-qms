'use client';
// app/qc/[testId]/ResultEntryClient.js
import { useState, useMemo } from 'react';
import { CanDo } from '@/components/RoleGuard';
import { format } from 'date-fns';

// ── Levey-Jennings chart (inline SVG, client-side) ────────────────────────────
function LJChart({ mean, sd, points, lotLabel }) {
  if (!mean || !sd || points.length === 0) return <div style={{ padding:'20px',textAlign:'center',color:'var(--text-muted)',fontSize:12 }}>No data</div>;
  const W=680, H=200, pL=44, pR=12, pT=12, pB=36;
  const pw=W-pL-pR, ph=H-pT-pB;
  const yMin=mean-4*sd, yMax=mean+4*sd;
  const cy=v=>pT+ph*(1-(v-yMin)/(yMax-yMin));
  const n=points.length;
  const cx=i=>pL+(n<=1?pw/2:pw*i/(n-1));
  const sdLines=[{k:3,c:'#dc2626'},{k:2,c:'#d97706'},{k:1,c:'#94a3b8'},{k:0,c:'#2563eb'},{k:-1,c:'#94a3b8'},{k:-2,c:'#d97706'},{k:-3,c:'#dc2626'}];
  const ptColor=z=>{const a=Math.abs(z??0);return a>3?'#dc2626':a>2?'#d97706':'#16a34a';};
  const path=points.map((p,i)=>(i===0?'M':'L')+cx(i).toFixed(1)+' '+cy(p.value).toFixed(1)).join(' ');
  return (
    <div>
      <div style={{ fontSize:12,fontWeight:600,marginBottom:6,color:'var(--text-secondary)' }}>LJ Chart — {lotLabel}</div>
      <div style={{ overflowX:'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%',maxWidth:W,height:H,display:'block' }}>
          {sdLines.map(l=>{
            const yv=mean+l.k*sd;
            return (
              <g key={l.k}>
                <line x1={pL} y1={cy(yv)} x2={W-pR} y2={cy(yv)} stroke={l.c} strokeWidth={l.k===0?1.5:0.8} strokeDasharray={l.k===0?'0':'4 3'} opacity={0.7} />
                <text x={2} y={cy(yv)+4} fontSize="9" fill="var(--text-muted)" fontFamily="monospace">{l.k===0?'M':l.k>0?'+'+l.k+'SD':l.k+'SD'}</text>
              </g>
            );
          })}
          {n>1&&<path d={path} fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.5" />}
          {points.map((p,i)=>(
            <circle key={i} cx={cx(i)} cy={cy(p.value)} r="3.5" fill={ptColor(p.zScore)} stroke="#fff" strokeWidth="1">
              <title>{`${format(new Date(p.date),'dd MMM yy')}\nValue: ${p.value}\nZ-score: ${p.zScore!=null?p.zScore.toFixed(2):'—'}`}</title>
            </circle>
          ))}
          {n>0&&points.map((p,i)=>(
            i===0||i===n-1||(n>10&&i%Math.floor(n/5)===0)?
              <text key={'l'+i} x={cx(i)} y={H-pB+14} fontSize="8" fill="var(--text-muted)" textAnchor="middle" fontFamily="monospace">{format(new Date(p.date),'M/d')}</text>
            :null
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Stats panel (Target vs Actual) ────────────────────────────────────────────
function StatsPanel({ target, entries, lots }) {
  function actualStats(values) {
    const v=values.filter(x=>x!=null&&!isNaN(x));
    if(v.length===0)return{count:0,mean:null,sd:null,cv:null};
    const mean=v.reduce((a,b)=>a+b,0)/v.length;
    const sd=Math.sqrt(v.reduce((s,x)=>s+(x-mean)**2,0)/v.length);
    const cv=mean!==0?(sd/Math.abs(mean))*100:null;
    return{count:v.length,mean,sd,cv};
  }
  const lotKeys=[{key:'1',label:'LOT 1'},{key:'2',label:'LOT 2'},{key:'3',label:'LOT 3'}];
  const activeLots=lotKeys.filter(l=>lots['lot'+l.key]);
  if(activeLots.length===0)return null;
  return (
    <div style={{ display:'grid',gridTemplateColumns:`repeat(${activeLots.length},1fr)`,gap:14,marginBottom:20 }}>
      {activeLots.map(({key,label})=>{
        const lotName=lots['lot'+key]?.name||label;
        const tMean=target?.['lot'+key+'Mean'], tSD=target?.['lot'+key+'SD'];
        const tCV=tMean&&tSD?((tSD/Math.abs(tMean))*100).toFixed(2):null;
        const vals=entries.map(e=>e['lot'+key+'Value']).filter(v=>v!=null);
        const act=actualStats(vals);
        return (
          <div key={key} className="card" style={{ padding:'16px' }}>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:12,color:'var(--text-primary)' }}>{lotName} — Statistics</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div style={{ background:'var(--bg-secondary)',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--accent-blue)',marginBottom:8 }}>Target Data</div>
                {[['Type',target?.targetType||'—'],['Count','0 (Fixed)'],['Mean',tMean!=null?tMean.toFixed(4):'—'],['SD',tSD!=null?tSD.toFixed(4):'—'],['CV%',tCV?tCV+'%':'—']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:500,color:k==='Mean'||k==='SD'||k==='CV%'?'var(--accent-blue)':'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--bg-secondary)',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ fontSize:11,fontWeight:600,color:'var(--text-secondary)',marginBottom:8 }}>Data Entry Data</div>
                {[['Count',act.count],['Mean',act.mean!=null?act.mean.toFixed(4):'—'],['SD',act.sd!=null?act.sd.toFixed(4):'—'],['CV%',act.cv!=null?act.cv.toFixed(2)+'%':'—']].map(([k,v])=>(
                  <div key={k} style={{ display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Flag icon ─────────────────────────────────────────────────────────────────
function FlagIcon({ flags }) {
  if(!flags||flags.length===0) return <span style={{ color:'var(--text-muted)',fontSize:11 }}>—</span>;
  const isReject=flags.some(f=>f==='1-3s'||f==='2-2s'||f==='R-4s'||f==='4-1s'||f==='10x');
  return (
    <span title={flags.join(', ')} style={{ cursor:'default' }}>
      <span style={{ color:isReject?'#dc2626':'#d97706',fontSize:15 }}>⚑</span>
      <span style={{ fontSize:10,color:isReject?'#dc2626':'#d97706',marginLeft:2 }}>{flags.join(' ')}</span>
    </span>
  );
}

// ── Add Entry Modal ───────────────────────────────────────────────────────────
function AddEntryModal({ test, onSave, onClose }) {
  const today=new Date().toISOString().split('T')[0];
  const [form,setForm]=useState({ entryDate:today, measuredBy:'', lot1Value:'', lot2Value:'', lot3Value:'' });
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  async function handleSave(){
    if(!form.measuredBy.trim()){setError('Measured by is required.');return;}
    if(!form.lot1Value&&!form.lot2Value&&!form.lot3Value){setError('At least one lot value is required.');return;}
    setError('');setSaving(true);
    const err=await onSave(form);
    if(err){setError(err);setSaving(false);}
  }
  const lots=[test.lot1,test.lot2,test.lot3];
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:500 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">＋ Add QC Result</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          {error&&<div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input className="form-input" type="date" value={form.entryDate} onChange={e=>set('entryDate',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Measured By *</label>
              <input className="form-input" value={form.measuredBy} onChange={e=>set('measuredBy',e.target.value)} placeholder="Technician name" />
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12 }}>
            {[1,2,3].map(i=>(
              <div key={i} className="form-group">
                <label className="form-label">LOT {i} — {lots[i-1]?.name||'—'}</label>
                <input className="form-input" type="number" step="any"
                  value={form['lot'+i+'Value']}
                  onChange={e=>set('lot'+i+'Value',e.target.value)}
                  placeholder={lots[i-1]?'Enter value':'N/A'}
                  disabled={!lots[i-1]}
                />
              </div>
            ))}
          </div>
          {test.unit&&<div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>Unit: {test.unit}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Add Result'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Set Target Modal ──────────────────────────────────────────────────────────
function SetTargetModal({ test, onSave, onClose }) {
  const today=new Date().toISOString().split('T')[0];
  const [form,setForm]=useState({ effectiveFrom:today, lot1Mean:'', lot1SD:'', lot2Mean:'', lot2SD:'', lot3Mean:'', lot3SD:'' });
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  function set(k,v){setForm(f=>({...f,[k]:v}));}
  async function handleSave(){
    if(!form.lot1Mean&&!form.lot2Mean&&!form.lot3Mean){setError('At least one lot target is required.');return;}
    setError('');setSaving(true);
    const err=await onSave(form);
    if(err){setError(err);setSaving(false);}
  }
  const lots=[test.lot1,test.lot2,test.lot3];
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:560 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">⚙ Set Target Configuration</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          {error&&<div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          <div className="form-group" style={{ marginBottom:14 }}>
            <label className="form-label">Effective From</label>
            <input className="form-input" type="date" value={form.effectiveFrom} onChange={e=>set('effectiveFrom',e.target.value)} style={{ maxWidth:200 }} />
          </div>
          <div className="form-label" style={{ marginBottom:8 }}>Lot Targets (from manufacturer insert / Fixed)</div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ opacity:lots[i-1]?1:0.4 }}>
                <div style={{ fontSize:12,fontWeight:600,marginBottom:8,color:'var(--text-secondary)' }}>LOT {i} — {lots[i-1]?.name||'Not assigned'}</div>
                <div className="form-group">
                  <label className="form-label">Mean</label>
                  <input className="form-input" type="number" step="any" value={form['lot'+i+'Mean']} onChange={e=>set('lot'+i+'Mean',e.target.value)} disabled={!lots[i-1]} />
                </div>
                <div className="form-group">
                  <label className="form-label">SD</label>
                  <input className="form-input" type="number" step="any" value={form['lot'+i+'SD']} onChange={e=>set('lot'+i+'SD',e.target.value)} disabled={!lots[i-1]} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Set Target'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResultEntryClient({ test, initialEntries, initialTargets }) {
  const [entries,setEntries]=useState(initialEntries);
  const [targets,setTargets]=useState(initialTargets);
  const [showAdd,setShowAdd]=useState(false);
  const [showTarget,setShowTarget]=useState(false);
  const [tab,setTab]=useState('results');
  const [approving,setApproving]=useState(null);
  const [expandChart,setExpandChart]=useState(null);

  const activeTarget=useMemo(()=>targets.find(t=>t.active)||targets[0]||null,[targets]);
  const lots={lot1:test.lot1,lot2:test.lot2,lot3:test.lot3};
  const lotKeys=[1,2,3].filter(i=>test['lot'+i]);

  async function handleAddEntry(form){
    const res=await fetch('/api/iqc/entries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,qcTestId:test.id})});
    if(!res.ok){const d=await res.json();return d.error||'Failed to save.';}
    const created=await res.json();
    setEntries(prev=>[created,...prev]);
    setShowAdd(false);
  }

  async function handleSetTarget(form){
    const res=await fetch('/api/iqc/targets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,qcTestId:test.id})});
    if(!res.ok){const d=await res.json();return d.error||'Failed to save.';}
    const created=await res.json();
    setTargets(prev=>prev.map(t=>({...t,active:false})).concat([created]));
    setShowTarget(false);
  }

  async function handleApprove(entry,status,approvedBy){
    setApproving(entry.id);
    const res=await fetch(`/api/iqc/entries/${entry.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({approvalStatus:status,approvedBy:approvedBy||'Supervisor'})});
    if(res.ok){const updated=await res.json();setEntries(prev=>prev.map(e=>e.id===updated.id?updated:e));}
    setApproving(null);
  }

  async function handleDelete(id){
    if(!confirm('Delete this entry?'))return;
    const res=await fetch(`/api/iqc/entries/${id}`,{method:'DELETE'});
    if(res.ok)setEntries(prev=>prev.filter(e=>e.id!==id));
  }

  function exportCSV(){
    const headers=['Date','LOT 1','LOT 1 Flags','LOT 2','LOT 2 Flags','LOT 3','LOT 3 Flags','Approval','Measured By'];
    const rows=entries.map(e=>[format(new Date(e.entryDate),'yyyy-MM-dd'),e.lot1Value??'',e.lot1Flags?.join(' ')||'',e.lot2Value??'',e.lot2Flags?.join(' ')||'',e.lot3Value??'',e.lot3Flags?.join(' ')||'',e.approvalStatus,e.measuredBy]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(csv);a.download=`iqc-${test.testCode}.csv`;a.click();
  }

  const ljPointsFor=lotIdx=>entries.slice().reverse().filter(e=>e['lot'+lotIdx+'Value']!=null).map(e=>({date:e.entryDate,value:e['lot'+lotIdx+'Value'],zScore:e['lot'+lotIdx+'ZScore']}));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>
            <a href="/qc" style={{ color:'var(--accent-blue)',textDecoration:'none' }}>← QC Tests</a>
          </div>
          <div className="page-title">{test.testName}</div>
          <div style={{ fontSize:12,color:'var(--text-secondary)',marginTop:4,display:'flex',flexWrap:'wrap',gap:'6px 16px' }}>
            {test.instrument&&<span>Instrument: <strong>{test.instrument.name}</strong></span>}
            {test.department&&<span>Dept: <strong>{test.department.name}</strong></span>}
            {test.unit&&<span>Unit: <strong>{test.unit}</strong></span>}
            {test.method&&<span>Method: <strong>{test.method}</strong></span>}
          </div>
          <div style={{ marginTop:8,display:'flex',gap:6,flexWrap:'wrap' }}>
            {[test.lot1,test.lot2,test.lot3].filter(Boolean).map((l,i)=>(
              <span key={i} style={{ fontSize:11,padding:'2px 10px',borderRadius:20,background:'var(--accent-blue)',color:'#fff',fontFamily:'var(--font-mono)',fontWeight:600 }}>{l.name}</span>
            ))}
          </div>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <CanDo permission="config:edit"><button className="btn btn-ghost" style={{ fontSize:13 }} onClick={()=>setShowTarget(true)}>⚙ Set Target</button></CanDo>
          <CanDo permission="qc:add_result"><button className="btn btn-primary" onClick={()=>setShowAdd(true)}>＋ Add New</button></CanDo>
        </div>
      </div>

      {/* Stats */}
      <StatsPanel target={activeTarget} entries={entries} lots={lots} />

      {/* Tabs */}
      <div style={{ display:'flex',gap:0,marginBottom:16,borderBottom:'1px solid var(--border)' }}>
        {[['results','Results Entry'],['targets','Target Config'],['chart','LJ Chart']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 18px',background:'none',border:'none',cursor:'pointer',fontSize:13,fontWeight:tab===t?600:400,color:tab===t?'var(--accent-blue)':'var(--text-secondary)',borderBottom:tab===t?'2px solid var(--accent-blue)':'2px solid transparent',marginBottom:-1 }}>{l}</button>
        ))}
        {tab==='results'&&<button className="btn btn-ghost" onClick={exportCSV} style={{ fontSize:12,marginLeft:'auto' }}>↓ Export</button>}
      </div>

      {/* Results Entry tab */}
      {tab==='results'&&(
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sr. No.</th><th>Date</th>
                  {lotKeys.map(i=><th key={i}>LOT {i}<div style={{ fontSize:10,fontWeight:400,color:'var(--text-muted)' }}>{lots['lot'+i]?.name}</div><div style={{ fontSize:10,fontWeight:400 }}>Result &amp; Flag</div></th>)}
                  <th>Approval</th><th>Measured By</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.length===0
                  ?<tr><td colSpan={4+lotKeys.length} style={{ padding:32,textAlign:'center',color:'var(--text-muted)' }}>No results yet. Click "Add New" to enter today's QC values.</td></tr>
                  :entries.map((e,i)=>{
                    const appStatus=e.approvalStatus;
                    const isApproving=approving===e.id;
                    return (
                      <tr key={e.id} style={{ verticalAlign:'middle' }}>
                        <td style={{ color:'var(--text-muted)',width:50 }}>{i+1}</td>
                        <td style={{ fontFamily:'var(--font-mono)',fontSize:12,whiteSpace:'nowrap' }}>{format(new Date(e.entryDate),'dd-MM-yyyy')}</td>
                        {lotKeys.map(li=>(
                          <td key={li} style={{ verticalAlign:'middle' }}>
                            {e['lot'+li+'Value']!=null
                              ?<div>
                                <div style={{ fontWeight:500,fontSize:14 }}>{e['lot'+li+'Value']}</div>
                                <FlagIcon flags={e['lot'+li+'Flags']} />
                              </div>
                              :<span style={{ color:'var(--text-muted)' }}>—</span>
                            }
                          </td>
                        ))}
                        <td>
                          {appStatus==='APPROVED'&&<span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:'rgba(22,163,74,0.12)',color:'#16a34a',fontWeight:600 }}>Approved</span>}
                          {appStatus==='REJECTED'&&<span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:'rgba(220,38,38,0.12)',color:'#dc2626',fontWeight:600 }}>Rejected</span>}
                          {appStatus==='PENDING'&&(
                            <div style={{ display:'flex',gap:6 }}>
                              <CanDo permission="qc:approve">
                                <button title="Approve" onClick={()=>handleApprove(e,'APPROVED','Supervisor')} disabled={isApproving}
                                  style={{ background:'rgba(22,163,74,0.12)',border:'none',borderRadius:20,width:28,height:28,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>✓</button>
                                <button title="Reject" onClick={()=>handleApprove(e,'REJECTED','Supervisor')} disabled={isApproving}
                                  style={{ background:'rgba(220,38,38,0.12)',border:'none',borderRadius:20,width:28,height:28,cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>✗</button>
                              </CanDo>
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{e.measuredBy||'—'}</td>
                        <td>
                          <CanDo permission="qc:delete_test">
                            <button title="Delete" onClick={()=>handleDelete(e.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-red)',fontSize:14 }}>🗑</button>
                          </CanDo>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-secondary)' }}>
            Showing {entries.length} entries
          </div>
        </div>
      )}

      {/* Target Config tab */}
      {tab==='targets'&&(
        <div className="card" style={{ padding:0 }}>
          <table>
            <thead>
              <tr>
                <th>Sr No</th><th>Type & Effective From</th>
                {lotKeys.map(i=><th key={i} colSpan={2}>LOT {i} — {lots['lot'+i]?.name}<div style={{ display:'flex',gap:20,fontSize:11,fontWeight:400,color:'var(--text-muted)' }}><span>Mean</span><span>SD</span></div></th>)}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {targets.length===0
                ?<tr><td colSpan={3+lotKeys.length*2} style={{ padding:32,textAlign:'center',color:'var(--text-muted)' }}>No targets configured. Click "Set Target" to add from manufacturer insert.</td></tr>
                :targets.map((t,i)=>(
                  <tr key={t.id}>
                    <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                    <td>
                      <span style={{ fontSize:11,padding:'2px 8px',borderRadius:10,background:t.active?'rgba(22,163,74,0.12)':'rgba(100,116,139,0.1)',color:t.active?'#16a34a':'#64748b',fontWeight:600,marginRight:6 }}>{t.targetType}</span>
                      <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:3 }}>Effective From: {format(new Date(t.effectiveFrom),'dd/MM/yyyy HH:mm')}</div>
                      {!t.active&&<div style={{ fontSize:10,color:'var(--text-muted)',marginTop:2 }}>Old</div>}
                    </td>
                    {lotKeys.map(li=>(
                      <td key={li} colSpan={2} style={{ fontFamily:'var(--font-mono)',fontSize:12 }}>
                        <span style={{ marginRight:16 }}>{t['lot'+li+'Mean']!=null?t['lot'+li+'Mean'].toFixed(4):'—'}</span>
                        <span style={{ color:'var(--text-muted)' }}>{t['lot'+li+'SD']!=null?t['lot'+li+'SD'].toFixed(4):'—'}</span>
                      </td>
                    ))}
                    <td><span style={{ fontSize:11,color:t.active?'#16a34a':'var(--text-muted)' }}>{t.active?'Active':'Superseded'}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LJ Chart tab */}
      {tab==='chart'&&(
        <div>
          {lotKeys.map(i=>{
            const tMean=activeTarget?.['lot'+i+'Mean'], tSD=activeTarget?.['lot'+i+'SD'];
            const pts=ljPointsFor(i);
            if(!tMean||!tSD)return(
              <div key={i} className="card" style={{ marginBottom:16,padding:'20px' }}>
                <div style={{ fontSize:13,fontWeight:600,marginBottom:6 }}>LOT {i} — {lots['lot'+i]?.name||'—'}</div>
                <div style={{ color:'var(--text-muted)',fontSize:12 }}>No target configured. Set target Mean and SD to display the LJ chart.</div>
              </div>
            );
            return (
              <div key={i} className="card" style={{ marginBottom:16,padding:'16px 20px' }}>
                <LJChart mean={tMean} sd={tSD} points={pts} lotLabel={lots['lot'+i]?.name||('LOT '+i)} />
              </div>
            );
          })}
        </div>
      )}

      {showAdd&&<AddEntryModal test={test} onSave={handleAddEntry} onClose={()=>setShowAdd(false)} />}
      {showTarget&&<SetTargetModal test={test} onSave={handleSetTarget} onClose={()=>setShowTarget(false)} />}
    </div>
  );
}
