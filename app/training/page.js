import { CanDo } from '@/components/RoleGuard';
// app/training/page.js
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

function Badge({ value }) {
  return <span className={`badge badge-${value?.toLowerCase().replace(/_/g,'')}`}>{value?.replace(/_/g,' ')}</span>;
}

export default async function TrainingPage() {
  const trainings = await prisma.training.findMany({
    include: { user: true, document: true },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
  });

  const byStatus = {
    OVERDUE: trainings.filter(t => t.status === 'OVERDUE'),
    PENDING: trainings.filter(t => t.status === 'PENDING'),
    IN_PROGRESS: trainings.filter(t => t.status === 'IN_PROGRESS'),
    COMPLETED: trainings.filter(t => t.status === 'COMPLETED'),
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Training Sign-off</div>
            <div className="page-subtitle">Document read & understood records · Staff competency</div>
          </div>
          <CanDo permission="training:assign"><button className="btn btn-primary">+ Assign Training</button></CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4 section">
        {Object.entries(byStatus).map(([status, items]) => (
          <div key={status} className={`stat-card ${status === 'OVERDUE' ? 'stat-accent-red' : status === 'COMPLETED' ? 'stat-accent-green' : 'stat-accent-amber'}`}>
            <div className="stat-label">{status.replace('_', ' ')}</div>
            <div className="stat-value">{items.length}</div>
          </div>
        ))}
      </div>

      {/* Overdue - priority section */}
      {byStatus.OVERDUE.length > 0 && (
        <div className="section">
          <div className="alert alert-error">
            ⚠ {byStatus.OVERDUE.length} training assignment(s) are overdue
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Document</th>
                <th>Doc #</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Completed</th>
                <th>Signed Off</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.user.name}</td>
                  <td style={{ maxWidth: 200 }}>{t.document.title}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{t.document.docNumber}</td>
                  <td><Badge value={t.status} /></td>
                  <td className={`mono ${t.status === 'OVERDUE' ? 'zscore-reject' : ''}`} style={{ fontSize: 11 }}>
                    {t.dueDate ? format(new Date(t.dueDate), 'dd MMM yy') : '—'}
                  </td>
                  <td className="mono text-secondary" style={{ fontSize: 11 }}>
                    {t.completedAt ? format(new Date(t.completedAt), 'dd MMM yy') : '—'}
                  </td>
                  <td>
                    {t.signedOff
                      ? <span className="badge badge-accept">✓ Signed</span>
                      : <span className="badge badge-warning">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
