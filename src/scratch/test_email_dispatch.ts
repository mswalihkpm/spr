import { sendPasswordResetVerificationEmail } from '../lib/email';
import { prisma } from '../lib/prisma';

async function testEmailAndResetFlow() {
  console.log('Testing Email dispatch & OTP system...');

  const emailResult = await sendPasswordResetVerificationEmail({
    toEmail: 'mswalihkpm@gmail.com',
    userName: 'M Swalih KPM',
    verificationCode: '849201',
    expiresInMinutes: 10,
  });

  console.log('Email Result:', emailResult);

  // Check user in DB
  const user = await prisma.user.findUnique({
    where: { email: 'mswalihkpm@gmail.com' },
  });

  console.log('User found in DB:', user ? { email: user.email, name: user.name, role: user.role } : 'NOT FOUND');
}

testEmailAndResetFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
