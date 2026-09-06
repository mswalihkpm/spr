export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Public password reset is disabled. Password changes and resets are managed strictly by the system administrator under Admin Settings.',
    },
    { status: 403 }
  );
}
