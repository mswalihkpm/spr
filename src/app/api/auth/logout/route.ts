export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, authenticateApiRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { user } = await authenticateApiRequest(req);
    if (user) {
      // Optional: Delete user sessions
      const token = req.cookies.get('spr_auth_token')?.value;
      if (token) {
        await prisma.session.deleteMany({
          where: { token },
        });
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true });
    clearAuthCookie(response);
    return response;
  }
}
