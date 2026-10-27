export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { clearStudentCookie } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  clearStudentCookie(response);
  return response;
}
