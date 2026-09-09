import { ApiProperty } from '@nestjs/swagger';
import { PayoutMode } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

// Admin cash/manual payout entry — recorded as already PAID, mirroring
// POST /payments/manual (the admin is logging something that already
// happened, not requesting an approval).
export class ManualPayoutDto {
  @ApiProperty({ description: 'Member the payout was made to' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ example: 5000, description: 'Minimum ₹1,000' })
  @IsNumber()
  @Min(1000)
  amount: number;

  @ApiProperty({ enum: PayoutMode })
  @IsEnum(PayoutMode)
  paymentMode: PayoutMode;

  @ApiProperty({ example: 'Cash handed over in person' })
  @IsString()
  @IsNotEmpty()
  accountDetails: string;
}
