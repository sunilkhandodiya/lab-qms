// app/admin/audit/page.js
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!['ADMIN', 'QUALITY_MANAGER'].includes(session?.user?.role)) {
    redirect('/unauthorized?reason=role');
  }

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const actionColors = {
    USER_LOGIN: '#22c55e',
    DOCUMENT_CREATED: '#3b82f6',
    CAPA_CREATED: '#f59e0b',
    QC_RESULT_ADDED: '#14b8a6',
    EQAS_RESULT_SUBMITTED: '#a855f7',
    EQUIPMENT_ADDED: '#3b82f6',
    TRAINING_SIGNED_OFF: '#22c55e',
    REVIEW_UPDATED: '#7c3aed',
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Audit Trail</div>
        <div className="page-subtitle">Immutable log of all system actions — last 200 entries</div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {format(new Date(log.createdAt), 'dd MMM yy HH:mm:ss')}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {log.user?.name || log.user?.email || <span className="text-muted">System</span>}
                  </td>
                  <td>
                    <span className="mono" style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 3,
                      background: `${actionColors[log.action] || '#4a5a75'}22`,
                      color: actionColors[log.action] || 'var(--text-secondary)',
                      border: `1px solid ${actionColors[log.action] || '#4a5a75'}44`,
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td className="text-secondary" style={{ fontSize: 12 }}>{log.entity}</td>
                  <td className="mono text-muted" style={{ fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                  <td className="mono text-muted" style={{ fontSize: 10 }}>{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
