// app/api/users/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, role, active, newPassword } = body;

  const updateData = {};
  if (name !== undefined)   updateData.name   = name;
  if (role !== undefined)   updateData.role   = role;
  if (active !== undefined) updateData.active = active;
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user.id,
      userId: session.user.id,
      details: { changes: Object.keys(updateData) },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-deletion
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: { action: 'USER_DELETED', entity: 'User', entityId: params.id, userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
