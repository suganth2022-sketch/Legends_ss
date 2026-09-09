import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMode, PayoutStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class ListPayoutsQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({ enum: PayoutMode })
  @IsOptional()
  @IsEnum(PayoutMode)
  mode?: PayoutMode;

  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}
