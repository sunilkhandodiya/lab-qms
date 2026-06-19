// app/general-quality/[category]/[code]/page.js
import Link from 'next/link';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { findLog } from '@/lib/logCatalog';
import RecordEntry from './RecordEntry';

function StatusBadge({ value }) {
  const v = value || 'SUBMITTED';
  return (
    <span className={`badge badge-${String(v).toLowerCase().replace(/_/g, '')}`}>
      {String(v).replace(/_/g, ' ')}
    </span>
  );
}

function fmtFieldValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (field.type === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No';
  return String(value);
}

export default async function LogDetailPage({ params }) {
  const { category, code } = await params;
  const cat = category === 'QMS' ? 'QMS' : 'GENERAL';
  const log = findLog(cat, code);

  if (!log) {
    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Format not found</div>
            <div className="page-subtitle">
              <Link href="/general-quality" className="tab" style={{ padding: 0 }}>← Back to General Quality</Link>
            </div>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <div>No format exists for {cat}-{code}.</div>
        </div>
      </div>
    );
  }

  const where = await locationWhere();
  const records = await prisma.qualityRecord.findMany({
    where: { ...where, category: cat, logCode: code },
    orderBy: { date: 'desc' },
  });

  // Show up to the first 3 field definitions as preview columns in the table.
  const previewFields = log.fields.slice(0, 3);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <div className="page-title">{log.title}</div>
            <div className="page-subtitle">
              <span className="mono">{cat}-{code}</span>
              {' · '}
              <Link href={`/general-quality?cat=${cat}`}>← Back to General Quality</Link>
            </div>
          </div>
          <RecordEntry
            logCode={code}
            logTitle={log.title}
            category={cat}
            fields={log.fields}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Records</div>
        {records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div>No records yet. Use “+ New Record” to add the first entry.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Summary</th>
                  {previewFields.map(f => <th key={f.key}>{f.label}</th>)}
                  <th>Recorded By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const data = r.data || {};
                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}
                      </td>
                      <td style={{ fontWeight: 500 }}>{r.summary || '—'}</td>
                      {previewFields.map(f => (
                        <td key={f.key} className="text-secondary" style={{ fontSize: 12 }}>
                          {fmtFieldValue(f, data[f.key])}
                        </td>
                      ))}
                      <td className="text-secondary">{r.recordedBy || '—'}</td>
                      <td><StatusBadge value={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
