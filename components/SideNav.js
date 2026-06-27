'use client';
// components/SideNav.js — primary navigation (SOP module structure), role-aware + active link
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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
  { section: 'Configuration' },
  {
    group: true, icon: '◈', label: 'Configuration', page: 'configuration',
    children: [
      { href: '/configuration/machines',     label: 'Machine List' },
      { href: '/configuration/instruments',  label: 'Instrument' },
      { href: '/configuration/assay',        label: 'Assay' },
      { href: '/configuration/qc-tests',     label: 'Master QC Test' },
      { href: '/configuration/lots',         label: 'Lot' },
      { href: '/configuration/departments',  label: 'Department' },
    ],
  },
];

const ADMIN_NAV = [
  { href: '/master',      icon: '▦', label: 'Master Data', page: 'master' },
  { href: '/admin/users', icon: '◍', label: 'Users',       page: 'admin_users' },
  { href: '/admin/audit', icon: '◔', label: 'Audit Trail', page: 'admin_audit' },
];

export default function SideNav({ role }) {
  const pathname = usePathname();
  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const isGroupActive = (children) => children.some(c => pathname.startsWith(c.href));

  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open Configuration group if currently on a config page
    return { configuration: pathname.startsWith('/configuration') };
  });

  function toggleGroup(key) {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const adminVisible = ADMIN_NAV.filter(i => canAccessPage(role, i.page));

  return (
    <nav className="sidebar-nav">
      {NAV.map((item, i) => {
        if (item.section) return <div key={i} className="nav-section">{item.section}</div>;

        if (item.group) {
          if (!canAccessPage(role, item.page)) return null;
          const key = item.page;
          const open = openGroups[key];
          const groupActive = isGroupActive(item.children);
          return (
            <div key={i}>
              <button
                className={`nav-group-toggle ${open ? 'open' : ''}`}
                onClick={() => toggleGroup(key)}
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label" style={{ color: groupActive ? 'var(--accent-blue)' : undefined }}>{item.label}</span>
                <span className={`nav-group-arrow ${open ? 'open' : ''}`}>▾</span>
              </button>
              {open && item.children.map(child => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`nav-sub-item ${isActive(child.href) ? 'active' : ''}`}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          );
        }

        return canAccessPage(role, item.page) && (
          <Link key={item.href} href={item.href} title={item.label} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span> <span className="nav-label">{item.label}</span>
          </Link>
        );
      })}
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
