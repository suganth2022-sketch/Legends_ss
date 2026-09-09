import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListEarningsQueryDto } from './dto/list-earnings-query.dto';
import { ListPayoutsQueryDto } from './dto/list-payouts-query.dto';

@Injectable()
export class PassbookService {
  constructor(private readonly prisma: PrismaService) {}

  // SRS §11: Earnings tab. The commission rate is intentionally never
  // returned here — only baseAmount/earnedAmount, matching the existing
  // frontend contract (frontend/src/types.ts CommissionEntry).
  async getEarnings(memberId: string, filters: ListEarningsQueryDto) {
    const where: Prisma.CommissionLedgerWhereInput = { beneficiaryId: memberId };

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {
        ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
        ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
      };
    }

    if (filters.level) {
      where.level = filters.level;
    }

    if (filters.sourceMemberCode) {
      const sourceMember = await this.prisma.member.findUnique({
        where: { memberCode: filters.sourceMemberCode.toUpperCase() },
        select: { id: true },
      });
      // No match -> force an empty result set rather than ignoring the filter
      where.sourceMemberId = sourceMember?.id ?? '__no_match__';
    }

    const rows = await this.prisma.commissionLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { sourceMember: { select: { memberCode: true, fullName: true } } },
    });

    return rows.map((row, index) => ({
      sNo: index + 1,
      date: row.createdAt,
      sourceMemberCode: row.sourceMember.memberCode,
      sourceMemberName: row.sourceMember.fullName,
      level: row.level,
      baseAmount: row.baseAmount,
      earnedAmount: row.earnedAmount,
      status: row.status,
    }));
  }

  // SRS §11: Payouts tab. Reads the `payouts` table directly — it will
  // correctly return [] for every member until the Payout workflow module
  // (request/approve/process) exists and starts writing rows into it.
  async getPayouts(memberId: string, filters: ListPayoutsQueryDto) {
    const where: Prisma.PayoutWhereInput = { memberId };

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {
        ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
        ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
      };
    }

    if (filters.mode) {
      where.paymentMode = filters.mode;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const rows = await this.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row, index) => ({
      sNo: index + 1,
      date: row.createdAt,
      referenceNo: row.referenceNo,
      amount: row.amount,
      paymentMode: row.paymentMode,
      status: row.status,
    }));
  }
}
