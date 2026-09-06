import { prisma } from './prisma';

export async function logAuditAction(params: {
  userId?: string | null;
  userName?: string | null;
  action: string; // CREATE, UPDATE, DELETE, IMPORT, LOGIN, PASSWORD_CHANGE, SYNC
  entity: string;
  entityId?: string | null;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
