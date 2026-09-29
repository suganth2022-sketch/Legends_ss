import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { ReferralModule } from './referral/referral.module';
import { CommissionModule } from './commission/commission.module';
import { PaymentsModule } from './payments/payments.module';
import { PassbookModule } from './passbook/passbook.module';
import { PayoutsModule } from './payouts/payouts.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { ProfileModule } from './profile/profile.module';

// Fail fast rather than silently falling back to a hardcoded secret if
// these are ever missing (see docs/business-rules.md-adjacent security note
// — this was a previously-flagged bug: 4 files used to have a hardcoded
// JWT secret fallback).
function validateEnv(config: Record<string, unknown>) {
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  if (typeof config.ENCRYPTION_KEY === 'string' && config.ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    MembersModule,
    ReferralModule,
    CommissionModule,
    PaymentsModule,
    PassbookModule,
    PayoutsModule,
    AdminModule,
    AuditModule,
    ProfileModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
