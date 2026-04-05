import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { VerifyPaytabsDto } from './dto/verify-paytabs.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Payment integration flags (public)' })
  @ApiResponse({ status: 200 })
  getConfig() {
    return { paytabs: this.paymentsService.paytabsEnabled() };
  }

  @Public()
  @Post('paytabs/verify')
  @ApiOperation({
    summary: 'Verify PayTabs transaction and confirm reservation',
    description:
      'Call after the customer returns from the PayTabs hosted page. Prefer **tranRef** from the return payload when present.',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 404 })
  async verifyPaytabs(@Body() dto: VerifyPaytabsDto) {
    return this.paymentsService.verifyPaytabsAndConfirm(dto.tranRef, dto.cartId);
  }

  /**
   * PayTabs redirects the browser here (POST) with transaction fields.
   * We verify server-side with PayTabs query API, then send the user to the SPA.
   */
  @Public()
  @Post('paytabs/return')
  @ApiOperation({ summary: 'PayTabs return URL (browser POST)' })
  async paytabsReturn(@Req() req: Request, @Res() res: Response) {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const { tranRef, cartId } = this.paymentsService.parsePaytabsReturnBody(body);
    const frontend = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (!tranRef && !cartId) {
      return res.redirect(302, `${frontend}/booking/payment-complete?error=missing_payment_reference`);
    }

    try {
      const result = await this.paymentsService.verifyPaytabsAndConfirm(tranRef, cartId);
      const ref = encodeURIComponent(result.bookingReference);
      if (result.paid) {
        return res.redirect(302, `${frontend}/booking/payment-complete?ref=${ref}&paid=1`);
      }
      return res.redirect(302, `${frontend}/booking/payment-complete?ref=${ref}&paid=0`);
    } catch (e) {
      const ref = cartId ? encodeURIComponent(cartId) : '';
      const msg = encodeURIComponent(e instanceof Error ? e.message : 'verification_failed');
      const qs = ref ? `ref=${ref}&` : '';
      return res.redirect(302, `${frontend}/booking/payment-complete?${qs}error=${msg}`);
    }
  }

  /** Server-to-server IPN-style callback (configure in PayTabs dashboard / payment request). */
  @Public()
  @Post('paytabs/callback')
  @ApiOperation({ summary: 'PayTabs callback URL (server POST)' })
  async paytabsCallback(@Req() req: Request) {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const { tranRef, cartId } = this.paymentsService.parsePaytabsReturnBody(body);
    await this.paymentsService.confirmFromPaytabsCallback(tranRef, cartId);
    return { received: true };
  }
}
