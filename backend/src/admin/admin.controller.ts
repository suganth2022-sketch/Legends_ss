import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audited } from '../audit/audited.decorator';
import { ListEarningsQueryDto } from '../passbook/dto/list-earnings-query.dto';
import { ListPayoutsQueryDto } from '../passbook/dto/list-payouts-query.dto';
import { AdminService } from './admin.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListCommissionsQueryDto } from './dto/list-commissions-query.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { ListMembersSummaryQueryDto } from './dto/list-members-summary-query.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { ListPayoutsReportQueryDto } from './dto/list-payouts-report-query.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';

@ApiTags('Admin Portal & Reports (SRS §15, §24)')
@Controller('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private assertAdmin(req: any) {
    if (req.user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @ApiOperation({ summary: 'List/search/filter members' })
  @Get('members')
  async listMembers(@Query() query: ListMembersQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listMembers(query);
  }

  @ApiOperation({ summary: "Change a member's status (ACTIVE/PENDING/SUSPENDED)" })
  @Patch('members/:id/status')
  async updateMemberStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMemberStatusDto,
    @Request() req: any,
  ) {
    this.assertAdmin(req);
    return this.adminService.updateMemberStatus(id, dto.status, req.user.id);
  }

  @ApiOperation({ summary: "Admin drill-down into any member's earnings (includes appliedRate, unlike the member-facing Passbook)" })
  @Audited('ADMIN_VIEWED_MEMBER_EARNINGS', 'Member')
  @UseInterceptors(AuditInterceptor)
  @Get('members/:id/earnings')
  async getMemberEarnings(
    @Param('id') id: string,
    @Query() query: ListEarningsQueryDto,
    @Request() req: any,
  ) {
    this.assertAdmin(req);
    return this.adminService.getMemberEarnings(id, query);
  }

  @ApiOperation({ summary: "Admin drill-down into any member's payout history" })
  @Audited('ADMIN_VIEWED_MEMBER_PAYOUTS', 'Member')
  @UseInterceptors(AuditInterceptor)
  @Get('members/:id/payouts')
  async getMemberPayouts(
    @Param('id') id: string,
    @Query() query: ListPayoutsQueryDto,
    @Request() req: any,
  ) {
    this.assertAdmin(req);
    return this.adminService.getMemberPayouts(id, query);
  }

  @ApiOperation({ summary: "Admin drill-down into any member's payment history" })
  @Audited('ADMIN_VIEWED_MEMBER_PAYMENTS', 'Member')
  @UseInterceptors(AuditInterceptor)
  @Get('members/:id/payments')
  async getMemberPayments(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.getMemberPayments(id);
  }

  @ApiOperation({
    summary:
      "Admin view of a member's full profile: personal details, KYC/bank status (masked — decrypting stays member self-service only), and nominee",
  })
  @Audited('ADMIN_VIEWED_MEMBER_PROFILE', 'Member')
  @UseInterceptors(AuditInterceptor)
  @Get('members/:id/full-profile')
  async getMemberFullProfile(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.getMemberFullProfile(id);
  }

  @ApiOperation({
    summary:
      'One row per member: total payments made, total commission earned, total paid out, live balance — filterable by a total-earnings range',
  })
  @Get('members-summary')
  async listMembersSummary(@Query() query: ListMembersSummaryQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listMembersSummary(query);
  }

  @ApiOperation({ summary: 'All payments across all members, filterable' })
  @Get('reports/payments')
  async listPayments(@Query() query: ListPaymentsQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listPayments(query);
  }

  @ApiOperation({ summary: 'All commission ledger rows across all members, filterable (includes appliedRate)' })
  @Get('reports/commissions')
  async listCommissions(@Query() query: ListCommissionsQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listCommissions(query);
  }

  @ApiOperation({ summary: 'All payouts across all members, filterable' })
  @Get('reports/payouts')
  async listPayoutsReport(@Query() query: ListPayoutsReportQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listPayoutsReport(query);
  }

  @ApiOperation({ summary: 'Read the append-only audit log' })
  @Get('audit-logs')
  async listAuditLogs(@Query() query: ListAuditLogsQueryDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.adminService.listAuditLogs(query);
  }
}
