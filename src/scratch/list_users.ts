import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function main() {
  console.log('--- Current Database Users ---');
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | Status: ${u.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
