import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { UserRole, UserSession } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'madin_school_of_excellence_spr_super_secure_jwt_secret_key_2026';
const AUTH_COOKIE_NAME = 'spr_auth_token';

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: UserSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const userId = payload.id || (payload as any).userId;
    if (!userId) return null;

    // Verify user is active in DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, mustChangePassword: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      mustChangePassword: user.mustChangePassword,
    };
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  if (userRole === 'SUPER_ADMIN') return true;
  if (userRole === 'ADMIN') {
    return requiredRole !== 'SUPER_ADMIN';
  }
  if (userRole === 'CREATIVE_HUB_ADMIN') {
    return requiredRole === 'CREATIVE_HUB_ADMIN' || requiredRole === 'VIEWER';
  }
  if (userRole === 'KUTHBKHANA_ADMIN') {
    return requiredRole === 'KUTHBKHANA_ADMIN' || requiredRole === 'VIEWER';
  }
  if (userRole === 'TEACHER') {
    return requiredRole === 'TEACHER' || requiredRole === 'VIEWER';
  }
  if (userRole === 'VIEWER') {
    return requiredRole === 'VIEWER';
  }
  return false;
}

export async function authenticateApiRequest(req: NextRequest, minRole: UserRole = 'VIEWER'): Promise<{ user: UserSession | null; errorResponse?: NextResponse }> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value || req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }),
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Session expired or invalid token.' }, { status: 401 }),
    };
  }

  const userId = payload.id || (payload as any).userId;
  if (!userId) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Session token missing valid user identifier.' }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, mustChangePassword: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Account inactive or unauthorized.' }, { status: 403 }),
    };
  }

  const session: UserSession = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    mustChangePassword: user.mustChangePassword,
  };

  if (!hasPermission(session.role, minRole)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Insufficient permissions for this operation.' }, { status: 403 }),
    };
  }

  return { user: session };
}
