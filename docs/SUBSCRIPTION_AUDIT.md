# Subscription and Payment Audit

Date: 2026-07-11

## Executive conclusion

The repository does not currently contain a production-verifiable online payment flow. The existing mobile flow submits a phone number and an optional client-supplied transaction reference to `POST /api/subscriptions/payment`. The server stores that request as a pending row. A super-admin can then call `POST /api/admin/payments/:paymentId/approve`; that handler changes the row to approved and creates an active subscription in separate, non-transactional database operations.

This is a manual claim/review workflow, not verified payment. It must never be represented as “payment completed”, and it must not grant premium access. No provider webhook, signature verification, server-to-server status verification, immutable provider transaction record, or idempotent activation currently exists.

## 1. What already exists

- PostgreSQL access through Drizzle ORM. The schema is the source of truth and is applied with `drizzle-kit push`; the repository intentionally has no SQL migration history.
- Plans with database-owned `priceMru`, `durationDays`, localized names, feature strings, and active state.
- Subscriptions with user, plan, status, source, start, and expiry timestamps.
- A legacy `payments` table for manually submitted payment claims/proofs.
- Activation codes, redemptions, agents, commissions, and a general audit log.
- Authenticated subscription lookup, activation-code redemption, payment-claim submission, and payment-history routes.
- Super-admin pages/routes for plans, subscriptions, manual payment review, agents, and activation codes.
- Mobile plans, activation-code, manual payment-claim, and current-subscription UI in Arabic and French.
- A notifications table and read APIs.
- Generated OpenAPI clients and Zod request/response schemas.
- CORS configuration and JWT authentication/role middleware.

## 2. What is real and functional

- Plan prices are loaded from the database for plan listing.
- `GET /api/subscriptions/me` calculates an active subscription from server-side database state.
- Authentication is enforced on subscription mutation/history endpoints.
- Admin subscription/payment routes are behind the super-admin router guard.
- MRU values are stored as integers.
- Production CORS is deny-by-default when no origins are configured.

These facts do not make the payment flow production-grade: there is currently no machine-verifiable link between money received and an active subscription.

## 3. What is UI-only or manual

- Bankily, Masrvi, and Sedad are displayed as choices, but no provider adapter or official API integration exists.
- The mobile “submit proof” flow only sends user-entered data; it does not initiate or verify a provider payment.
- Admin approval is a human action over unverified client input. It is not a provider-confirmed settlement.
- Plan `features` are descriptive strings. They are not normalized entitlements and are not used by centralized authorization.
- The mobile app can hide/show subscription UI, but there is no central client guard backed by entitlement responses.
- Admin dashboard payment/revenue data reflects legacy rows, not verified settlement events.

## 4. Insecure or incorrect behavior

- `POST /api/subscriptions/payment` trusts the client-provided amount and accepts arbitrary plan references and transaction references.
- `POST /api/admin/payments/:paymentId/approve` marks a claim approved and creates an active subscription without provider verification.
- Payment approval and subscription insertion are separate operations, so partial failure can leave inconsistent state.
- Repeated/concurrent approval is not protected by a database uniqueness constraint or atomic status transition.
- Activation codes are stored in plaintext and redemption is not transactional; concurrent redemptions can exceed `maxUses`.
- Subscription renewal does not extend the existing effective expiry; new rows can overlap.
- Admin can directly patch subscription status/plan/expiry without a dedicated audited grant/revoke service.
- No webhook raw-body handling, signature validation, replay protection, payment-event idempotency, reconciliation, or startup validation exists.
- AI access infers plan capability from plan-name substrings and grants a free quota; other premium APIs are not centrally protected by entitlements.
- There is no immutable subscription-event history or immutable payment-transaction ledger.
- `express-rate-limit` is installed but is not applied to activation or payment endpoints.

## 5. Required database changes

- Add normalized plan entitlements.
- Add provider-backed payment orders with server-owned amount/currency, unique client/provider references, explicit lifecycle state, expiry, and paid timestamp.
- Add immutable payment transactions with unique provider transaction IDs.
- Add idempotent webhook-event storage with payload hash and processing result.
- Add immutable subscription events and explicit activation provenance.
- Add subscription states and timestamps needed for pending, grace period, cancellation, and revocation.
- Add constraints/indexes that prevent duplicate payment activation and code redemption.
- Replace plaintext activation-code storage with hash plus last four characters and batch metadata. Existing rows require a non-destructive migration strategy.

## 6. Missing provider credentials and facts

No official provider contract, API documentation, merchant ID, API base URL, API key, webhook secret, signing algorithm, merchant-account identifier, production callback rules, or settlement terms are present in the repository. The canonical money-unit interpretation (whole MRU versus provider minor units) also needs confirmation from the selected provider contract.

Required configuration categories are: `PAYMENT_PROVIDER`, `PAYMENT_API_BASE_URL`, `PAYMENT_MERCHANT_ID`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`, `PAYMENT_ENVIRONMENT`, and any provider-specific signing/version fields documented by the selected provider.

## 7. What can be completed locally

- Normalized schema, transaction-safe subscription service, entitlement resolution/middleware, provider interface, disabled/unconfigured production adapter, webhook processing framework, idempotency, audit records, rate limits, API contracts, UI states, and deterministic tests.
- A development-only test provider can exercise the pipeline if it is impossible to enable in production and cannot be selected accidentally there.
- Legacy manual claims can remain visible for investigation while being prevented from activating access.

## 8. What requires merchant onboarding or production keys

- Creating a real checkout/payment request.
- Authenticating Bankily, Masrvi, Sedad, or aggregator requests.
- Verifying real webhook signatures and merchant accounts.
- Server-to-server reconciliation, refunds, and cancellation.
- Confirming settlement behavior, production endpoints, supported status transitions, and amount units.

Until those items are supplied, production payment initialization must fail with an explicit configuration error. A redirect, deep link, screenshot, client callback, typed transaction reference, mock result, or admin click must never mark a payment order paid or grant an entitlement.

## Required activation invariant

Premium backend access is permitted only after this committed chain exists:

1. A provider event or server-to-server reconciliation result is cryptographically/authentically verified.
2. The matching server-created payment order is atomically transitioned to `paid` exactly once.
3. An immutable payment transaction is recorded with amount and currency validated against the order.
4. The subscription is activated or extended in the same database transaction.
5. Subscription events and entitlements resolve from committed database state.
6. Premium APIs authorize the requested entitlement on every request.

Frontend success state is never an authorization source.
