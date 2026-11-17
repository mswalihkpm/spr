const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE lower(table_name) = 'wallettransaction'
    ORDER BY column_name;
  `);
  console.log('WalletTransaction columns:', cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
