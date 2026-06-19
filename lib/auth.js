// lib/auth.js
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Role-based read/write permissions map (NABL ISO 15189:2022 roles)
const READ_ALL = [
  'documents:read', 'equipment:read', 'capa:read', 'training:read',
  'qc:read', 'eqas:read', 'calibration:read', 'gq:read', 'risk:read',
];
const WRITE_QUALITY = [
  'documents:write', 'documents:approve', 'equipment:write',
  'capa:write', 'capa:close', 'training:write', 'qc:write',
  'eqas:write', 'calibration:write', 'gq:write', 'risk:write', 'audit:read',
];
export const PERMISSIONS = {
  ADMIN:             ['users:read', 'users:write', 'users:delete', 'master:write', ...READ_ALL, ...WRITE_QUALITY],
  DR_PATHOLOGY:      ['users:read', 'master:write', ...READ_ALL, ...WRITE_QUALITY],
  QUALITY_MANAGER:   ['users:read', 'master:write', ...READ_ALL, ...WRITE_QUALITY],
  CLUSTER_MANAGER:   [...READ_ALL, 'equipment:write', 'calibration:write', 'audit:read'],
  LAB_MANAGER:       [...READ_ALL, 'documents:write', 'equipment:write', 'capa:write', 'qc:write', 'eqas:write', 'calibration:write', 'gq:write', 'risk:write'],
  SR_LAB_TECHNICIAN: [...READ_ALL, 'qc:write', 'eqas:write', 'calibration:write', 'gq:write', 'capa:write'],
  LAB_TECHNICIAN:    [...READ_ALL, 'qc:write', 'calibration:write', 'gq:write'],
};

export function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 hour sessions

  providers: [
    // ── Email + Password ──────────────────────────────────────────────────────
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.password) return null;
        if (!user.active) throw new Error('Account disabled. Contact your administrator.');

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Audit log
        await prisma.auditLog.create({
          data: { action: 'USER_LOGIN', entity: 'User', entityId: user.id, userId: user.id },
        });

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),

    // ── Google SSO ────────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),

    // ── Microsoft / Azure AD ──────────────────────────────────────────────────
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId: process.env.AZURE_AD_TENANT_ID ?? 'common',
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, check if user exists and is active
      if (account?.provider !== 'credentials') {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser && !dbUser.active) return '/unauthorized?reason=disabled';

        // Auto-create user on first OAuth login with READER role
        if (!dbUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'LAB_TECHNICIAN',
            },
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      // Refresh role from DB on each token refresh
      if (token.email && !user) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
          token.active = dbUser.active;
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.active = token.active;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },
};

export default NextAuth(authOptions);
