export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({ user });
}
