import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audited } from '../audit/audited.decorator';
import { RegisterMemberDto } from './dto/register-member.dto';
import { MembersService } from './members.service';

@ApiTags('Members (SRS §4)')
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @ApiOperation({ summary: 'Register a new member under a sponsor (referral link)' })
  @ApiResponse({ status: 201, description: 'Member created; returns Member Code and one-time initial password' })
  @ApiResponse({ status: 400, description: 'Invalid or inactive sponsor code' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterMemberDto) {
    return this.membersService.register(dto);
  }

  @ApiOperation({ summary: "Get the authenticated Member's own identity record (Members only — Admins should use GET /auth/me)" })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    if (req.user.userType !== 'MEMBER') {
      throw new ForbiddenException('This endpoint is for Members; Admins should use GET /auth/me');
    }
    return this.membersService.getMe(req.user.id);
  }

  @ApiOperation({ summary: 'Get a member by id (Admin only)' })
  @Audited('ADMIN_VIEWED_MEMBER_DETAIL', 'Member')
  @UseInterceptors(AuditInterceptor)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string, @Request() req: any) {
    if (req.user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return this.membersService.getById(id);
  }
}
