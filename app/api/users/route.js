// app/api/users/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      active: true, lastLoginAt: true, createdAt: true,
      image: true, password: true,
      _count: { select: { auditLogs: true } },
    },
  });

  // Mask whether password exists without exposing hash
  return NextResponse.json(users.map(u => ({ ...u, hasPassword: !!u.password, password: undefined })));
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password and role are required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), password: hashed, role, active: true },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      userId: session.user.id,
      details: { createdEmail: email, role },
    },
  });

  return NextResponse.json(user, { status: 201 });
}
