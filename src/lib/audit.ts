export async function logAuditAction(_params: {
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
  // Audit logging has been removed per user preference; no database writes performed.
  return;
}

