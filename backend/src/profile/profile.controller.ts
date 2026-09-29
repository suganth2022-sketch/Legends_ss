import { Body, Controller, ForbiddenException, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateBankDto } from './dto/update-bank.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { UpdateNomineeDto } from './dto/update-nominee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Member Profile / KYC / Bank / Nominee (SRS §5)')
@Controller('members/me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private assertMember(req: any) {
    if (req.user.userType !== 'MEMBER') {
      throw new ForbiddenException('This endpoint is for Members');
    }
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.getProfile(req.user.id);
  }

  @Patch('profile')
  async updateProfile(@Body() dto: UpdateProfileDto, @Request() req: any) {
    this.assertMember(req);
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Get('kyc')
  async getKyc(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.getKyc(req.user.id);
  }

  @Patch('kyc')
  async updateKyc(@Body() dto: UpdateKycDto, @Request() req: any) {
    this.assertMember(req);
    return this.profileService.updateKyc(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Reveal decrypted Aadhaar/PAN to the member themselves (audit-logged)' })
  @Post('kyc/reveal')
  async revealKyc(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.revealKyc(req.user.id);
  }

  @Get('bank')
  async getBank(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.getBank(req.user.id);
  }

  @Patch('bank')
  async updateBank(@Body() dto: UpdateBankDto, @Request() req: any) {
    this.assertMember(req);
    return this.profileService.updateBank(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Reveal decrypted bank account number to the member themselves (audit-logged)' })
  @Post('bank/reveal')
  async revealBank(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.revealBank(req.user.id);
  }

  @Get('nominee')
  async getNominee(@Request() req: any) {
    this.assertMember(req);
    return this.profileService.getNominee(req.user.id);
  }

  @Patch('nominee')
  async updateNominee(@Body() dto: UpdateNomineeDto, @Request() req: any) {
    this.assertMember(req);
    return this.profileService.updateNominee(req.user.id, dto);
  }
}
