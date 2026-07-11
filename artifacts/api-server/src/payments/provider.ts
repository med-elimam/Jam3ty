export type CreatePaymentInput = {
  orderId: string;
  clientReference: string;
  amountMru: number;
  currency: "MRU";
  expiresAt: Date;
};

export type CreatePaymentResult = {
  providerReference: string;
  checkoutInstructions: Record<string, unknown>;
};

export type PaymentStatusResult = {
  status: "pending" | "paid" | "failed" | "cancelled" | "expired";
  providerTransactionId?: string;
  amountMru?: number;
  currency?: string;
  occurredAt?: Date;
};

export type VerifiedWebhookEvent = {
  provider: string;
  externalEventId: string;
  eventType: string;
  providerReference: string;
  providerTransactionId: string;
  amountMru: number;
  currency: string;
  merchantId: string;
  status: "paid" | "failed" | "cancelled" | "expired";
  occurredAt: Date;
  payloadHash: string;
  redactedPayload: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(reference: string): Promise<PaymentStatusResult>;
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: Buffer): Promise<VerifiedWebhookEvent>;
  cancelPayment?(reference: string): Promise<void>;
}

export class PaymentProviderConfigurationError extends Error {
  readonly code = "PAYMENT_PROVIDER_NOT_CONFIGURED";

  constructor(message = "A verified payment provider has not been configured") {
    super(message);
    this.name = "PaymentProviderConfigurationError";
  }
}

/**
 * No Mauritanian provider is implemented until official merchant documentation,
 * credentials, signing rules, and amount units are supplied. This deliberate
 * fail-closed adapter prevents a mock or client callback from becoming payment.
 */
export function getPaymentProvider(): PaymentProvider {
  throw new PaymentProviderConfigurationError();
}
