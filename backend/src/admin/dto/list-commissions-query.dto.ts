import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListCommissionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 2, description: 'Level 2-10' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  level?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
