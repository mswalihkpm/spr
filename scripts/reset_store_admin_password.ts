import { prisma } from '../src/lib/prisma';
import { hashPassword, verifyPassword } from '../src/lib/auth';

async function main() {
  const email = 'storemhs@gmail.com';
  const plainPassword = 'Store@Madin2026!';
  const newHash = await hashPassword(plainPassword);

  const updated = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: newHash,
      role: 'STORE_ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email,
      name: 'Store Administrator',
      role: 'STORE_ADMIN',
      passwordHash: newHash,
      mustChangePassword: false,
      status: 'ACTIVE',
    },
  });

  const valid = await verifyPassword(plainPassword, updated.passwordHash);
  console.log(`Store Admin (${email}) password is set to: "${plainPassword}". Verified: ${valid}`);
}

main().finally(() => prisma.$disconnect());
