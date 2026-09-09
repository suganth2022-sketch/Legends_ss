import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class ManualPaymentDto {
  @ApiProperty({ description: 'Member id the payment is being recorded for' })
  @IsUUID()
  memberId: string;

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
