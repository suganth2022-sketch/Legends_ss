import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateNomineeDto {
  @ApiPropertyOptional({ example: 'Sunita Patel' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Spouse' })
  @IsOptional()
  @IsString()
  relationship?: string;

  @ApiPropertyOptional({ example: '+91 90000 00201' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'sunita.p@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
