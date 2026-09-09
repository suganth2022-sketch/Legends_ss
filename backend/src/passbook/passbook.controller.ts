import { Controller, ForbiddenException, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListEarningsQueryDto } from './dto/list-earnings-query.dto';
import { ListPayoutsQueryDto } from './dto/list-payouts-query.dto';
import { PassbookService } from './passbook.service';

@ApiTags('Passbook (SRS §11)')
@Controller('passbook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PassbookController {
  constructor(private readonly passbookService: PassbookService) {}

  private assertMember(req: any) {
    if (req.user.userType !== 'MEMBER') {
      throw new ForbiddenException('This endpoint is for Members');
    }
  }

  @ApiOperation({ summary: "Get the authenticated Member's earnings (commission rate intentionally not returned)" })
  @Get('earnings')
  async getEarnings(@Query() query: ListEarningsQueryDto, @Request() req: any) {
    this.assertMember(req);
    return this.passbookService.getEarnings(req.user.id, query);
  }

  @ApiOperation({ summary: "Get the authenticated Member's payout history" })
  @Get('payouts')
  async getPayouts(@Query() query: ListPayoutsQueryDto, @Request() req: any) {
    this.assertMember(req);
    return this.passbookService.getPayouts(req.user.id, query);
  }
}
