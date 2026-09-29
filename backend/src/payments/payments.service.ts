import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CommissionService } from '../commission/commission.service';
import { PrismaService } from '../prisma/prisma.service';
import { ManualPaymentDto } from './dto/manual-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  // SRS §9 — admin enters a Member ID + amount. First payment for a member
  // locks their recurring monthly plan amount (SRS §7); every later payment
  // must match that locked amount exactly.
  async recordManualPayment(dto: ManualPaymentDto, adminId: string) {
    const member = await this.prisma.member.findUnique({ where: { memberCode: dto.memberCode.toUpperCase() } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    const memberId = member.id;

    const payment = await this.prisma.$transaction(async (tx) => {
      const activePlan = await tx.paymentPlan.findFirst({
        where: { memberId, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (!activePlan) {
        if (dto.amount < 1000 || dto.amount % 1000 !== 0) {
          throw new BadRequestException(
            'First payment must be at least ₹1,000 and a multiple of ₹1,000',
          );
        }
        await tx.paymentPlan.create({
          data: { memberId, committedAmount: dto.amount },
        });
      } else if (Number(activePlan.committedAmount) !== dto.amount) {
        throw new BadRequestException(
          `Amount must match the locked monthly plan amount of ₹${activePlan.committedAmount}`,
        );
      }

      const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

      const created = await tx.payment.create({
        data: {
          memberId,
          amount: dto.amount,
          status: 'SUCCESS',
          mode: 'MANUAL_ADMIN',
          transactionId: `MANUAL-${crypto.randomUUID()}`,
          paidAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'MANUAL_PAYMENT_ENTRY',
          entityName: 'Payment',
          entityId: created.id,
          afterSnapshot: {
            memberId: created.memberId,
            amount: dto.amount,
            transactionId: created.transactionId,
            paidAt: paidAt.toISOString(),
          },
        },
      });

      return created;
    });

    const commissions = await this.commissionService.generateCommissionForPayment(payment.id);

    return { payment, commissions };
  }

  async getMyPayments(memberId: string) {
    const [plan, payments] = await Promise.all([
      this.prisma.paymentPlan.findFirst({
        where: { memberId, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.payment.findMany({
        where: { memberId },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    return {
      committedAmount: plan?.committedAmount ?? null,
      payments,
    };
  }
}
