import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private readonly prisma: PrismaService) {}

  // Business rule (docs/business-rules.md §2): due day is fixed per member
  // from their DOJ — 20th if they joined on/before the 20th, else 30th,
  // clamped to the last day of short months (February).
  private getDueDate(doj: Date, year: number, month: number): Date {
    const dueDay = doj.getUTCDate() <= 20 ? 20 : 30;
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const clampedDay = Math.min(dueDay, lastDayOfMonth);
    return new Date(Date.UTC(year, month, clampedDay, 23, 59, 59, 999));
  }

  // docs/business-rules.md §3: a member is only eligible to receive
  // overrides from their downline for a given month if THEY made their own
  // installment payment for that same month by their own due date.
  async isEligibleForMonth(memberId: string, asOf: Date): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { doj: true },
    });
    if (!member) {
      return false;
    }

    const year = asOf.getUTCFullYear();
    const month = asOf.getUTCMonth();
    const dueDate = this.getDueDate(member.doj, year, month);
    const monthStart = new Date(Date.UTC(year, month, 1));

    const qualifyingPayment = await this.prisma.payment.findFirst({
      where: {
        memberId,
        status: 'SUCCESS',
        paidAt: { gte: monthStart, lte: dueDate },
      },
    });

    return !!qualifyingPayment;
  }

  // Reads the versioned rate active at the payment's own timestamp, so a
  // later rate change never recalculates historical ledger rows.
  private async getActiveRate(level: number, asOf: Date): Promise<Prisma.Decimal> {
    const rule = await this.prisma.commissionRule.findFirst({
      where: {
        level,
        effectiveFrom: { lte: asOf },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: asOf } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!rule) {
      throw new InternalServerErrorException(
        `No active commission rule configured for level ${level} as of ${asOf.toISOString()}`,
      );
    }

    return rule.percentage;
  }

  // Engine entrypoint — call this right after a payment is marked SUCCESS.
  // Walks the sponsor chain (Level 2 = direct sponsor ... Level 10), skipping
  // (not redistributing) any beneficiary who was ineligible that month.
  async generateCommissionForPayment(paymentId: string) {
    const existing = await this.prisma.commissionLedger.findMany({ where: { paymentId } });
    if (existing.length > 0) {
      return existing; // idempotent: never regenerate for a payment already processed
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== 'SUCCESS') {
      throw new BadRequestException('Commission can only be generated for a SUCCESS payment');
    }
    if (!payment.paidAt) {
      throw new BadRequestException('Payment has no paidAt timestamp');
    }

    const created = [];
    let currentSponsorId = payment.member.sponsorId;
    let level = 2;

    while (currentSponsorId && level <= 10) {
      const beneficiary = await this.prisma.member.findUnique({
        where: { id: currentSponsorId },
      });
      if (!beneficiary) {
        break;
      }

      const eligible = await this.isEligibleForMonth(beneficiary.id, payment.paidAt);
      if (eligible) {
        const rate = await this.getActiveRate(level, payment.paidAt);
        const earnedAmount = payment.amount.mul(rate).div(100).toDecimalPlaces(2);

        const row = await this.prisma.commissionLedger.create({
          data: {
            paymentId: payment.id,
            beneficiaryId: beneficiary.id,
            sourceMemberId: payment.memberId,
            level,
            appliedRate: rate,
            baseAmount: payment.amount,
            earnedAmount,
          },
        });
        created.push(row);
      }

      currentSponsorId = beneficiary.sponsorId;
      level += 1;
    }

    return created;
  }

  async listActiveRates() {
    return this.prisma.commissionRule.findMany({
      where: { effectiveTo: null },
      orderBy: { level: 'asc' },
    });
  }

  async setRate(level: number, percentage: number) {
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.commissionRule.updateMany({
        where: { level, effectiveTo: null },
        data: { effectiveTo: now },
      });
      return tx.commissionRule.create({
        data: { level, percentage, effectiveFrom: now },
      });
    });
  }
}
