import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt, encrypt, maskAadhaar, maskAccountNumber, maskPan } from '../common/encryption.util';
import { UpdateBankDto } from './dto/update-bank.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { UpdateNomineeDto } from './dto/update-nominee.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private async writeAudit(memberId: string, action: string, snapshot: Prisma.InputJsonValue) {
    await this.prisma.auditLog.create({
      data: {
        actorType: 'MEMBER',
        actorId: memberId,
        action,
        entityName: 'Member',
        entityId: memberId,
        afterSnapshot: snapshot,
      },
    });
  }

  // ---- Personal profile (name split + DOB/address) ----
  async getProfile(memberId: string) {
    const [member, profile] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: memberId }, select: { fullName: true } }),
      this.prisma.memberProfile.findUnique({ where: { memberId } }),
    ]);

    const [firstName, ...rest] = (member?.fullName ?? '').split(' ');
    return {
      firstName,
      lastName: rest.join(' '),
      dob: profile?.dob ?? null,
      address: profile?.address ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      pincode: profile?.pincode ?? null,
    };
  }

  async updateProfile(memberId: string, dto: UpdateProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName) {
        const current = await tx.member.findUniqueOrThrow({ where: { id: memberId }, select: { fullName: true } });
        const [currentFirst, ...currentRest] = current.fullName.split(' ');
        const firstName = dto.firstName ?? currentFirst;
        const lastName = dto.lastName ?? currentRest.join(' ');
        await tx.member.update({
          where: { id: memberId },
          data: { fullName: [firstName, lastName].filter(Boolean).join(' ') },
        });
      }

      const { firstName: _fn, lastName: _ln, ...profileFields } = dto;
      if (Object.values(profileFields).some((v) => v !== undefined)) {
        const data = {
          ...(profileFields.dob !== undefined ? { dob: new Date(profileFields.dob) } : {}),
          ...(profileFields.address !== undefined ? { address: profileFields.address } : {}),
          ...(profileFields.city !== undefined ? { city: profileFields.city } : {}),
          ...(profileFields.state !== undefined ? { state: profileFields.state } : {}),
          ...(profileFields.pincode !== undefined ? { pincode: profileFields.pincode } : {}),
        };
        await tx.memberProfile.upsert({
          where: { memberId },
          create: { memberId, ...data },
          update: data,
        });
      }
    });

    await this.writeAudit(memberId, 'PROFILE_UPDATED', { ...dto });
    return this.getProfile(memberId);
  }

  // ---- KYC (encrypted, masked by default) ----
  async getKyc(memberId: string) {
    const kyc = await this.prisma.memberKyc.findUnique({ where: { memberId } });
    return {
      aadhaarMasked: kyc?.aadhaarEncrypted ? maskAadhaar(decrypt(kyc.aadhaarEncrypted)) : null,
      panMasked: kyc?.panEncrypted ? maskPan(decrypt(kyc.panEncrypted)) : null,
      status: kyc?.status ?? 'NOT_SUBMITTED',
    };
  }

  async updateKyc(memberId: string, dto: UpdateKycDto) {
    const data: { aadhaarEncrypted?: string; panEncrypted?: string; status: 'PENDING' } = { status: 'PENDING' };
    if (dto.aadhaarNumber) data.aadhaarEncrypted = encrypt(dto.aadhaarNumber);
    if (dto.pan) data.panEncrypted = encrypt(dto.pan);

    await this.prisma.memberKyc.upsert({
      where: { memberId },
      create: { memberId, ...data },
      update: data,
    });

    await this.writeAudit(memberId, 'KYC_UPDATED', { fieldsChanged: Object.keys(dto) });
    return this.getKyc(memberId);
  }

  async revealKyc(memberId: string) {
    const kyc = await this.prisma.memberKyc.findUnique({ where: { memberId } });
    await this.writeAudit(memberId, 'KYC_SELF_REVEAL', {});
    return {
      aadhaarNumber: kyc?.aadhaarEncrypted ? decrypt(kyc.aadhaarEncrypted) : null,
      pan: kyc?.panEncrypted ? decrypt(kyc.panEncrypted) : null,
    };
  }

  // ---- Bank details (account number encrypted, masked by default) ----
  async getBank(memberId: string) {
    const bank = await this.prisma.memberBankDetails.findUnique({ where: { memberId } });
    return {
      bankName: bank?.bankName ?? null,
      branch: bank?.branch ?? null,
      accountNumberMasked: bank?.accountNumberEncrypted ? maskAccountNumber(decrypt(bank.accountNumberEncrypted)) : null,
      ifscCode: bank?.ifscCode ?? null,
      upiId: bank?.upiId ?? null,
    };
  }

  async updateBank(memberId: string, dto: UpdateBankDto) {
    const existing = await this.prisma.memberBankDetails.findUnique({ where: { memberId } });

    const data = {
      bankName: dto.bankName ?? existing?.bankName ?? '',
      branch: dto.branch ?? existing?.branch,
      accountNumberEncrypted: dto.accountNumber ? encrypt(dto.accountNumber) : existing?.accountNumberEncrypted ?? '',
      ifscCode: dto.ifscCode ?? existing?.ifscCode ?? '',
      upiId: dto.upiId ?? existing?.upiId,
    };

    await this.prisma.memberBankDetails.upsert({
      where: { memberId },
      create: { memberId, ...data },
      update: data,
    });

    await this.writeAudit(memberId, 'BANK_DETAILS_UPDATED', { fieldsChanged: Object.keys(dto) });
    return this.getBank(memberId);
  }

  async revealBank(memberId: string) {
    const bank = await this.prisma.memberBankDetails.findUnique({ where: { memberId } });
    await this.writeAudit(memberId, 'BANK_SELF_REVEAL', {});
    return { accountNumber: bank?.accountNumberEncrypted ? decrypt(bank.accountNumberEncrypted) : null };
  }

  // ---- Nominee ----
  async getNominee(memberId: string) {
    const nominee = await this.prisma.nominee.findUnique({ where: { memberId } });
    return {
      fullName: nominee?.fullName ?? null,
      relationship: nominee?.relationship ?? null,
      phone: nominee?.phone ?? null,
      email: nominee?.email ?? null,
    };
  }

  async updateNominee(memberId: string, dto: UpdateNomineeDto) {
    const existing = await this.prisma.nominee.findUnique({ where: { memberId } });
    const data = {
      fullName: dto.fullName ?? existing?.fullName ?? '',
      relationship: dto.relationship ?? existing?.relationship ?? '',
      phone: dto.phone ?? existing?.phone,
      email: dto.email ?? existing?.email,
    };

    await this.prisma.nominee.upsert({
      where: { memberId },
      create: { memberId, ...data },
      update: data,
    });

    await this.writeAudit(memberId, 'NOMINEE_UPDATED', { fieldsChanged: Object.keys(dto) });
    return this.getNominee(memberId);
  }
}
