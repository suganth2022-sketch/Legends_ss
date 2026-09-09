import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { MemberLoginDto, AdminLoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload, UserType } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 1. Member Login (by Member ID e.g. A000001, Email, or Phone)
  async loginMember(dto: MemberLoginDto) {
    const member = await this.prisma.member.findFirst({
      where: {
        OR: [
          { memberCode: dto.identifier.toUpperCase() },
          { email: dto.identifier.toLowerCase() },
          { phone: dto.identifier },
        ],
      },
    });

    if (!member) {
      throw new UnauthorizedException('Invalid Member credentials');
    }

    if (member.status === 'SUSPENDED') {
      throw new UnauthorizedException('Member account is suspended');
    }

    const isPasswordValid = await argon2.verify(
      member.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Member credentials');
    }

    const payload: JwtPayload = {
      sub: member.id,
      codeOrUsername: member.memberCode,
      email: member.email,
      userType: 'MEMBER',
      roleName: 'Member',
    };

    const tokens = await this.generateTokens(payload);

    return {
      user: {
        id: member.id,
        memberCode: member.memberCode,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        status: member.status,
        roleName: 'Member',
      },
      ...tokens,
    };
  }

  // 2. Admin Login (by Admin Username)
  async loginAdmin(dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
      include: { role: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid Admin credentials');
    }

    const isPasswordValid = await argon2.verify(
      admin.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid Admin credentials');
    }

    const payload: JwtPayload = {
      sub: admin.id,
      codeOrUsername: admin.username,
      email: admin.email,
      userType: 'ADMIN',
      roleName: admin.role.name,
    };

    const tokens = await this.generateTokens(payload);

    return {
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        roleName: admin.role.name,
      },
      ...tokens,
    };
  }

  // 3. Token Generation (Access JWT + Refresh JWT)
  async generateTokens(payload: JwtPayload) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn:
        this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  // 4. Token Refresh
  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      const newPayload: JwtPayload = {
        sub: payload.sub,
        codeOrUsername: payload.codeOrUsername,
        email: payload.email,
        userType: payload.userType,
        roleName: payload.roleName,
      };

      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // 5. Change Password (SRS §4.3)
  async changePassword(
    userId: string,
    userType: UserType,
    dto: ChangePasswordDto,
  ) {
    if (userType === 'MEMBER') {
      const member = await this.prisma.member.findUnique({
        where: { id: userId },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      const isCurrentPasswordValid = await argon2.verify(
        member.passwordHash,
        dto.oldPassword,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      const newHash = await argon2.hash(dto.newPassword);
      await this.prisma.member.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });
    } else {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: userId },
      });

      if (!admin) {
        throw new NotFoundException('Admin user not found');
      }

      const isCurrentPasswordValid = await argon2.verify(
        admin.passwordHash,
        dto.oldPassword,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      const newHash = await argon2.hash(dto.newPassword);
      await this.prisma.adminUser.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });
    }

    return { message: 'Password updated successfully' };
  }
}
