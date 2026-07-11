# Premium Endpoint Audit

Date: 2026-07-11

The backend is authoritative. A mobile route guard, hidden button, cached subscription, or pending payment order does not authorize access.

## Premium endpoints

| Endpoint | Entitlement | Enforcement |
|---|---|---|
| `POST /api/ai/chat` | `ai.use` | `requireAuth`, `requireEntitlement` |
| `GET /api/files` | `files.view` | `requireAuth`, `requireEntitlement` |
| `GET /api/files/:fileId` | `files.view` | `requireAuth`, `requireEntitlement` |
| `POST /api/files/:fileId/view` | `files.view` | `requireAuth`, `requireEntitlement` |
| `GET /api/exams` | `exams.view` | `requireAuth`, `requireEntitlement` |
| `GET /api/assignments` | `assignments.view` | `requireAuth`, `requireEntitlement` |
| `GET /api/assignments/:assignmentId` | `assignments.view` | `requireAuth`, `requireEntitlement` |

`POST /api/files/:fileId/favorite` remains authenticated-free because it only stores a preference and does not return premium content.

## Subscription and payment endpoints

Plan listing is public. Subscription state, payment-order creation, evidence upload/submission, and payment history require authentication. Manual review and evidence preview require `payments.manual.review`; settlement additionally requires `payments.manual.verify`. The current permission map grants these only to `super_admin`.

## Administrative endpoints

All `/api/admin/*` routes remain authenticated and `super_admin`-only at the router boundary. Manual payment operations add explicit permissions so later role expansion cannot accidentally inherit settlement authority.

## Remaining content-delivery risk

Database/API metadata is protected, but any third-party or publicly-addressable `fileUrl` can still be fetched outside the API if its storage origin is public. Production premium documents, audio, video, and offline downloads require private object storage plus short-lived backend-authorized signed URLs before those media-specific entitlements can be considered fully enforced.
