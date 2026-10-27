import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';

async function ensureStoreAdmin() {
  const email = 'storemhs@gmail.com';
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.role !== 'STORE_ADMIN') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'STORE_ADMIN' },
      });
      console.log(`Updated existing user ${email} to role STORE_ADMIN.`);
    } else {
      console.log(`User ${email} already exists with role STORE_ADMIN.`);
    }
    return;
  }

  // Create initial Store Admin account
  // Initial temporary password can be read from env STORE_ADMIN_INITIAL_PASSWORD or default secure initial PIN
  const initialPassword = process.env.STORE_ADMIN_INITIAL_PASSWORD || 'Store@Madin2026!';
  const passwordHash = await hashPassword(initialPassword);

  const newUser = await prisma.user.create({
    data: {
      email,
      name: 'Store Administrator',
      role: 'STORE_ADMIN',
      passwordHash,
      mustChangePassword: true,
      status: 'ACTIVE',
    },
  });

  console.log(`Successfully created Store Admin account (${newUser.email}) with role STORE_ADMIN.`);
}

ensureStoreAdmin().finally(() => prisma.$disconnect());
