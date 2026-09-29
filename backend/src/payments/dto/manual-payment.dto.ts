import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ManualPaymentDto {
  // Admins know a member by their Member Code (e.g. "A000004"), never their
  // internal UUID — the DTO accepts that directly and the service resolves
  // it, instead of forcing the admin to look up a UUID first.
  @ApiProperty({ example: 'A000004', description: 'Member Code the payment is being recorded for' })
  @IsString()
  @IsNotEmpty()
  memberCode: string;

  @ApiProperty({ example: 2000, description: 'First payment: multiple of 1000. Later payments: must match the locked plan amount exactly.' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    required: false,
    description: 'ISO date the payment was made; defaults to now',
    example: '2026-09-05T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}
