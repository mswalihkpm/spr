import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function listUsers() {
  const users = await prisma.user.findMany();
  console.log('--- ALL USERS IN DB ---');
  for (const u of users) {
    const is159159 = await bcrypt.compare('159159', u.passwordHash);
    const isMadin2026 = await bcrypt.compare('Madin@2026', u.passwordHash);
    const is7412369 = await bcrypt.compare('7412369', u.passwordHash);
    
    let matchedPass = 'Unknown custom password';
    if (is159159) matchedPass = '159159';
    else if (isMadin2026) matchedPass = 'Madin@2026';
    else if (is7412369) matchedPass = '7412369';

    console.log(`- Email: ${u.email}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Status: ${u.status}`);
    console.log(`  Password Match: ${matchedPass}`);
    console.log(`  Must Change Password: ${u.mustChangePassword}`);
    console.log('------------------------');
  }
}

listUsers().finally(() => prisma.$disconnect());
