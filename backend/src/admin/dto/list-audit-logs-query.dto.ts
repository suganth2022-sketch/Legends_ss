import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ example: 'PAYOUT_REJECTED' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'Payout' })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  toDate?: string;
}
