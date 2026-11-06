export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/lib/audit';
import crypto from 'crypto';

// In-memory sliding window rate limiter: max 5 requests per 15 minutes per IP
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count += 1;
  return true;
}

// Mask sensitive contact details for logs
function maskContact(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.includes('@')) {
    const [local, domain] = trimmed.split('@');
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : '***';
    return `${maskedLocal}@${domain}`;
  }
  if (trimmed.length > 4) {
    return `***${trimmed.slice(-4)}`;
  }
  return '***';
}

export async function POST(req: NextRequest) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // 1. Rate limiting check
    if (!checkRateLimit(ipAddress)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes before submitting another deletion request.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    const {
      studentIdentifier,
      requesterType,
      requesterName,
      requesterContact,
      relationship,
      requestType,
      reason,
      parentalConsent,
      website, // Honeypot field
    } = body;

    // 2. Honeypot check (anti-spam bot trap)
    if (website && String(website).trim().length > 0) {
      // Silently accept without doing anything to mislead spambots
      return NextResponse.json({
        success: true,
        reference: `DEL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        message: 'Your deletion request has been registered.',
      });
    }

    // 3. Input validation
    const cleanStudentIdentifier = String(studentIdentifier || '').trim();
    const cleanRequesterName = String(requesterName || '').trim();
    const cleanRequesterContact = String(requesterContact || '').trim();
    const cleanRequesterType = String(requesterType || 'STUDENT').trim().toUpperCase();
    const cleanRequestType = String(requestType || 'ACCOUNT_DELETION').trim().toUpperCase();
    const cleanRelationship = relationship ? String(relationship).trim().slice(0, 100) : null;
    const cleanReason = reason ? String(reason).trim().slice(0, 1500) : null;

    if (!cleanStudentIdentifier || cleanStudentIdentifier.length < 2) {
      return NextResponse.json(
        { error: 'Student username, SPR ID, Student ID, or Full Name is required.' },
        { status: 400 }
      );
    }

    if (!cleanRequesterName || cleanRequesterName.length < 2) {
      return NextResponse.json({ error: 'Requester full name is required.' }, { status: 400 });
    }

    if (!cleanRequesterContact || cleanRequesterContact.length < 5) {
      return NextResponse.json(
        { error: 'A valid email address or telephone number is required for verification.' },
        { status: 400 }
      );
    }

    const validRequesterTypes = ['STUDENT', 'PARENT_GUARDIAN'];
    if (!validRequesterTypes.includes(cleanRequesterType)) {
      return NextResponse.json({ error: 'Invalid requester type.' }, { status: 400 });
    }

    const validRequestTypes = ['ACCOUNT_DELETION', 'FULL_DELETION'];
    if (!validRequestTypes.includes(cleanRequestType)) {
      return NextResponse.json({ error: 'Invalid deletion request type.' }, { status: 400 });
    }

    if (!parentalConsent) {
      return NextResponse.json(
        { error: 'You must confirm parental/guardian consent or identity verification acknowledgement.' },
        { status: 400 }
      );
    }

    // 4. Student record lookup (safe cross-reference without disclosing findings to the public)
    const matchedStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { sprStudentId: { equals: cleanStudentIdentifier, mode: 'insensitive' } },
          { studentId: { equals: cleanStudentIdentifier, mode: 'insensitive' } },
          { fullName: { equals: cleanStudentIdentifier, mode: 'insensitive' } },
        ],
      },
      select: { id: true, fullName: true, sprStudentId: true, studentId: true },
    });

    // 5. Generate unique reference tracking code
    let reference = '';
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      reference = `DEL-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const existing = await prisma.accountDeletionRequest.findUnique({
        where: { reference },
        select: { id: true },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    // 6. Create AccountDeletionRequest record
    const record = await prisma.accountDeletionRequest.create({
      data: {
        reference,
        studentIdentifier: cleanStudentIdentifier,
        matchedStudentId: matchedStudent?.id || null,
        requesterType: cleanRequesterType,
        requesterName: cleanRequesterName,
        requesterContact: cleanRequesterContact,
        relationship: cleanRelationship,
        requestType: cleanRequestType,
        reason: cleanReason,
        parentalConsent: Boolean(parentalConsent),
        status: 'PENDING',
        ipAddress,
        userAgent,
      },
    });

    // 7. Audit log (never log full plain text PII)
    await logAuditAction({
      action: 'PUBLIC_ACCOUNT_DELETION_REQUESTED',
      entity: 'AccountDeletionRequest',
      entityId: record.id,
      userName: `Public: ${cleanRequesterName} (${cleanRequesterType})`,
      newValue: {
        reference,
        requesterType: cleanRequesterType,
        requestType: cleanRequestType,
        maskedContact: maskContact(cleanRequesterContact),
        hasMatchedStudent: Boolean(matchedStudent),
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      reference,
      submittedAt: record.createdAt.toISOString(),
      message:
        'Your account and data deletion request has been submitted successfully. An administrator will verify the request within 7 business days.',
    });
  } catch (error: any) {
    console.error('Account deletion request submission error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request. Please try again later.' },
      { status: 500 }
    );
  }
}

