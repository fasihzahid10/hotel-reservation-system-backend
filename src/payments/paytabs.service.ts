import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PaytabsPaymentRequestInput = {
  cartId: string;
  cartDescription: string;
  cartAmount: number;
  cartCurrency: string;
  returnUrl: string;
  callbackUrl?: string;
  customer?: {
    name: string;
    email: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    ip?: string;
  };
};

export type PaytabsTransactionView = {
  tranRef: string;
  cartId: string;
  cartAmount: string;
  cartCurrency: string;
  authorized: boolean;
  paymentMethod?: string;
};

@Injectable()
export class PaytabsService {
  private readonly logger = new Logger(PaytabsService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const key = this.config.get<string>('PAYTABS_SERVER_KEY') ?? '';
    const profile = this.config.get<string>('PAYTABS_PROFILE_ID') ?? '';
    const apiPublic = this.config.get<string>('API_PUBLIC_URL') ?? '';
    return Boolean(key && profile && apiPublic);
  }

  private baseUrl(): string {
    return (this.config.get<string>('PAYTABS_API_BASE') ?? 'https://secure.paytabs.sa').replace(/\/$/, '');
  }

  private headers(): HeadersInit {
    const serverKey = this.config.get<string>('PAYTABS_SERVER_KEY') ?? '';
    return {
      'Content-Type': 'application/json',
      authorization: serverKey,
    };
  }

  private profileIdNum(): number {
    const raw = this.config.get<string>('PAYTABS_PROFILE_ID') ?? '';
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error('PAYTABS_PROFILE_ID must be a number.');
    }
    return n;
  }

  async createHostedPaymentPage(input: PaytabsPaymentRequestInput): Promise<{ redirectUrl: string }> {
    const payload: Record<string, unknown> = {
      profile_id: this.profileIdNum(),
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: input.cartId,
      cart_description: input.cartDescription,
      cart_currency: input.cartCurrency,
      cart_amount: input.cartAmount,
      return: input.returnUrl,
    };

    if (input.callbackUrl) {
      payload.callback = input.callbackUrl;
    }

    if (input.customer) {
      payload.customer_details = {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone ?? '',
        street1: input.customer.street ?? 'N/A',
        city: input.customer.city ?? 'Riyadh',
        state: input.customer.state ?? 'Riyadh',
        country: input.customer.country ?? 'SA',
        ip: input.customer.ip ?? '127.0.0.1',
      };
    }

    const res = await fetch(`${this.baseUrl()}/payment/request`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      const msg =
        typeof data.message === 'string'
          ? data.message
          : typeof data.msg === 'string'
            ? data.msg
            : `PayTabs payment/request failed (${res.status})`;
      this.logger.warn(`PayTabs payment/request error: ${msg}`);
      throw new Error(msg);
    }

    const redirectUrl = data.redirect_url;
    if (typeof redirectUrl !== 'string' || !redirectUrl) {
      this.logger.warn(`PayTabs unexpected response: ${JSON.stringify(data)}`);
      throw new Error('PayTabs did not return redirect_url.');
    }

    return { redirectUrl };
  }

  async queryTransaction(tranRef?: string, cartId?: string): Promise<PaytabsTransactionView | null> {
    if (!tranRef && !cartId) {
      return null;
    }
    if (tranRef && cartId) {
      throw new Error('Query PayTabs with either tranRef or cartId, not both.');
    }

    const body: Record<string, unknown> = {
      profile_id: this.profileIdNum(),
    };
    if (tranRef) {
      body.tran_ref = tranRef;
    } else {
      body.cart_id = cartId;
    }

    const res = await fetch(`${this.baseUrl()}/payment/query`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      this.logger.warn(`PayTabs payment/query failed: ${JSON.stringify(data)}`);
      return null;
    }

    const rows = this.normalizeQueryRows(data);
    if (rows.length === 0) {
      return null;
    }

    const statusOf = (r: Record<string, unknown>) => {
      const pr = r.payment_result;
      if (!pr || typeof pr !== 'object') {
        return '';
      }
      const s = (pr as Record<string, unknown>).response_status;
      return typeof s === 'string' ? s : '';
    };

    const pick =
      rows.find((r) => statusOf(r) === 'A') ?? rows.find((r) => statusOf(r) === 'H') ?? rows[0];

    return this.rowToView(pick);
  }

  private normalizeQueryRows(data: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(data)) {
      return data.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>;
    }
    if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>;
      if (Array.isArray(o.transactions)) {
        return o.transactions.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>;
      }
      if (typeof o.tran_ref === 'string' || typeof o.cart_id === 'string') {
        return [o];
      }
    }
    return [];
  }

  private rowToView(row: Record<string, unknown>): PaytabsTransactionView {
    const paymentResult = row.payment_result as Record<string, unknown> | undefined;
    const paymentInfo = row.payment_info as Record<string, unknown> | undefined;
    const status = typeof paymentResult?.response_status === 'string' ? paymentResult.response_status : '';
    const authorized = status === 'A' || status === 'H';

    return {
      tranRef: String(row.tran_ref ?? ''),
      cartId: String(row.cart_id ?? ''),
      cartAmount: String(row.cart_amount ?? ''),
      cartCurrency: String(row.cart_currency ?? ''),
      authorized,
      paymentMethod: typeof paymentInfo?.payment_method === 'string' ? paymentInfo.payment_method : undefined,
    };
  }
}
