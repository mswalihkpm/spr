export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { handleStudentPhotoRequest } from '@/lib/avatar-handler';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return handleStudentPhotoRequest(req, params.id);
}
