import { prisma } from './prisma';

export async function logAuditAction(params: {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    // Sanitize any sensitive fields (passwords, hashes, tokens, secrets)
    const sanitize = (val: any) => {
      if (!val) return null;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (typeof parsed === 'object' && parsed !== null) {
            for (const k of Object.keys(parsed)) {
              if (/password|hash|token|secret/i.test(k)) {
                parsed[k] = '[REDACTED]';
              }
            }
            return JSON.stringify(parsed);
          }
        } catch {
          // not json string
        }
        return val;
      }
      const clone = { ...val };
      for (const k of Object.keys(clone)) {
        if (/password|hash|token|secret/i.test(k)) {
          clone[k] = '[REDACTED]';
        }
      }
      return JSON.stringify(clone);
    };

    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        previousValue: sanitize(params.previousValue),
        newValue: sanitize(params.newValue),
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    console.warn('AuditLog record warning:', err);
  }
}

