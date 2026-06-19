'use client';
// components/AppShell.js — app frame with a collapsible sidebar (state persisted in localStorage)
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

const KEY = 'qms_sidebar_collapsed';

export default function AppShell({ sidebar, locationSwitcher, userMenu, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY) === '1');
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem(KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className={`layout ${collapsed ? 'sidebar-collapsed' : ''}`} style={{ visibility: ready ? 'visible' : 'hidden' }}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">⚗</span>
          <span className="logo-text">
            <span>Lab QMS</span>
            <span className="logo-sub">Quality Systems</span>
          </span>
        </div>
        {sidebar}
      </aside>

      <div className="content-col">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="sidebar-toggle"
              onClick={toggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? '»' : '«'}
            </button>
            {locationSwitcher}
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            {userMenu}
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
