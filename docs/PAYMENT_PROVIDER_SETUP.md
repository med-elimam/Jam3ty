# Payment Provider Setup

No Mauritanian payment provider is currently configured or implemented. This is intentional: official merchant documentation, production credentials, webhook signing rules, merchant-account validation, and MRU amount-unit rules have not been supplied.

The server therefore fails closed. Manual claims, screenshots, typed transaction references, redirects, deep links, and frontend callbacks cannot mark a payment paid or activate a subscription.

## Required onboarding information

- Formally selected provider and official API documentation
- Production and sandbox base URLs
- Merchant identifier and expected merchant-account value in callbacks
- API authentication credentials
- Webhook secret/public key and exact signature canonicalization rules
- Stable event ID and provider transaction ID fields
- Payment status and transition definitions
- MRU amount representation (whole units or provider minor units)
- Settlement, expiry, cancellation, refund, and reconciliation rules

## Environment variable categories

`PAYMENT_PROVIDER`, `PAYMENT_API_BASE_URL`, `PAYMENT_MERCHANT_ID`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_ENVIRONMENT`, and provider-specific API/signature version fields.

Secrets must be server-only. Do not add them to any `VITE_*` or Expo public environment variable.

## Adapter acceptance criteria

An adapter may replace the fail-closed provider only when it can create payments, query status, and verify webhook authenticity from the raw request body according to official documentation. A verified paid event must then enter `activateFromVerifiedPayment`; no HTTP request body from a client or admin is allowed to call that primitive directly.
