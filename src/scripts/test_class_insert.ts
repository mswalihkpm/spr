import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parseCSV } from './validate_csv_exports';

const prisma = new PrismaClient();

async function testInsert() {
  const csvDir = path.join(process.cwd(), 'backups', 'csv');
  const rows = parseCSV(fs.readFileSync(path.join(csvDir, 'AcademicClass.csv'), 'utf-8'));
  
  for (const item of rows) {
    try {
      console.log('Inserting item:', item);
      const res = await prisma.academicClass.upsert({
        where: { id: item.id },
        update: { name: item.name, numericGrade: item.numericGrade, active: item.active },
        create: {
          id: item.id,
          name: item.name,
          numericGrade: item.numericGrade,
          active: item.active,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        },
      });
      console.log('Success:', res);
    } catch (e: any) {
      console.error('Error on', item.name, e);
    }
  }
}

testInsert().catch(console.error).finally(() => prisma.$disconnect());
