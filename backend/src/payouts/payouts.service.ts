import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPayoutDto } from './dto/manual-payout.dto';
import { RequestPayoutDto } from './dto/request-payout.dto';

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  // SRS §12/§13: SUM(commission) - SUM(payouts), never stored. A PENDING
  // payout already counts here (only REJECTED is excluded), so a member
  // can't stack requests past their real balance.
  async getAvailableBalance(memberId: string): Promise<Prisma.Decimal> {
    const [earningsAgg, payoutsAgg] = await Promise.all([
      this.prisma.commissionLedger.aggregate({
        where: { beneficiaryId: memberId, status: 'CREDITED' },
        _sum: { earnedAmount: true },
      }),
      this.prisma.payout.aggregate({
        where: { memberId, status: { not: 'REJECTED' } },
        _sum: { amount: true },
      }),
    ]);

    const totalEarned = earningsAgg._sum.earnedAmount ?? new Prisma.Decimal(0);
    const totalPaidOut = payoutsAgg._sum.amount ?? new Prisma.Decimal(0);
    return totalEarned.sub(totalPaidOut);
  }

  private async generateReferenceNo(tx: Prisma.TransactionClient): Promise<string> {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const candidate = `PAY-${datePart}-${randomPart}`;
      const existing = await tx.payout.findUnique({ where: { referenceNo: candidate } });
      if (!existing) {
        return candidate;
      }
    }

    throw new Error('Could not generate a unique payout reference number');
  }

  async requestPayout(memberId: string, dto: RequestPayoutDto) {
    const balance = await this.getAvailableBalance(memberId);
    if (new Prisma.Decimal(dto.amount).gt(balance)) {
      throw new BadRequestException(
        `Requested amount exceeds your available balance of ₹${balance.toString()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const referenceNo = await this.generateReferenceNo(tx);

      const payout = await tx.payout.create({
        data: {
          memberId,
          referenceNo,
          amount: dto.amount,
          paymentMode: dto.paymentMode,
          accountDetailsMasked: dto.accountDetails,
          status: 'PENDING',
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'MEMBER',
          actorId: memberId,
          action: 'PAYOUT_REQUEST_SUBMITTED',
          entityName: 'Payout',
          entityId: payout.id,
          afterSnapshot: { amount: dto.amount, paymentMode: dto.paymentMode, referenceNo },
        },
      });

      return payout;
    });
  }

  async recordManualPayout(dto: ManualPayoutDto, adminId: string) {
    const member = await this.prisma.member.findUnique({ where: { id: dto.memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const balance = await this.getAvailableBalance(dto.memberId);
    if (new Prisma.Decimal(dto.amount).gt(balance)) {
      throw new BadRequestException(
        `Amount exceeds this member's available balance of ₹${balance.toString()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const referenceNo = await this.generateReferenceNo(tx);
      const now = new Date();

      const payout = await tx.payout.create({
        data: {
          memberId: dto.memberId,
          referenceNo,
          amount: dto.amount,
          paymentMode: dto.paymentMode,
          accountDetailsMasked: dto.accountDetails,
          status: 'PAID',
          processedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'MANUAL_PAYOUT_ENTRY',
          entityName: 'Payout',
          entityId: payout.id,
          afterSnapshot: { memberId: dto.memberId, amount: dto.amount, referenceNo },
        },
      });

      return payout;
    });
  }

  private async transition(
    payoutId: string,
    expectedStatus: string,
    nextStatus: 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED',
    adminId: string,
    action: string,
    extra: Prisma.PayoutUpdateInput = {},
  ) {
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    if (payout.status !== expectedStatus) {
      throw new BadRequestException(
        `Payout is ${payout.status}; expected ${expectedStatus} to perform this action`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payout.update({
        where: { id: payoutId },
        data: { status: nextStatus, ...extra },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action,
          entityName: 'Payout',
          entityId: payoutId,
          beforeSnapshot: { status: expectedStatus },
          afterSnapshot: { status: nextStatus },
        },
      });

      return updated;
    });
  }

  approve(payoutId: string, adminId: string) {
    return this.transition(payoutId, 'PENDING', 'APPROVED', adminId, 'PAYOUT_APPROVED');
  }

  async reject(payoutId: string, adminId: string, adminNote: string) {
    // Allowed from either PENDING or APPROVED, unlike the other single-path
    // transitions, so the expected-status check happens here first.
    const payout = await this.prisma.payout.findUnique({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException('Payout not found');
    }
    if (payout.status !== 'PENDING' && payout.status !== 'APPROVED') {
      throw new BadRequestException(
        `Payout is ${payout.status}; can only reject from PENDING or APPROVED`,
      );
    }

    return this.transition(payoutId, payout.status, 'REJECTED', adminId, 'PAYOUT_REJECTED', {
      adminNote,
    });
  }

  process(payoutId: string, adminId: string) {
    return this.transition(payoutId, 'APPROVED', 'PROCESSING', adminId, 'PAYOUT_PROCESSING');
  }

  markPaid(payoutId: string, adminId: string) {
    return this.transition(payoutId, 'PROCESSING', 'PAID', adminId, 'PAYOUT_PAID', {
      processedAt: new Date(),
    });
  }

  async listPending() {
    return this.prisma.payout.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { member: { select: { memberCode: true, fullName: true } } },
    });
  }
}
