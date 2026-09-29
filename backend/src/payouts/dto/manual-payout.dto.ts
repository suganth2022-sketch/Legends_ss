import { ApiProperty } from '@nestjs/swagger';
import { PayoutMode } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

// Admin cash/manual payout entry — recorded as already PAID, mirroring
// POST /payments/manual (the admin is logging something that already
// happened, not requesting an approval).
export class ManualPayoutDto {
  // Admins know a member by their Member Code (e.g. "A000004"), never their
  // internal UUID — the DTO accepts that directly and the service resolves
  // it, instead of forcing the admin to look up a UUID first.
  @ApiProperty({ example: 'A000004', description: 'Member Code the payout was made to' })
  @IsString()
  @IsNotEmpty()
  memberCode: string;

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
