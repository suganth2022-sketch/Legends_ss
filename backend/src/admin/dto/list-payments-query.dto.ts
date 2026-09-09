import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListPaymentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
