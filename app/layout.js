// app/layout.js
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuthSessionProvider from '@/components/SessionProvider';
import UserMenu from '@/components/UserMenu';
import SideNav from '@/components/SideNav';
import LocationSwitcher from '@/components/LocationSwitcher';
import { getLocationContext } from '@/lib/location';

export const metadata = {
  title: 'Lab QMS — Quality Systems Management',
  description: 'NABL / ISO 15189:2022 Laboratory Quality Management System',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  // Location context is only meaningful once signed in (and tables exist).
  let locationCtx = { states: [], locations: [], current: null };
  if (session) {
    try { locationCtx = await getLocationContext(); } catch { /* pre-migration */ }
  }

  return (
    <html lang="en">
      <body>
        <AuthSessionProvider session={session}>
          {session ? (
            <div className="layout">
              <aside className="sidebar">
                <div className="sidebar-logo">
                  <span className="logo-icon">⚗</span>
                  <span style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Lab QMS</span>
                    <span className="logo-sub">Quality Systems</span>
                  </span>
                </div>
                <SideNav role={role} />
              </aside>

              <div className="content-col">
                <header className="topbar">
                  <div className="topbar-left">
                    <LocationSwitcher
                      states={locationCtx.states}
                      locations={locationCtx.locations}
                      current={locationCtx.current}
                    />
                  </div>
                  <div className="topbar-right">
                    <UserMenu />
                  </div>
                </header>
                <main className="main-content">{children}</main>
              </div>
            </div>
          ) : (
            <main>{children}</main>
          )}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
