export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { resolveStudentAndWallet } from '@/lib/qr-service';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Role-Based Access Control: only Store Admin, Admin, or Super Admin
    const { user, errorResponse } = await authenticateApiRequest(req, 'STORE_ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json();
    const { qrToken, sprStudentId } = body;

    if (!qrToken && !sprStudentId) {
      return NextResponse.json(
        { error: 'Please provide either a scanned QR code or a manual SPR ID.' },
        { status: 400 }
      );
    }

    // 3. Authoritatively resolve student profile and digital wallet
    const result = await resolveStudentAndWallet({
      qrToken: qrToken ? String(qrToken).trim() : undefined,
      sprStudentId: sprStudentId ? String(sprStudentId).trim() : undefined,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error, isRevoked: Boolean((result as any).isRevoked) },
        { status: result.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      student: result.student,
      wallet: result.wallet,
      transactions: result.transactions,
      scannedBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error in QR scan endpoint:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the QR scan.' },
      { status: 500 }
    );
  }
}
