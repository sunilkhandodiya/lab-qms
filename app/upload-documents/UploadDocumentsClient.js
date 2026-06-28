'use client';
// app/upload-documents/UploadDocumentsClient.js
import { useState, useMemo, useRef } from 'react';
import { CanDo } from '@/components/RoleGuard';
import { format } from 'date-fns';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function UploadModal({ locations, onSave, onClose }) {
  const [form, setForm] = useState({ name:'', code:'', locationId:'', uploadedBy:'' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  function set(k,v) { setForm(f=>({...f,[k]:v})); }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return; }
    setFile(f);
    if (!form.name) setForm(prev=>({...prev, name: f.name.replace(/\.[^.]+$/, '')}));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Document name is required.'); return; }
    if (!file) { setError('Please select a file.'); return; }
    setError(''); setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileData = reader.result;
        const err = await onSave({
          name: form.name.trim(),
          code: form.code.trim() || null,
          fileType: file.type || null,
          fileSize: file.size,
          fileData,
          locationId: form.locationId || null,
          uploadedBy: form.uploadedBy.trim() || null,
        });
        if (err) { setError(err); setSaving(false); }
      };
      reader.readAsDataURL(file);
    } catch(e) { setError('Failed to read file.'); setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{ maxWidth:500 }} onClick={e=>e.stopPropagation()}>
        <div className="modal-head"><div className="modal-title">↑ Upload Document</div><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          {error&&<div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">File *</label>
            <div style={{ border:'2px dashed var(--border)',borderRadius:8,padding:'20px',textAlign:'center',cursor:'pointer',background:'var(--bg-secondary)' }}
              onClick={()=>fileRef.current?.click()}>
              {file
                ?<div><div style={{ fontWeight:500 }}>{file.name}</div><div style={{ fontSize:12,color:'var(--text-muted)',marginTop:4 }}>{formatBytes(file.size)}</div></div>
                :<div><div style={{ fontSize:24,marginBottom:8 }}>📄</div><div style={{ fontSize:13,color:'var(--text-secondary)' }}>Click to select file (max 20 MB)</div></div>}
            </div>
            <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv" />
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'2fr 1fr',gap:14 }}>
            <div className="form-group">
              <label className="form-label">Document Name *</label>
              <input className="form-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Equipment Maintenance SOP" />
            </div>
            <div className="form-group">
              <label className="form-label">Document Code</label>
              <input className="form-input" value={form.code} onChange={e=>set('code',e.target.value)} placeholder="e.g. SOP-001" />
            </div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
            <div className="form-group">
              <label className="form-label">Uploaded By</label>
              <input className="form-input" value={form.uploadedBy} onChange={e=>set('uploadedBy',e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <select className="form-select" value={form.locationId} onChange={e=>set('locationId',e.target.value)}>
                <option value="">All locations</option>
                {locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Uploading…':'Upload'}</button>
        </div>
      </div>
    </div>
  );
}

export default function UploadDocumentsClient({ initialDocs, locations }) {
  const [docs, setDocs] = useState(initialDocs);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => docs.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.code||'').toLowerCase().includes(search.toLowerCase())
  ), [docs, search]);

  async function handleUpload(form) {
    const res = await fetch('/api/upload-documents', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); return d.error||'Failed to upload.'; }
    const created = await res.json();
    setDocs(prev=>[created,...prev]);
    setShowUpload(false);
  }

  async function handleDownload(doc) {
    const res = await fetch(`/api/upload-documents/${doc.id}`);
    if (!res.ok) return;
    const full = await res.json();
    if (!full.fileData) return;
    const a = document.createElement('a');
    a.href = full.fileData;
    a.download = doc.name + (doc.fileType ? '.' + doc.fileType.split('/')[1] : '');
    a.click();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this document?')) return;
    const res = await fetch(`/api/upload-documents/${id}`, { method:'DELETE' });
    if (res.ok) setDocs(prev=>prev.filter(d=>d.id!==id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ fontSize:12,color:'var(--text-muted)',marginBottom:4 }}>Dashboard › Upload Documents</div>
          <div className="page-title">Upload Documents</div>
          <div style={{ fontSize:13,color:'var(--text-secondary)',marginTop:2 }}>Store and manage lab documents, SOPs, and reports.</div>
        </div>
        <CanDo permission="documents:create">
          <button className="btn btn-primary" onClick={()=>setShowUpload(true)}>↑ Upload Document</button>
        </CanDo>
      </div>

      <div style={{ display:'flex',gap:10,marginBottom:16 }}>
        <input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…" style={{ width:260,fontSize:13 }} />
        <span style={{ fontSize:12,color:'var(--text-muted)',padding:'0 8px',lineHeight:'38px' }}>{filtered.length} document{filtered.length!==1?'s':''}</span>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>{['Sr No','Document Name','Code','Type','Size','Location','Uploaded By','Created','Action'].map((h,i)=><th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length===0
                ?<tr><td colSpan={9} style={{ padding:32,textAlign:'center',color:'var(--text-muted)' }}>No documents uploaded yet.</td></tr>
                :filtered.map((d,i)=>(
                  <tr key={d.id}>
                    <td style={{ color:'var(--text-muted)',width:60 }}>{i+1}</td>
                    <td style={{ fontWeight:500 }}>{d.name}</td>
                    <td style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)' }}>{d.code||'—'}</td>
                    <td style={{ fontSize:12,color:'var(--text-secondary)' }}>{d.fileType?.split('/')[1]?.toUpperCase()||d.fileType||'—'}</td>
                    <td style={{ fontSize:12 }}>{formatBytes(d.fileSize)}</td>
                    <td style={{ fontSize:12 }}>{d.location?.name||'—'}</td>
                    <td style={{ fontSize:12 }}>{d.uploadedBy||'—'}</td>
                    <td style={{ fontSize:12 }}>{format(new Date(d.createdAt),'dd MMM yy')}</td>
                    <td>
                      <div style={{ display:'flex',gap:6 }}>
                        <button title="Download" onClick={()=>handleDownload(d)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-blue)',fontSize:14 }}>↓</button>
                        <CanDo permission="documents:retire">
                          <button title="Delete" onClick={()=>handleDelete(d.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--accent-red)',fontSize:14 }}>🗑</button>
                        </CanDo>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUpload&&<UploadModal locations={locations} onSave={handleUpload} onClose={()=>setShowUpload(false)} />}
    </div>
  );
}
