import { Module } from '@nestjs/common';
import { PassbookModule } from '../passbook/passbook.module';
import { PaymentsModule } from '../payments/payments.module';
import { AuditModule } from '../audit/audit.module';
import { ProfileModule } from '../profile/profile.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PassbookModule, PaymentsModule, AuditModule, ProfileModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
