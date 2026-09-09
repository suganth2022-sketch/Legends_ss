import { ApiProperty } from '@nestjs/swagger';
import { MemberStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMemberStatusDto {
  @ApiProperty({ enum: MemberStatus })
  @IsEnum(MemberStatus)
  status: MemberStatus;
}
