export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { useStudentStoreFund } from '@/lib/student-transactions';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'STORE_ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';

    // Fetch only students with qualifying Store funds (totalContributed > 0 or availableFund > 0)
    const qualifyingRecords = await prisma.storeFundRecord.findMany({
      where: {
        totalContributed: { gt: 0 },
        ...(search
          ? {
              student: {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { sprStudentId: { contains: search, mode: 'insensitive' } },
                  { studentId: { contains: search, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            sprStudentId: true,
            studentId: true,
            division: true,
            photoUrl: true,
            class: { select: { name: true } },
          },
        },
      },
      orderBy: {
        student: {
          fullName: 'asc',
        },
      },
    });

    const students = qualifyingRecords.map((r) => ({
      studentId: r.student.id,
      studentName: r.student.fullName,
      sprStudentId: r.student.sprStudentId,
      studentCode: r.student.studentId,
      className: r.student.class?.name || '',
      division: r.student.division,
      photoUrl: r.student.photoUrl,
      totalContributed: Number(r.totalContributed),
      totalUsed: Number(r.totalUsed),
      availableFund: Number(r.availableFund),
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    }));

    // Overall metrics
    const totals = qualifyingRecords.reduce(
      (acc, curr) => {
        acc.totalContributed += Number(curr.totalContributed);
        acc.totalUsed += Number(curr.totalUsed);
        acc.availableFund += Number(curr.availableFund);
        return acc;
      },
      { totalContributed: 0, totalUsed: 0, availableFund: 0 }
    );

    // Recent usages
    const recentUsages = await prisma.storeFundUsage.findMany({
      include: {
        student: { select: { fullName: true, sprStudentId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    const formattedUsages = recentUsages.map((u) => ({
      id: u.id,
      reference: u.reference,
      studentName: u.student.fullName,
      sprStudentId: u.student.sprStudentId,
      amount: Number(u.amount),
      actingAdminEmail: u.actingAdminEmail,
      remarks: u.remarks,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({
      students,
      stats: {
        qualifyingStudentsCount: qualifyingRecords.length,
        ...totals,
      },
      recentUsages: formattedUsages,
    });
  } catch (error: any) {
    console.error('Store dashboard GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve Store Management data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'STORE_ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json();
    const { studentId, amount, remarks } = body;

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const result = await useStudentStoreFund({
      studentId,
      amount: Number(amount),
      actingAdminId: user.id,
      actingAdminEmail: user.email,
      remarks,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ₹${result.amountUsed.toFixed(2)} store usage for ${result.studentName}. Remaining fund: ₹${result.remainingStoreFund.toFixed(2)}.`,
      data: result,
    });
  } catch (error: any) {
    console.error('Store fund usage POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Store fund usage deduction failed.' },
      { status: 400 }
    );
  }
}
