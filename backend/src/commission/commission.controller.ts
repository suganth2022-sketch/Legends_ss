import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommissionService } from './commission.service';
import { SetCommissionRateDto } from './dto/set-commission-rate.dto';

@ApiTags('Commission Engine (SRS §10)')
@Controller('commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  private assertAdmin(req: any) {
    if (req.user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @ApiOperation({ summary: 'List currently active commission rates (Admin only)' })
  @Get('rules')
  async listRules(@Request() req: any) {
    this.assertAdmin(req);
    return this.commissionService.listActiveRates();
  }

  @ApiOperation({
    summary:
      'Set a new versioned commission rate for a level (Admin only). Closes out the prior active rule rather than overwriting it, so historical ledger rows stay calculable exactly as paid.',
  })
  @Post('rules')
  async setRule(@Body() dto: SetCommissionRateDto, @Request() req: any) {
    this.assertAdmin(req);
    return this.commissionService.setRate(dto.level, dto.percentage);
  }
}
