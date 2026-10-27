import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createBackup() {
  console.log('=== STARTING PRE-STUDENT-ACCOUNTS SAFETY BACKUP ===');
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const [
    users,
    students,
    categories,
    categoryWeights,
    levels,
    performanceRecordsCount,
    creativeWorksCount,
    settings,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.student.findMany(),
    prisma.category.findMany(),
    prisma.categoryWeight.findMany(),
    prisma.level.findMany(),
    prisma.performanceRecord.count(),
    prisma.creativeHubSubmission.count(),
    prisma.systemSetting.findMany(),
  ]);

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      purpose: 'Safety backup before Student Accounts, Wallet, and Store Management release migration',
      usersCount: users.length,
      studentsCount: students.length,
      performanceRecordsCount,
      creativeWorksCount,
    },
    users: users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status })),
    students,
    categories,
    categoryWeights,
    levels,
    settings,
  };

  const backupFilePath = path.join(backupsDir, `pre_student_accounts_backup_${timestampStr}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`Successfully written safety backup to: ${backupFilePath}`);
}

createBackup().finally(() => prisma.$disconnect());
