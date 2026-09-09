import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferralService } from './referral.service';

@ApiTags('Referral & Genealogy (SRS §6)')
@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @ApiOperation({ summary: 'Validate a sponsor code before showing the registration form' })
  @ApiParam({ name: 'sponsorCode', example: 'A000001' })
  @Get('validate/:sponsorCode')
  async validateSponsor(@Param('sponsorCode') sponsorCode: string) {
    const sponsor = await this.referralService.validateSponsor(sponsorCode);
    return {
      valid: true,
      memberCode: sponsor.memberCode,
      fullName: sponsor.fullName,
    };
  }

  @ApiOperation({
    summary:
      'Get a member\'s downline (recursive, up to 10 levels). Members may only query their own network; Admins may query any member.',
  })
  @ApiParam({ name: 'memberId' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('genealogy/:memberId')
  async getGenealogy(@Param('memberId') memberId: string, @Request() req: any) {
    this.referralService.assertCanViewGenealogy(memberId, req.user);
    return this.referralService.getGenealogy(memberId);
  }
}
