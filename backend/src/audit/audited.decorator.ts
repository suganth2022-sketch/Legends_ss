import { SetMetadata } from '@nestjs/common';

export const AUDITED_KEY = 'audited';

export interface AuditedMetadata {
  action: string;
  entityName: string;
}

// Marks a route as a sensitive read that must be logged to audit_logs even
// though nothing is being written. Pair with @UseInterceptors(AuditInterceptor).
export const Audited = (action: string, entityName: string) =>
  SetMetadata(AUDITED_KEY, { action, entityName } as AuditedMetadata);
