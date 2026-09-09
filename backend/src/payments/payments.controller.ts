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
import { ManualPaymentDto } from './dto/manual-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments (SRS §7, §9)')
@Controller('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({
    summary:
      'Record a manual payment (Admin only). Locks the recurring plan amount on first payment; validates every later payment against it.',
  })
  @Post('manual')
  async recordManual(@Body() dto: ManualPaymentDto, @Request() req: any) {
    if (req.user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return this.paymentsService.recordManualPayment(dto, req.user.id);
  }

  @ApiOperation({ summary: "Get the authenticated Member's own payment history and locked plan amount" })
  @Get('me')
  async getMyPayments(@Request() req: any) {
    if (req.user.userType !== 'MEMBER') {
      throw new ForbiddenException('This endpoint is for Members');
    }
    return this.paymentsService.getMyPayments(req.user.id);
  }
}
