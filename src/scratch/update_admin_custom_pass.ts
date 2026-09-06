import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function updateAdminPassword() {
  const hash = await bcrypt.hash('7412369', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'excellence@madin.edu.in' },
    update: {
      passwordHash: hash,
      mustChangePassword: false,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'excellence@madin.edu.in',
      name: 'Super Administrator',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      status: 'ACTIVE',
    }
  });

  // Clear previous sessions for security
  await prisma.session.deleteMany({ where: { userId: admin.id } });

  console.log('Admin password updated successfully for:', admin.email);

  const isMatch = await bcrypt.compare('7412369', admin.passwordHash);
  console.log('Password verification test:', isMatch ? 'SUCCESS' : 'FAILED');
}

updateAdminPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
