import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { AUDITED_KEY, AuditedMetadata } from './audited.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditedMetadata | undefined>(
      AUDITED_KEY,
      context.getHandler(),
    );

    if (!metadata) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget: a logging failure must never break the actual
        // response the caller is waiting on.
        this.prisma.auditLog
          .create({
            data: {
              actorType: req.user?.userType ?? 'SYSTEM',
              actorId: req.user?.id ?? 'unknown',
              action: metadata.action,
              entityName: metadata.entityName,
              entityId: req.params?.id ?? 'unknown',
              ipAddress: req.ip ?? null,
            },
          })
          .catch((err) => {
            console.error('AuditInterceptor: failed to write audit log', err);
          });
      }),
    );
  }
}
