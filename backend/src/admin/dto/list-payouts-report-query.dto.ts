import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMode, PayoutStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListPayoutsReportQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @ApiPropertyOptional({ enum: PayoutMode })
  @IsOptional()
  @IsEnum(PayoutMode)
  mode?: PayoutMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
