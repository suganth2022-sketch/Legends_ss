import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { PassbookService } from '../passbook/passbook.service';
import { ListEarningsQueryDto } from '../passbook/dto/list-earnings-query.dto';
import { ListPayoutsQueryDto } from '../passbook/dto/list-payouts-query.dto';
import { PaymentsService } from '../payments/payments.service';
import { ProfileService } from '../profile/profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListCommissionsQueryDto } from './dto/list-commissions-query.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { ListMembersSummaryQueryDto } from './dto/list-members-summary-query.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { ListPayoutsReportQueryDto } from './dto/list-payouts-report-query.dto';

function dateRange(fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) {
    return undefined;
  }
  return {
    ...(fromDate ? { gte: new Date(fromDate) } : {}),
    ...(toDate ? { lte: new Date(toDate) } : {}),
  };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passbookService: PassbookService,
    private readonly paymentsService: PaymentsService,
    private readonly profileService: ProfileService,
  ) {}

  getMemberPayments(memberId: string) {
    return this.paymentsService.getMyPayments(memberId);
  }

  // Full profile view for the admin side: personal details, KYC and bank
  // status (masked — decrypting is still self-service-only for the member,
  // audit-logged via KYC_SELF_REVEAL/BANK_SELF_REVEAL; admins never get a
  // reveal action), and nominee. Reuses ProfileService's memberId-scoped
  // getters (same reuse pattern as PaymentsService.getMyPayments above).
  async getMemberFullProfile(memberId: string) {
    const [profile, kyc, bank, nominee] = await Promise.all([
      this.profileService.getProfile(memberId),
      this.profileService.getKyc(memberId),
      this.profileService.getBank(memberId),
      this.profileService.getNominee(memberId),
    ]);
    return { profile, kyc, bank, nominee };
  }

  // One row per member: total payments made, total commission earned,
  // total actually paid out, and the live balance — the same three
  // formulas already used individually elsewhere (payments.service.ts,
  // commission_ledger CREDITED sum, payouts non-REJECTED sum), combined
  // here via LATERAL aggregates so filtering by payout-balance range and
  // pagination stay correct together (filter happens in the same query,
  // before LIMIT/OFFSET — never post-fetch).
  async listMembersSummary(query: ListMembersSummaryQueryDto) {
    const searchFilter = query.search
      ? Prisma.sql`AND (m.full_name ILIKE ${'%' + query.search + '%'} OR m.member_code ILIKE ${'%' + query.search + '%'})`
      : Prisma.empty;
    const balanceExpr = Prisma.sql`(COALESCE(earn.total, 0) - COALESCE(paidout.total, 0))`;
    const minFilter =
      query.minBalance !== undefined ? Prisma.sql`AND ${balanceExpr} >= ${query.minBalance}` : Prisma.empty;
    const maxFilter =
      query.maxBalance !== undefined ? Prisma.sql`AND ${balanceExpr} <= ${query.maxBalance}` : Prisma.empty;

    const fromAndJoins = Prisma.sql`
      FROM members m
      LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total FROM payments WHERE member_id = m.id AND status = 'SUCCESS'
      ) pay ON true
      LEFT JOIN LATERAL (
        SELECT SUM(earned_amount) AS total FROM commission_ledger WHERE beneficiary_id = m.id AND status = 'CREDITED'
      ) earn ON true
      LEFT JOIN LATERAL (
        SELECT SUM(amount) AS total FROM payouts WHERE member_id = m.id AND status != 'REJECTED'
      ) paidout ON true
      WHERE 1=1 ${searchFilter} ${minFilter} ${maxFilter}
    `;

    const [data, countResult] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          id: string;
          memberCode: string;
          fullName: string;
          totalPayment: string;
          totalEarning: string;
          totalPaid: string;
          balance: string;
        }>
      >(Prisma.sql`
        SELECT
          m.id, m.member_code AS "memberCode", m.full_name AS "fullName",
          COALESCE(pay.total, 0) AS "totalPayment",
          COALESCE(earn.total, 0) AS "totalEarning",
          COALESCE(paidout.total, 0) AS "totalPaid",
          COALESCE(earn.total, 0) - COALESCE(paidout.total, 0) AS "balance"
        ${fromAndJoins}
        ORDER BY m.created_at DESC
        LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}
      `),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count ${fromAndJoins}
      `),
    ]);

    return {
      data,
      total: Number(countResult[0]?.count ?? 0),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async listMembers(query: ListMembersQueryDto) {
    const where: Prisma.MemberWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { memberCode: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          memberCode: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          doj: true,
          sponsor: { select: { memberCode: true, fullName: true } },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async updateMemberStatus(memberId: string, status: MemberStatus, adminId: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.member.update({
        where: { id: memberId },
        data: { status },
        select: {
          id: true,
          memberCode: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          doj: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'MEMBER_STATUS_CHANGED',
          entityName: 'Member',
          entityId: memberId,
          beforeSnapshot: { status: member.status },
          afterSnapshot: { status },
        },
      });

      return updated;
    });
  }

  getMemberEarnings(memberId: string, filters: ListEarningsQueryDto) {
    return this.passbookService.getEarnings(memberId, filters);
  }

  getMemberPayouts(memberId: string, filters: ListPayoutsQueryDto) {
    return this.passbookService.getPayouts(memberId, filters);
  }

  async listPayments(query: ListPaymentsQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(dateRange(query.fromDate, query.toDate)
        ? { paidAt: dateRange(query.fromDate, query.toDate) }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { member: { select: { memberCode: true, fullName: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async listCommissions(query: ListCommissionsQueryDto) {
    const where: Prisma.CommissionLedgerWhereInput = {
      ...(query.level ? { level: query.level } : {}),
      ...(dateRange(query.fromDate, query.toDate)
        ? { createdAt: dateRange(query.fromDate, query.toDate) }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.commissionLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          beneficiary: { select: { memberCode: true, fullName: true } },
          sourceMember: { select: { memberCode: true, fullName: true } },
        },
      }),
      this.prisma.commissionLedger.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async listPayoutsReport(query: ListPayoutsReportQueryDto) {
    const where: Prisma.PayoutWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.mode ? { paymentMode: query.mode } : {}),
      ...(dateRange(query.fromDate, query.toDate)
        ? { createdAt: dateRange(query.fromDate, query.toDate) }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { member: { select: { memberCode: true, fullName: true } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async listAuditLogs(query: ListAuditLogsQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityName ? { entityName: query.entityName } : {}),
      ...(dateRange(query.fromDate, query.toDate)
        ? { createdAt: dateRange(query.fromDate, query.toDate) }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total, page: query.page, pageSize: query.pageSize };
  }
}
