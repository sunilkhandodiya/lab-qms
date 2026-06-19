// app/general-quality/page.js
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { locationWhere } from '@/lib/location';
import { GENERAL_LOGS, QMS_LOGS } from '@/lib/logCatalog';

export default async function GeneralQualityPage({ searchParams }) {
  const sp = await searchParams;
  const cat = sp?.cat === 'QMS' ? 'QMS' : 'GENERAL';

  const logs = cat === 'QMS' ? QMS_LOGS : GENERAL_LOGS;
  const where = await locationWhere();

  // Count existing records per logCode for the active category + centre.
  const grouped = await prisma.qualityRecord.groupBy({
    by: ['logCode'],
    where: { ...where, category: cat },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map(g => [g.logCode, g._count._all]));

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">General Quality</div>
          <div className="page-subtitle">Daily logs &amp; QMS records</div>
        </div>
      </div>

      <div className="tabs">
        <Link href="/general-quality?cat=GENERAL" className={`tab ${cat === 'GENERAL' ? 'active' : ''}`}>
          General Formats
        </Link>
        <Link href="/general-quality?cat=QMS" className={`tab ${cat === 'QMS' ? 'active' : ''}`}>
          QMS Formats
        </Link>
      </div>

      <div className="tile-grid">
        {logs.map(log => {
          const count = counts[log.code] || 0;
          return (
            <Link key={log.code} href={`/general-quality/${cat}/${log.code}`} className="log-tile">
              <div className="log-tile-code">{cat === 'QMS' ? 'QMS' : 'GEN'}-{log.code}</div>
              <div className="log-tile-title">{log.title}</div>
              <div className="log-tile-meta">
                <span>{count} record{count === 1 ? '' : 's'}</span>
                <span>View / Add →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
