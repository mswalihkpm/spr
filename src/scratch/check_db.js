const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { email: 'kithab@gmail.com' } });
  console.log('User:', u?.email, 'Role:', u?.role);
  if (u) {
    const ok = await bcrypt.compare('ktb123456', u.passwordHash);
    console.log('Password match:', ok);
  }
  const subs = await prisma.subcategory.findMany({
    include: { category: true }
  });
  console.log('Subcategories:');
  subs.forEach(s => console.log(' -', s.id, ':', s.name, '(', s.category?.code, ')'));
}

main().then(() => prisma.$disconnect());