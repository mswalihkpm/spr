import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Provisioning Accounts in Live DB ---');

  // 1. excellence@madin.edu.in (pass: 7412369)
  const pass1 = await bcrypt.hash('7412369', 10);
  const u1 = await prisma.user.upsert({
    where: { email: 'excellence@madin.edu.in' },
    update: {
      name: 'Super Administrator (Excellence)',
      passwordHash: pass1,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'excellence@madin.edu.in',
      name: 'Super Administrator (Excellence)',
      passwordHash: pass1,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('Provisioned 1:', u1.email, 'Role:', u1.role);

  // 2. mswalihkpm@gmail.com (pass: 9632147)
  const pass2 = await bcrypt.hash('9632147', 10);
  const u2 = await prisma.user.upsert({
    where: { email: 'mswalihkpm@gmail.com' },
    update: {
      name: 'Super Administrator (Swalih KPM)',
      passwordHash: pass2,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'mswalihkpm@gmail.com',
      name: 'Super Administrator (Swalih KPM)',
      passwordHash: pass2,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('Provisioned 2:', u2.email, 'Role:', u2.role);

  // 3. creativehub@gmail.com (pass: 00074123)
  const pass3 = await bcrypt.hash('00074123', 10);
  const u3 = await prisma.user.upsert({
    where: { email: 'creativehub@gmail.com' },
    update: {
      name: 'Creative Hub Admin',
      passwordHash: pass3,
      role: 'CREATIVE_HUB_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'creativehub@gmail.com',
      name: 'Creative Hub Admin',
      passwordHash: pass3,
      role: 'CREATIVE_HUB_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });
  console.log('Provisioned 3:', u3.email, 'Role:', u3.role);

  // Verification
  console.log('\n--- Verifying Logins ---');
  const check1 = await bcrypt.compare('7412369', u1.passwordHash);
  console.log('excellence@madin.edu.in (pass 7412369) verify:', check1);

  const check2 = await bcrypt.compare('9632147', u2.passwordHash);
  console.log('mswalihkpm@gmail.com (pass 9632147) verify:', check2);

  const check3 = await bcrypt.compare('00074123', u3.passwordHash);
  console.log('creativehub@gmail.com (pass 00074123) verify:', check3);

  console.log('\n--- All Users in Database ---');
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, status: true, mustChangePassword: true }
  });
  console.table(allUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
