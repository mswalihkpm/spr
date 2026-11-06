/**
 * Audit Logging Module
 *
 * NOTE: Persistent database audit logging was permanently removed to prevent
 * massive JSON storage bloat and Supabase storage quota exhaustion (which reached 20MB).
 * This no-op implementation preserves type signatures so existing callers across the
 * codebase continue to execute cleanly with zero database overhead.
 */

export interface AuditActionParams {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditAction(_params: AuditActionParams): Promise<void> {
  // Permanently disabled: no-op to eliminate database writes and storage bloat
  return;
}
