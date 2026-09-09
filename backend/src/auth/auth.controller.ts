import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { MemberLoginDto, AdminLoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication & Access Control (SRS §4.3, §19, §20)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Member Portal Login (Member Code / Email / Phone + Password)' })
  @ApiResponse({ status: 200, description: 'Member login successful; returns Access & Refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid Member credentials or suspended account' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginMember(@Body() dto: MemberLoginDto) {
    return this.authService.loginMember(dto);
  }

  @ApiOperation({ summary: 'Admin Portal Login (Username + Password)' })
  @ApiResponse({ status: 200, description: 'Admin login successful; returns Access & Refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid Admin credentials' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('admin/login')
  async loginAdmin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiResponse({ status: 200, description: 'New Access token issued successfully' })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Get Active User Profile' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @ApiOperation({ summary: 'Change Password (SRS §4.3)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, req.user.userType, dto);
  }
}
