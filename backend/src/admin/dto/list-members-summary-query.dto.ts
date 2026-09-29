import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListMembersSummaryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Minimum payout balance (total earned minus total paid out)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBalance?: number;

  @ApiPropertyOptional({ description: 'Maximum payout balance (total earned minus total paid out)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBalance?: number;

  @ApiPropertyOptional({ description: 'Matches memberCode or fullName' })
  @IsOptional()
  @IsString()
  search?: string;
}
