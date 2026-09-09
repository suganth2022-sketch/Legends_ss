import { Module } from '@nestjs/common';
import { ReferralModule } from '../referral/referral.module';
import { AuditModule } from '../audit/audit.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [ReferralModule, AuditModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
