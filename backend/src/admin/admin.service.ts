import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { PassbookService } from '../passbook/passbook.service';
import { ListEarningsQueryDto } from '../passbook/dto/list-earnings-query.dto';
import { ListPayoutsQueryDto } from '../passbook/dto/list-payouts-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { ListCommissionsQueryDto } from './dto/list-commissions-query.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
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
  ) {}

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
