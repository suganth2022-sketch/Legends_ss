import { ApiPropertyOptional } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListMembersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Matches fullName, email, or memberCode (case-insensitive contains)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
