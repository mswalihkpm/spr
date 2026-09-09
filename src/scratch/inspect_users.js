const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectUsers() {
  const users = await prisma.user.findMany();
  console.log('Existing users:', users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })));
}

inspectUsers().catch(console.error).finally(() => prisma.$disconnect());
