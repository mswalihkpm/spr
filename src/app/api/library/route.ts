export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'VIEWER');
    if (errorResponse) return errorResponse;

    let integration = await prisma.libraryIntegration.findFirst();
    if (!integration) {
      integration = await prisma.libraryIntegration.create({
        data: {
          endpointUrl: 'https://msoelibrary.vercel.app/',
          isConnected: true,
          syncStatus: 'CONNECTED',
        },
      });
    }

    const records = await prisma.libraryRecord.findMany({
      include: {
        student: {
          include: {
            class: true,
            school: true,
          },
        },
      },
      orderBy: { booksRead: 'desc' },
    });

    return NextResponse.json({
      integration: {
        id: integration.id,
        endpointUrl: integration.endpointUrl,
        isConnected: integration.isConnected,
        lastSyncAt: integration.lastSyncAt,
        syncStatus: integration.syncStatus,
        syncError: integration.syncError,
        autoSync: integration.autoSync,
      },
      records,
    });
  } catch (error: any) {
    console.error('Library fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch library integration data.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { action, endpointUrl, apiKey, records, readingPeriod } = body;

    if (action === 'UPDATE_CONFIG') {
      const integration = await prisma.libraryIntegration.findFirst();
      if (integration) {
        await prisma.libraryIntegration.update({
          where: { id: integration.id },
          data: {
            endpointUrl: endpointUrl || integration.endpointUrl,
            apiKey: apiKey !== undefined ? apiKey : integration.apiKey,
            syncStatus: 'CONNECTED',
            lastSyncAt: new Date(),
          },
        });
      }

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'UPDATE',
        entity: 'LibraryIntegration',
        newValue: { endpointUrl, apiKeySet: !!apiKey },
      });

      return NextResponse.json({ success: true, message: 'Library configuration saved.' });
    }

    if (action === 'IMPORT_RECORDS') {
      if (!records || !Array.isArray(records)) {
        return NextResponse.json({ error: 'No records provided for import.' }, { status: 400 });
      }

      const period = readingPeriod || 'Term 1 2026';
      let importedCount = 0;

      for (const item of records) {
        if (!item.studentId) continue;

        // Find or match student
        const student = await prisma.student.findFirst({
          where: {
            OR: [
              { id: item.studentId },
              { studentId: item.studentId },
              { fullName: { contains: item.studentName || item.studentId, mode: 'insensitive' } },
            ],
          },
        });

        if (student) {
          const books = Number(item.booksRead) || 0;
          const score = Number(item.readingScore) || Math.min(books * 8, 100);

          await prisma.libraryRecord.create({
            data: {
              studentId: student.id,
              booksRead: books,
              readingScore: score,
              readingRank: item.readingRank ? Number(item.readingRank) : null,
              readingPeriod: period,
            },
          });
          importedCount++;
        }
      }

      // Update last sync timestamp
      const integration = await prisma.libraryIntegration.findFirst();
      if (integration) {
        await prisma.libraryIntegration.update({
          where: { id: integration.id },
          data: { lastSyncAt: new Date(), syncStatus: 'CONNECTED' },
        });
      }

      await logAuditAction({
        userId: user?.id,
        userName: user?.name,
        action: 'SYNC',
        entity: 'LibraryRecord',
        newValue: { importedCount, period },
      });

      invalidateEngineCache();

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${importedCount} reading records.`,
      });
    }

    return NextResponse.json({ error: 'Invalid library action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Library integration error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process library action.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // url param fallback
    }

    const ids: string[] = body.ids || (id ? [id] : []);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No record IDs provided for deletion.' }, { status: 400 });
    }

    const deleteResult = await prisma.libraryRecord.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    await logAuditAction({
      userId: user?.id,
      userName: user?.name,
      action: 'DELETE',
      entity: 'LibraryRecord',
      previousValue: { deletedCount: deleteResult.count, ids },
    });

    invalidateEngineCache();

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} library record(s).`,
      deletedCount: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Library delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete library record(s).' }, { status: 500 });
  }
}

