'use client';
// components/SideNav.js — primary navigation (SOP module structure), role-aware + active link
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { canAccessPage } from '@/lib/permissions';

const NAV = [
  { href: '/',                 icon: '▣', label: 'Dashboard',              page: 'dashboard' },
  { section: 'Quality' },
  { href: '/general-quality',  icon: '☷', label: 'General Quality',        page: 'general_quality' },
  { href: '/sop',              icon: '▤', label: 'SOP',                    page: 'sop' },
  { href: '/calibration',      icon: '◎', label: 'Control & Calibration',  page: 'calibration' },
  { section: 'Operations' },
  { href: '/equipment',        icon: '⚙', label: 'Equipment & Maint.',     page: 'equipment' },
  { href: '/risk',             icon: '⚠', label: 'Risk Assessment',        page: 'risk' },
  { href: '/training',         icon: '◷', label: 'Training',               page: 'training' },
];

const ADMIN_NAV = [
  { href: '/master',      icon: '▦', label: 'Master Data', page: 'master' },
  { href: '/admin/users', icon: '◍', label: 'Users',       page: 'admin_users' },
  { href: '/admin/audit', icon: '◔', label: 'Audit Trail', page: 'admin_audit' },
];

export default function SideNav({ role }) {
  const pathname = usePathname();
  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const adminVisible = ADMIN_NAV.filter(i => canAccessPage(role, i.page));

  return (
    <nav className="sidebar-nav">
      {NAV.map((item, i) =>
        item.section
          ? <div key={i} className="nav-section">{item.section}</div>
          : canAccessPage(role, item.page) && (
            <Link key={item.href} href={item.href} title={item.label} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span> <span className="nav-label">{item.label}</span>
            </Link>
          )
      )}
      {adminVisible.length > 0 && (
        <>
          <div className="nav-section">Administration</div>
          {adminVisible.map(item => (
            <Link key={item.href} href={item.href} title={item.label} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span className="nav-icon">{item.icon}</span> <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
