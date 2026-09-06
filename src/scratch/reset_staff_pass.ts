import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function resetStaffPassword() {
  const passwordHash = await hashPassword('Madin@2026');
  await prisma.user.update({
    where: { email: 'mswalihkpm@gmail.com' },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });
  console.log('✅ Staff password reset to "Madin@2026" for mswalihkpm@gmail.com');
}

resetStaffPassword().catch(console.error).finally(() => prisma.$disconnect());
