export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest, AUTH_NO_CACHE_HEADERS } from '@/lib/auth';
import { logAuditAction } from '@/lib/audit';
import { invalidateEngineCache } from '@/lib/spr-engine';
import { invalidatePhotoCache } from '@/lib/avatar-handler';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: AUTH_NO_CACHE_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status')?.toUpperCase() || 'ALL';
    const searchQuery = searchParams.get('search')?.trim() || '';

    const whereClause: any = {};

    if (statusFilter !== 'ALL' && ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    if (searchQuery) {
      whereClause.OR = [
        { reference: { contains: searchQuery, mode: 'insensitive' } },
        { studentIdentifier: { contains: searchQuery, mode: 'insensitive' } },
        { requesterName: { contains: searchQuery, mode: 'insensitive' } },
        { requesterContact: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const [requests, pendingCount, approvedCount, rejectedCount, completedCount, totalCount] = await Promise.all([
      prisma.accountDeletionRequest.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              sprStudentId: true,
              studentId: true,
              status: true,
              class: { select: { id: true, name: true } },
              account: {
                select: {
                  id: true,
                  status: true,
                  isActivated: true,
                  lastLoginAt: true,
                },
              },
            },
          },
          handledBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),
      prisma.accountDeletionRequest.count({ where: { status: 'PENDING' } }),
      prisma.accountDeletionRequest.count({ where: { status: 'APPROVED' } }),
      prisma.accountDeletionRequest.count({ where: { status: 'REJECTED' } }),
      prisma.accountDeletionRequest.count({ where: { status: 'COMPLETED' } }),
      prisma.accountDeletionRequest.count(),
    ]);

    return NextResponse.json(
      {
        requests,
        counts: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          completed: completedCount,
          total: totalCount,
        },
      },
      { headers: AUTH_NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error('Fetch account deletion requests error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve deletion requests.' },
      { status: 500, headers: AUTH_NO_CACHE_HEADERS }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateApiRequest(req, 'ADMIN');
    if (errorResponse) return errorResponse;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: AUTH_NO_CACHE_HEADERS });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400, headers: AUTH_NO_CACHE_HEADERS });
    }

    const { requestId, action, rejectionReason, adminNotes } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required.' }, { status: 400, headers: AUTH_NO_CACHE_HEADERS });
    }

    const existingRequest = await prisma.accountDeletionRequest.findUnique({
      where: { id: requestId },
      include: {
        student: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Deletion request not found.' }, { status: 404, headers: AUTH_NO_CACHE_HEADERS });
    }

    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // ---------------------------------------------------------------------------
    // Action 1: APPROVE REQUEST
    // ---------------------------------------------------------------------------
    if (action === 'APPROVE') {
      const updated = await prisma.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          handledById: user.id,
          handledByName: user.name,
          handledAt: new Date(),
          adminNotes: adminNotes ? String(adminNotes).trim() : existingRequest.adminNotes,
        },
        include: {
          student: true,
          handledBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: 'APPROVE_ACCOUNT_DELETION_REQUEST',
        entity: 'AccountDeletionRequest',
        entityId: existingRequest.id,
        previousValue: { status: existingRequest.status },
        newValue: { status: 'APPROVED', reference: existingRequest.reference },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Request ${existingRequest.reference} approved. It can now be executed according to retention protocols.`,
          request: updated,
        },
        { headers: AUTH_NO_CACHE_HEADERS }
      );
    }

    // ---------------------------------------------------------------------------
    // Action 2: REJECT REQUEST
    // ---------------------------------------------------------------------------
    if (action === 'REJECT') {
      const cleanRejectionReason = String(rejectionReason || '').trim();
      if (!cleanRejectionReason || cleanRejectionReason.length < 3) {
        return NextResponse.json(
          { error: 'A clear reason for rejecting the request is required.' },
          { status: 400, headers: AUTH_NO_CACHE_HEADERS }
        );
      }

      const updated = await prisma.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          rejectionReason: cleanRejectionReason,
          handledById: user.id,
          handledByName: user.name,
          handledAt: new Date(),
          adminNotes: adminNotes ? String(adminNotes).trim() : existingRequest.adminNotes,
        },
        include: {
          student: true,
          handledBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: 'REJECT_ACCOUNT_DELETION_REQUEST',
        entity: 'AccountDeletionRequest',
        entityId: existingRequest.id,
        previousValue: { status: existingRequest.status },
        newValue: {
          status: 'REJECTED',
          reference: existingRequest.reference,
          rejectionReason: cleanRejectionReason,
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Request ${existingRequest.reference} marked as REJECTED with documented reason.`,
          request: updated,
        },
        { headers: AUTH_NO_CACHE_HEADERS }
      );
    }

    // ---------------------------------------------------------------------------
    // Action 3: EXECUTE DELETION & COMPLETE
    // ---------------------------------------------------------------------------
    if (action === 'EXECUTE_AND_COMPLETE') {
      // Find or re-verify student link
      let student = existingRequest.student;
      if (!student && existingRequest.studentIdentifier) {
        student = (await prisma.student.findFirst({
          where: {
            OR: [
              { sprStudentId: { equals: existingRequest.studentIdentifier, mode: 'insensitive' } },
              { studentId: { equals: existingRequest.studentIdentifier, mode: 'insensitive' } },
              { fullName: { equals: existingRequest.studentIdentifier, mode: 'insensitive' } },
            ],
          },
          include: { account: true },
        })) as any;
      }

      const executionLogs: string[] = [];
      const timestamp = new Date().toISOString();

      if (student) {
        // 1. Deactivate student portal account & revoke credentials
        if (student.account) {
          const revokedHash = `REVOKED_DELETED_${crypto.randomBytes(8).toString('hex')}`;
          await prisma.studentAccount.update({
            where: { id: student.account.id },
            data: {
              status: 'DISABLED',
              isActivated: false,
              passwordHash: revokedHash,
              activationCode: null,
              updatedAt: new Date(),
            },
          });
          executionLogs.push('Student portal login disabled and password hash permanently revoked.');
        } else {
          executionLogs.push('No active StudentAccount credential was registered.');
        }

        // 2. Scrub non-statutory personal identifiers & photo
        const hadPhoto = Boolean(student.photoUrl);
        await prisma.student.update({
          where: { id: student.id },
          data: {
            photoUrl: null,
            notes: `Personal profile scrubbed on ${timestamp} pursuant to verified deletion request ${existingRequest.reference}.`,
            status: 'INACTIVE',
          },
        });
        executionLogs.push(
          `Student marked INACTIVE; ${hadPhoto ? 'Profile photo unlinked and purged; ' : ''}personal notes scrubbed.`
        );

        // 3. Clear avatar caches and calculation caches
        invalidatePhotoCache(student.id);
        invalidateEngineCache();

        // 4. Record statutory academic retention statement
        executionLogs.push(
          'STATUTORY RETENTION: Official historical academic marks, exam scores, and term transcripts retained in institutional archives in accordance with state education regulations and school accreditation standards.'
        );
      } else {
        executionLogs.push(
          'Administrative review verified that no active student database record is currently linked to the provided identifier.'
        );
      }

      const executionSummary = executionLogs.join(' | ');

      const updated = await prisma.accountDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          handledById: user.id,
          handledByName: user.name,
          handledAt: existingRequest.handledAt || new Date(),
          executionSummary,
          adminNotes: adminNotes ? String(adminNotes).trim() : existingRequest.adminNotes,
          matchedStudentId: student ? student.id : existingRequest.matchedStudentId,
        },
        include: {
          student: true,
          handledBy: { select: { id: true, name: true, email: true } },
        },
      });

      await logAuditAction({
        userId: user.id,
        userName: user.name,
        action: 'EXECUTE_AND_COMPLETE_ACCOUNT_DELETION',
        entity: 'AccountDeletionRequest',
        entityId: existingRequest.id,
        previousValue: { status: existingRequest.status },
        newValue: {
          status: 'COMPLETED',
          reference: existingRequest.reference,
          executionSummary,
          studentId: student?.id || null,
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Request ${existingRequest.reference} executed and marked COMPLETED. Relevant credentials deactivated and statutory records preserved.`,
          request: updated,
          executionSummary,
        },
        { headers: AUTH_NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400, headers: AUTH_NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error('Account deletion request action error:', error);
    return NextResponse.json(
      { error: error.message || 'Operation failed due to an error.' },
      { status: 500, headers: AUTH_NO_CACHE_HEADERS }
    );
  }
}

