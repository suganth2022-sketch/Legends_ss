import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.userType === 'MEMBER') {
      const member = await this.prisma.member.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          memberCode: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
        },
      });

      if (!member || member.status === 'SUSPENDED') {
        throw new UnauthorizedException('Member account is inactive or suspended');
      }

      return { ...member, userType: 'MEMBER', roleName: 'Member' };
    } else if (payload.userType === 'ADMIN') {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!admin) {
        throw new UnauthorizedException('Admin account not found');
      }

      return {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        userType: 'ADMIN',
        roleName: admin.role.name,
      };
    }

    throw new UnauthorizedException('Invalid user token payload');
  }
}
