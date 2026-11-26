export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/auth';
import { fetchIdCardRecords } from '@/lib/id-card-data';
import { generateBulkIdCardsA4Pdf } from '@/lib/id-card-pdf-generator';

interface BulkIdCardsPdfRequestBody {
  studentIds?: string[];
  classId?: string;
  sortBy?: string;
  academicYear?: string;
  batchLabel?: string;
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await authenticateApiRequest(req, 'TEACHER');
  if (errorResponse || !user) return errorResponse;

  try {
    const body = (await req.json().catch(() => ({}))) as BulkIdCardsPdfRequestBody;
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds : undefined;
    const classId = typeof body.classId === 'string' ? body.classId : '';
    const sortBy = typeof body.sortBy === 'string' ? body.sortBy : 'CLASS_THEN_NAME';
    const academicYear =
      typeof body.academicYear === 'string' && body.academicYear.trim()
        ? body.academicYear.trim()
        : '2026-27';

    const { cards, classes } = await fetchIdCardRecords({
      studentIds,
      classId,
      sortBy,
      includeQrDataUrl: false, // PDF generator emits true vector QR matrices directly
      includeClasses: Boolean(classId && classId !== 'ALL'),
      academicYearOverride: academicYear,
    });

    if (!cards || cards.length === 0) {
      return NextResponse.json(
        { error: 'No matching students found to generate ID cards.' },
        { status: 404 }
      );
    }

    const matchedClass =
      classId && classId !== 'ALL'
        ? classes.find((c) => c.id === classId)?.name
        : undefined;

    const batchLabel =
      body.batchLabel ||
      (studentIds && studentIds.length > 0
        ? `SELECTED (${cards.length})`
        : matchedClass || 'ALL CLASSES');

    const { pdfBytes, pageCount, studentCount } = await generateBulkIdCardsA4Pdf(
      cards,
      {
        academicYear,
        batchLabel,
        showCutGuides: true,
      }
    );

    const dateTag = new Date().toISOString().slice(0, 10);
    const filename = `SPR_Bulk_ID_Cards_A4_${studentCount}_Students_${dateTag}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Total-Students': String(studentCount),
        'X-Total-Pages': String(pageCount),
      },
    });
  } catch (err: any) {
    console.error('Error generating bulk A4 ID card PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate bulk A4 ID card PDF.' },
      { status: 500 }
    );
  }
}
