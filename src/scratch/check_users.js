const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:');
  users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
}

checkUsers().catch(console.error).finally(() => prisma.$disconnect());
