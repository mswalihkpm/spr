const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const luqman = await prisma.student.findFirst({
    where: { fullName: { contains: 'Luqman', mode: 'insensitive' } },
    include: { wallet: true },
  });

  console.log('Luqman FullName:', luqman?.fullName);
  console.log('Student ID:', luqman?.id);
  console.log('Student SPR ID:', luqman?.sprStudentId);
  console.log('Wallet Balance:', luqman?.wallet?.balance);
  console.log('Wallet Total Earned:', luqman?.wallet?.totalEarned);

  if (luqman?.id) {
    const transactions = await prisma.walletTransaction.findMany({
      where: { studentId: luqman.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Transactions Count:', transactions.length);
    console.log('Recent Transactions:', JSON.stringify(transactions, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
