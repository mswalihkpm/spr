import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function setAdminPassword() {
  const hash = await bcrypt.hash('Madin@2026', 10);
  
  await prisma.user.upsert({
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

  const staffHash = await bcrypt.hash('Madin@2026', 10);
  await prisma.user.upsert({
    where: { email: 'mswalihkpm@gmail.com' },
    update: {
      passwordHash: staffHash,
      mustChangePassword: false,
      status: 'ACTIVE',
      role: 'TEACHER',
    },
    create: {
      email: 'mswalihkpm@gmail.com',
      name: 'M Swalih KPM',
      passwordHash: staffHash,
      role: 'TEACHER',
      mustChangePassword: false,
      status: 'ACTIVE',
    }
  });

  console.log('Credentials updated successfully!');
}

setAdminPassword().finally(() => prisma.$disconnect());
