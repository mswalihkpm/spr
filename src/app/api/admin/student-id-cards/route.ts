export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { fetchIdCardRecords } from '@/lib/id-card-data';

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  const url = new URL(req.url);
  const classId = url.searchParams.get('classId') || '';
  const sortBy = url.searchParams.get('sortBy') || 'CLASS_THEN_NAME'; // CLASS_THEN_NAME | CLASS_THEN_SPR | NAME_ASC | SPR_ASC
  const studentIdsParam = url.searchParams.get('studentIds') || '';
  const studentIds = studentIdsParam
    ? studentIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  try {
    const result = await fetchIdCardRecords({
      classId,
      sortBy,
      studentIds,
      includeQrDataUrl: true,
      includeClasses: true,
    });

    return NextResponse.json({
      success: true,
      count: result.cards.length,
      cards: result.cards,
      classes: result.classes,
      sortBy: result.sortBy,
      generatedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });
  } catch (err: any) {
    console.error('Error fetching bulk student ID cards:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch student ID cards in bulk.' },
      { status: 500 }
    );
  }
}
