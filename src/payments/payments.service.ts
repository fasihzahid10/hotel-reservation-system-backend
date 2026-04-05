import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaytabsService } from './paytabs.service';

function readBodyString(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = body[key];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return undefined;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paytabs: PaytabsService,
  ) {}

  paytabsEnabled(): boolean {
    return this.paytabs.isConfigured();
  }

  /**
   * Confirms payment with PayTabs and marks the reservation CONFIRMED when authorized.
   */
  async verifyPaytabsAndConfirm(tranRef?: string, cartId?: string) {
    if (!this.paytabs.isConfigured()) {
      throw new BadRequestException('PayTabs is not configured on this server.');
    }
    if (!tranRef && !cartId) {
      throw new BadRequestException('Provide tranRef or cartId (booking reference).');
    }

    const view = await this.paytabs.queryTransaction(tranRef, cartId);
    if (!view || !view.cartId) {
      throw new NotFoundException('No PayTabs transaction found for this reference.');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { bookingReference: view.cartId },
    });

    if (!reservation) {
      throw new NotFoundException(`No reservation found for cart_id "${view.cartId}".`);
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      return {
        reservationId: reservation.id,
        bookingReference: reservation.bookingReference,
        paid: true,
        alreadyConfirmed: true,
      };
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        `Reservation ${reservation.bookingReference} cannot be paid (status ${reservation.status}).`,
      );
    }

    if (!view.authorized) {
      return {
        reservationId: reservation.id,
        bookingReference: reservation.bookingReference,
        paid: false,
        tranRef: view.tranRef || undefined,
      };
    }

    const expected = Number(reservation.totalAmount);
    const charged = Number.parseFloat(view.cartAmount);
    if (Number.isFinite(charged) && Number.isFinite(expected) && Math.abs(charged - expected) > 0.02) {
      this.logger.warn(
        `PayTabs amount mismatch for ${view.cartId}: expected ${expected}, got ${charged}. Not auto-confirming.`,
      );
      throw new BadRequestException('Payment amount does not match reservation total.');
    }

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CONFIRMED,
        paytabsTranRef: view.tranRef || null,
      },
    });

    return {
      reservationId: reservation.id,
      bookingReference: reservation.bookingReference,
      paid: true,
      tranRef: view.tranRef,
      paymentMethod: view.paymentMethod,
      alreadyConfirmed: false,
    };
  }

  parsePaytabsReturnBody(body: Record<string, unknown>) {
    const tranRef = readBodyString(body, ['tranRef', 'tran_ref']);
    const cartId = readBodyString(body, ['cartId', 'cart_id']);
    const respStatus = readBodyString(body, ['respStatus', 'resp_status']);
    return { tranRef, cartId, respStatus };
  }

  /** Used for PayTabs server callbacks; logs and swallows errors so the gateway always gets 200. */
  async confirmFromPaytabsCallback(tranRef?: string, cartId?: string): Promise<void> {
    if (!tranRef && !cartId) {
      return;
    }
    try {
      await this.verifyPaytabsAndConfirm(tranRef, cartId);
    } catch (e) {
      this.logger.warn(`PayTabs callback verify failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
