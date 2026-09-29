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

interface DownlineEdge {
  id: string;
  sponsorId: string | null;
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

  // Downline traversal. Two things used to be conflated in one expensive
  // query: the DISPLAYED list (capped at 10 levels, per the SRS commission-
  // relevant depth) and the true, unlimited-depth team-size counts (the SRS
  // separately requires unlimited direct referrals). The previous version
  // ran a full recursive sub-query PER ROW to get an uncapped count, which
  // is O(n) extra recursive queries for an n-row downline — genuinely slow
  // as a network grows.
  //
  // This version runs exactly one recursive CTE (uncapped, id/sponsorId
  // only — cheap) to get the whole real network, computes level/direct/team
  // counts for every node in plain JS in one pass, then fetches display
  // fields (name, doj, status, plan amount) with two batched queries scoped
  // only to the <=10-level rows that actually get returned — no per-row
  // queries at all.
  async getGenealogy(rootMemberId: string): Promise<GenealogyRow[]> {
    const [root, edges] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: rootMemberId }, select: { memberCode: true } }),
      this.prisma.$queryRaw<DownlineEdge[]>`
        WITH RECURSIVE downline AS (
          SELECT m.id, m.sponsor_id AS "sponsorId"
          FROM members m
          WHERE m.sponsor_id = ${rootMemberId}

          UNION ALL

          SELECT m.id, m.sponsor_id AS "sponsorId"
          FROM members m
          INNER JOIN downline d ON m.sponsor_id = d.id
        )
        SELECT id, "sponsorId" FROM downline
      `,
    ]);

    // Level via BFS from the root (direct children = level 1).
    const childrenOf = new Map<string, string[]>();
    for (const e of edges) {
      if (!e.sponsorId) continue;
      const list = childrenOf.get(e.sponsorId) ?? [];
      list.push(e.id);
      childrenOf.set(e.sponsorId, list);
    }

    const level = new Map<string, number>();
    let frontier = childrenOf.get(rootMemberId) ?? [];
    let depth = 1;
    while (frontier.length > 0) {
      for (const id of frontier) level.set(id, depth);
      const next: string[] = [];
      for (const id of frontier) next.push(...(childrenOf.get(id) ?? []));
      frontier = next;
      depth += 1;
    }

    // Total team size per node — true unlimited depth, via post-order sum
    // over the whole real graph (deepest nodes first).
    const totalTeamCount = new Map<string, number>();
    const byDepthDesc = [...level.keys()].sort((a, b) => (level.get(b) ?? 0) - (level.get(a) ?? 0));
    for (const id of byDepthDesc) {
      const children = childrenOf.get(id) ?? [];
      const sum = children.reduce((acc, childId) => acc + 1 + (totalTeamCount.get(childId) ?? 0), 0);
      totalTeamCount.set(id, sum);
    }

    const displayIds = [...level.entries()].filter(([, lv]) => lv <= 10).map(([id]) => id);
    if (displayIds.length === 0) {
      return [];
    }

    const [members, plans] = await Promise.all([
      this.prisma.member.findMany({
        where: { id: { in: displayIds } },
        select: { id: true, memberCode: true, fullName: true, doj: true, status: true, sponsorId: true },
      }),
      this.prisma.paymentPlan.findMany({
        where: { memberId: { in: displayIds }, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
        select: { memberId: true, committedAmount: true },
      }),
    ]);

    const codeById = new Map(members.map((m) => [m.id, m.memberCode]));
    const planByMemberId = new Map<string, string>();
    for (const p of plans) {
      if (!planByMemberId.has(p.memberId)) {
        planByMemberId.set(p.memberId, p.committedAmount.toString());
      }
    }

    const rows: GenealogyRow[] = members.map((m) => ({
      id: m.id,
      memberCode: m.memberCode,
      fullName: m.fullName,
      doj: m.doj,
      status: m.status,
      level: level.get(m.id) ?? 0,
      sponsorCode: m.sponsorId ? (codeById.get(m.sponsorId) ?? root?.memberCode ?? null) : null,
      committedAmount: planByMemberId.get(m.id) ?? null,
      directReferralsCount: (childrenOf.get(m.id) ?? []).length,
      totalTeamCount: totalTeamCount.get(m.id) ?? 0,
    }));

    rows.sort((a, b) => a.level - b.level || a.fullName.localeCompare(b.fullName));
    return rows;
  }
}
