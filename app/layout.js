// app/layout.js
import './globals.css';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AuthSessionProvider from '@/components/SessionProvider';
import UserMenu from '@/components/UserMenu';
import SideNav from '@/components/SideNav';
import LocationSwitcher from '@/components/LocationSwitcher';
import AppShell from '@/components/AppShell';
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('qms_theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthSessionProvider session={session}>
          {session ? (
            <AppShell
              sidebar={<SideNav role={role} />}
              locationSwitcher={
                <LocationSwitcher
                  states={locationCtx.states}
                  locations={locationCtx.locations}
                  current={locationCtx.current}
                />
              }
              userMenu={<UserMenu />}
            >
              {children}
            </AppShell>
          ) : (
            <main>{children}</main>
          )}
        </AuthSessionProvider>
      </body>
    </html>
  );
}
