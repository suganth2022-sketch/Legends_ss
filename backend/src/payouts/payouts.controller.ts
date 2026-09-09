import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ManualPayoutDto } from './dto/manual-payout.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';
import { PayoutsService } from './payouts.service';

@ApiTags('Payouts (SRS §12, §13)')
@Controller('payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  private assertMember(req: any) {
    if (req.user.userType !== 'MEMBER') {
      throw new ForbiddenException('This endpoint is for Members');
    }
  }

  private assertAdmin(req: any) {
    if (req.user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @ApiOperation({ summary: "Get the authenticated Member's available balance (SUM(commission) - SUM(payouts))" })
  @Get('balance')
  async getBalance(@Request() req: any) {
    this.assertMember(req);
    const balance = await this.payoutsService.getAvailableBalance(req.user.id);
    return { availableBalance: balance };
  }

  @ApiOperation({ summary: 'Request a payout (Member only). Minimum ₹1,000, capped at available balance.' })
  @Post('request')
  async request(@Body() dto: RequestPayoutDto, @Request() req: any) {
    this.assertMember(req);
    return this.payoutsService.requestPayout(req.user.id, dto);
  }

  @ApiOperation({ summary: 'List all PENDING payout requests (Admin only)' })
  @Get('pending')
  async listPending(@Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.listPending();
  }

  @ApiOperation({
    summary:
      'Record a cash/manual payout already handed to a member (Admin only). Recorded directly as PAID — nothing left to approve.',
  })
  @Post('manual')
  async manual(@Body() dto: ManualPayoutDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.recordManualPayout(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Approve a PENDING payout request (Admin only)' })
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.approve(id, req.user.id);
  }

  @ApiOperation({ summary: 'Reject a PENDING or APPROVED payout (Admin only)' })
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectPayoutDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.reject(id, req.user.id, dto.adminNote);
  }

  @ApiOperation({ summary: 'Mark an APPROVED payout as PROCESSING (Admin only)' })
  @Post(':id/process')
  async process(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.process(id, req.user.id);
  }

  @ApiOperation({ summary: 'Mark a PROCESSING payout as PAID (Admin only)' })
  @Post(':id/mark-paid')
  async markPaid(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.payoutsService.markPaid(id, req.user.id);
  }
}
