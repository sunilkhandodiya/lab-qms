import { CanDo } from '@/components/RoleGuard';
// app/documents/page.js
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

function Badge({ value }) {
  return <span className={`badge badge-${value?.toLowerCase().replace(/_/g,'')}`}>{value?.replace(/_/g,' ')}</span>;
}

export default async function DocumentsPage() {
  const docs = await prisma.document.findMany({
    include: { author: true, approvals: { include: { reviewer: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="page-title">Document Control</div>
            <div className="page-subtitle">SOPs, Quality Manual, Work Instructions, Forms</div>
          </div>
          <CanDo permission="documents:create"><button className="btn btn-primary">+ New Document</button></CanDo>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Doc #</th><th>Title</th><th>Category</th><th>Version</th>
                <th>Status</th><th>Author</th><th>Review Due</th><th>Approvals</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id}>
                  <td className="mono">{doc.docNumber}</td>
                  <td style={{ maxWidth: 200 }}>{doc.title}</td>
                  <td className="text-secondary mono" style={{ fontSize: 11 }}>{doc.category}</td>
                  <td className="mono">{doc.version}</td>
                  <td><Badge value={doc.status} /></td>
                  <td>{doc.author.name}</td>
                  <td className="mono text-secondary" style={{ fontSize: 11 }}>
                    {doc.reviewDue ? format(new Date(doc.reviewDue), 'dd MMM yy') : '—'}
                  </td>
                  <td>
                    {doc.approvals.map(a => (
                      <span key={a.id} style={{ marginRight: 4 }}>
                        <Badge value={a.status} />
                      </span>
                    ))}
                    {doc.approvals.length === 0 && <span className="text-muted">—</span>}
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
