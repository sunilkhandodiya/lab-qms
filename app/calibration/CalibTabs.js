'use client';
// app/calibration/CalibTabs.js — client tab nav using usePathname for .active
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/calibration',          label: 'Calibration Lot' },
  { href: '/calibration/qc-lot',   label: 'QC Lot' },
  { href: '/calibration/iqc',      label: 'Internal QC' },
  { href: '/calibration/cv',       label: 'CV% Monitoring' },
  { href: '/calibration/eqas',     label: 'EQAS' },
  { href: '/calibration/lis',      label: 'LIS' },
  { href: '/calibration/ilc',      label: 'ILC' },
  { href: '/calibration/ipv',      label: 'Inter-Personnel' },
];

export default function CalibTabs() {
  const pathname = usePathname();
  return (
    <div className="tabs">
      {TABS.map(t => {
        const active = t.href === '/calibration'
          ? pathname === '/calibration'
          : pathname === t.href || pathname.startsWith(t.href + '/');
        return (
          <Link key={t.href} href={t.href} className={`tab${active ? ' active' : ''}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
