import { ApiProperty } from '@nestjs/swagger';
import { PayoutMode } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RequestPayoutDto {
  @ApiProperty({ example: 5000, description: 'Minimum ₹1,000' })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ enum: PayoutMode })
  @IsEnum(PayoutMode)
  paymentMode: PayoutMode;

  @ApiProperty({
    example: 'rajesh@upi',
    description: 'UPI id or bank account details to pay out to (no stored bank profile yet — Phase 5)',
  })
  @IsString()
  @IsNotEmpty()
  accountDetails: string;
}
