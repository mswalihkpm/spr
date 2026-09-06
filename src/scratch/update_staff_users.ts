import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';

async function updateUsers() {
  console.log('--- Updating Users as Requested ---');

  // 1. Delete admin@madin.edu.in & usthad.ahmed@madin.edu.in
  const emailsToDelete = ['admin@madin.edu.in', 'usthad.ahmed@madin.edu.in'];

  for (const email of emailsToDelete) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      console.log(`Found user to delete: ${user.name} (${user.email})`);
      
      // Delete sessions
      await prisma.session.deleteMany({ where: { userId: user.id } });
      // Delete password reset tokens
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      // Delete audit logs or update
      await prisma.auditLog.deleteMany({ where: { userId: user.id } });
      
      // Delete user
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`✅ Deleted user: ${email}`);
    } else {
      console.log(`User ${email} not found.`);
    }
  }

  // 2. Add mswalihkpm@gmail.com as Staff (TEACHER role)
  const staffEmail = 'mswalihkpm@gmail.com';
  const existingStaff = await prisma.user.findUnique({ where: { email: staffEmail } });

  const defaultPassword = 'Madin@2026';
  const passwordHash = await hashPassword(defaultPassword);

  if (existingStaff) {
    const updated = await prisma.user.update({
      where: { email: staffEmail },
      data: {
        name: 'M Swalih KPM',
        role: 'TEACHER',
        status: 'ACTIVE',
        passwordHash,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Updated staff user: ${updated.email} (${updated.name}) with role: ${updated.role}`);
  } else {
    const created = await prisma.user.create({
      data: {
        email: staffEmail,
        name: 'M Swalih KPM',
        role: 'TEACHER',
        status: 'ACTIVE',
        passwordHash,
        mustChangePassword: false,
      },
    });
    console.log(`✅ Created staff user: ${created.email} (${created.name}) with role: ${created.role}`);
  }

  console.log('\n--- Current Users in Database After Update ---');
  const allUsers = await prisma.user.findMany();
  for (const u of allUsers) {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.name} | Role: ${u.role} | Status: ${u.status}`);
  }
}

updateUsers().catch(console.error).finally(() => prisma.$disconnect());
