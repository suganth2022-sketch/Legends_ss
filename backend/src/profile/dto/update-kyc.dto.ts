import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class UpdateKycDto {
  @ApiPropertyOptional({ example: '234567890123', description: '12-digit Aadhaar number' })
  @IsOptional()
  @Matches(/^\d{12}$/, { message: 'aadhaarNumber must be exactly 12 digits' })
  aadhaarNumber?: string;

  @ApiPropertyOptional({ example: 'ABCDE1234F', description: 'PAN (AAAAA9999A format)' })
  @IsOptional()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/, { message: 'pan must match AAAAA9999A format' })
  pan?: string;
}
