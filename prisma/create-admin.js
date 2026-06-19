// prisma/create-admin.js — creates/updates an ADMIN user: admin@admin.com / admin
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@admin.com';
  const password = 'admin';
  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: 'ADMIN', active: true, name: 'Admin' },
    create: { name: 'Admin', email, password: hash, role: 'ADMIN', active: true },
  });

  console.log('✅ Admin user ready:');
  console.log('   Email:    ', user.email);
  console.log('   Password: ', password);
  console.log('   Role:     ', user.role);
  console.log('   Active:   ', user.active);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
