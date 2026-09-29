import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateBankDto {
  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'Jubilee Hills' })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({ example: '50100234567819' })
  @IsOptional()
  @Matches(/^\d{6,20}$/, { message: 'accountNumber must be 6-20 digits' })
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'ifscCode must be a valid IFSC' })
  ifscCode?: string;

  @ApiPropertyOptional({ example: 'vikram@upi' })
  @IsOptional()
  @IsString()
  upiId?: string;
}
