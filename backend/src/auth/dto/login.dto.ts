import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class MemberLoginDto {
  @ApiProperty({
    example: 'A000001',
    description: 'Member Code (e.g. A000001), Email, or Phone Number',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'MemberPassword2026!', description: 'Account Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin', description: 'Admin Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'AdminPassword2026!', description: 'Admin Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
