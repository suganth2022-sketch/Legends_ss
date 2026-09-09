import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GenealogyRow {
  id: string;
  memberCode: string;
  fullName: string;
  doj: Date;
  status: string;
  sponsorCode: string | null;
  level: number;
  committedAmount: string | null;
  directReferralsCount: number;
  totalTeamCount: number;
}

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  // Sponsor lookup + eligibility check used both by the public validate
  // endpoint and by MembersService during registration.
  async validateSponsor(sponsorCode: string) {
    const sponsor = await this.prisma.member.findUnique({
      where: { memberCode: sponsorCode.toUpperCase() },
      select: { id: true, memberCode: true, fullName: true, status: true },
    });

    if (!sponsor) {
      throw new BadRequestException('Sponsor code does not exist');
    }

    if (sponsor.status !== 'ACTIVE') {
      throw new BadRequestException('Sponsor account is not active');
    }

    return sponsor;
  }

  // Enforces that a MEMBER caller can only view their own downline;
  // ADMIN callers may view any member's downline.
  assertCanViewGenealogy(
    requestedMemberId: string,
    requester: { id: string; userType: 'MEMBER' | 'ADMIN' },
  ) {
    if (requester.userType === 'ADMIN') {
      return;
    }

    if (requester.id !== requestedMemberId) {
      throw new ForbiddenException('You may only view your own network');
    }
  }

  // Recursive CTE downline traversal, capped at 10 levels per the SRS
  // (unlimited direct referrals per sponsor, but commission-relevant depth
  // stops at level 10). Level is computed from query depth, never stored.
  //
  // committedAmount comes from payment_plans (that table already exists);
  // advancePaid/paymentStatus per calendar month are intentionally omitted
  // here until the Payments module exists to populate real payment rows.
  async getGenealogy(rootMemberId: string): Promise<GenealogyRow[]> {
    const rows = await this.prisma.$queryRaw<GenealogyRow[]>`
      WITH RECURSIVE downline AS (
        SELECT
          m.id,
          m.member_code AS "memberCode",
          m.full_name AS "fullName",
          m.doj,
          m.status,
          m.sponsor_id,
          1 AS level
        FROM members m
        WHERE m.sponsor_id = ${rootMemberId}

        UNION ALL

        SELECT
          m.id,
          m.member_code AS "memberCode",
          m.full_name AS "fullName",
          m.doj,
          m.status,
          m.sponsor_id,
          d.level + 1
        FROM members m
        INNER JOIN downline d ON m.sponsor_id = d.id
        WHERE d.level < 10
      )
      SELECT
        d.id,
        d."memberCode",
        d."fullName",
        d.doj,
        d.status,
        d.level,
        sponsor.member_code AS "sponsorCode",
        plan."committedAmount",
        COALESCE(direct_counts.count, 0)::int AS "directReferralsCount",
        COALESCE(team_counts.count, 0)::int AS "totalTeamCount"
      FROM downline d
      LEFT JOIN members sponsor ON sponsor.id = d.sponsor_id
      LEFT JOIN LATERAL (
        SELECT pp.committed_amount AS "committedAmount"
        FROM payment_plans pp
        WHERE pp.member_id = d.id AND pp.status = 'ACTIVE'
        ORDER BY pp.effective_from DESC
        LIMIT 1
      ) plan ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM members m2
        WHERE m2.sponsor_id = d.id
      ) direct_counts ON true
      LEFT JOIN LATERAL (
        WITH RECURSIVE sub AS (
          SELECT id FROM members WHERE sponsor_id = d.id
          UNION ALL
          SELECT m3.id FROM members m3 INNER JOIN sub s ON m3.sponsor_id = s.id
        )
        SELECT COUNT(*)::int AS count FROM sub
      ) team_counts ON true
      ORDER BY d.level ASC, d."fullName" ASC
    `;

    return rows;
  }
}
