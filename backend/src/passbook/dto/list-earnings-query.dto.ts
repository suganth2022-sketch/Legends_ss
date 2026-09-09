import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListEarningsQueryDto {
  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({ example: 'A000004', description: 'Filter by the downline member whose payment generated the earning' })
  @IsOptional()
  @IsString()
  sourceMemberCode?: string;

  @ApiPropertyOptional({ example: 2, description: 'Filter by level (2-10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  level?: number;
}
