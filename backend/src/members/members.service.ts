import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralService } from '../referral/referral.service';
import { RegisterMemberDto } from './dto/register-member.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referralService: ReferralService,
  ) {}

  // Readable, sufficiently random initial password. This stands in for the
  // Notifications module (SMS/email delivery) which doesn't exist yet — the
  // plaintext is returned once in the registration response and never
  // logged or persisted anywhere.
  private generateInitialPassword(): string {
    return crypto.randomBytes(9).toString('base64url'); // 12 chars, URL-safe
  }

  async register(dto: RegisterMemberDto) {
    const sponsor = await this.referralService.validateSponsor(dto.sponsorCode);

    const initialPassword = this.generateInitialPassword();
    const passwordHash = await argon2.hash(initialPassword);

    try {
      const member = await this.prisma.$transaction(async (tx) => {
        const counter = await tx.systemCounter.update({
          where: { key: 'member_code' },
          data: { value: { increment: 1 } },
        });
        const memberCode = `A${String(counter.value).padStart(6, '0')}`;

        return tx.member.create({
          data: {
            memberCode,
            fullName: dto.fullName,
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            passwordHash,
            sponsorId: sponsor.id,
          },
        });
      });

      return {
        memberCode: member.memberCode,
        fullName: member.fullName,
        sponsorCode: sponsor.memberCode,
        initialPassword,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A member with this email or phone already exists');
      }
      throw err;
    }
  }

  private async findIdentityById(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
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
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async getMe(userId: string) {
    return this.findIdentityById(userId);
  }

  async getById(id: string) {
    return this.findIdentityById(id);
  }
}
