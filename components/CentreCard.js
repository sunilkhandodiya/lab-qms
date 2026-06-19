'use client';
// components/CentreCard.js — dashboard centre tile: sets the active centre, then opens its QC screen
import { useRouter } from 'next/navigation';

const COOKIE = 'qms_loc';

export default function CentreCard({ loc, qc, calib, updated, href = '/calibration/iqc' }) {
  const router = useRouter();

  function open() {
    document.cookie = `${COOKIE}=${loc.id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push(href);
    router.refresh();
  }

  return (
    <div
      className="loc-card"
      onClick={open}
      title={`Open ${loc.name} — Internal QC`}
      style={{ cursor: 'pointer' }}
    >
      <div className="loc-card-head">
        <div>
          <div className="loc-card-name">{loc.stateName ? loc.name : loc.name}</div>
          <div className="loc-switch-state">{loc.stateName ?? '—'}</div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>→</span>
      </div>
      <div className="loc-card-body">
        <div>
          <div className="loc-metric-label">Control pass</div>
          <div className="loc-metric-value">{qc.pass}/{qc.total}</div>
        </div>
        <div>
          <div className="loc-metric-label">Not pass</div>
          <div className="loc-metric-value" style={{ color: qc.reject > 0 ? 'var(--reject)' : undefined }}>{qc.reject}</div>
        </div>
        <div>
          <div className="loc-metric-label">Calibration due</div>
          <div className="loc-metric-value" style={{ color: calib > 0 ? 'var(--warning)' : undefined }}>{calib}</div>
        </div>
      </div>
      <div className="loc-card-foot">
        <span>{loc.stateName ?? '—'}</span>
        <span>Updated {updated}</span>
      </div>
    </div>
  );
}
