// middleware.js  (Next.js middleware — runs on the edge before every request)
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Role hierarchy for route-level access
const LEADS   = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER'];
const OPS     = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'CLUSTER_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN', 'LAB_TECHNICIAN'];
const AUTHORS = ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER'];

const ROUTE_ROLES = {
  '/api/users':       ['ADMIN'],
  '/api/master':      LEADS,
  '/api/audit':       LEADS,
  '/api/capa':        ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'LAB_MANAGER', 'SR_LAB_TECHNICIAN'],
  '/api/documents':   AUTHORS,
  '/api/equipment':   ['ADMIN', 'DR_PATHOLOGY', 'QUALITY_MANAGER', 'CLUSTER_MANAGER', 'LAB_MANAGER'],
  '/api/training':    AUTHORS,
  '/api/calibration': OPS,
  '/api/quality-records': OPS,
  '/api/risk':        AUTHORS,
  '/api/qc':          OPS,
  '/api/eqas':        OPS,
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Block inactive users
    if (token?.active === false) {
      return NextResponse.redirect(new URL('/unauthorized?reason=disabled', req.url));
    }

    // Check route-level role requirements for API routes
    for (const [route, allowedRoles] of Object.entries(ROUTE_ROLES)) {
      if (pathname.startsWith(route) && req.method !== 'GET') {
        if (!allowedRoles.includes(token?.role)) {
          return NextResponse.json(
            { error: 'Insufficient permissions', required: allowedRoles },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public routes — allow without auth
        if (pathname.startsWith('/login')) return true;
        if (pathname.startsWith('/unauthorized')) return true;
        if (pathname.startsWith('/api/auth')) return true;
        // Everything else requires a valid token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
