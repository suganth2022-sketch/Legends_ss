import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterMemberDto {
  @ApiProperty({ example: 'Anita Roy' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'anita.roy@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'A000001',
    description: "Referring sponsor's Member Code, carried by the referral link",
  })
  @IsString()
  @Matches(/^A\d{6}$/, { message: 'sponsorCode must look like A000001' })
  sponsorCode: string;
}
