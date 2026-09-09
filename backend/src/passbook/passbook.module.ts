import { Module } from '@nestjs/common';
import { PassbookController } from './passbook.controller';
import { PassbookService } from './passbook.service';

@Module({
  controllers: [PassbookController],
  providers: [PassbookService],
  exports: [PassbookService],
})
export class PassbookModule {}
