# Phase 2 — Foundation Completion Record

Status: complete for the scoped foundation; Phase 3 public experience has started.

## Implemented modules

- JavaScript-only npm workspace with independently deployable Vite client and Express server.
- Netlify SPA redirects/build configuration and Render API/health configuration.
- Browser-safe and server-only environment templates with no committed credentials.
- Premium responsive design tokens, global layout, supplied VFS Groups brand asset, keyboard focus, skip navigation, reduced-motion handling, loading/error/empty states, and lazy route bundles.
- Validated server configuration, Atlas-ready Mongoose connection, structured request IDs, CORS allowlist, Helmet, JSON limits, general and route-specific rate limits, consistent errors, and graceful shutdown.
- Identity/RBAC foundation: users, roles, permissions, customer/contractor profiles, refresh sessions, access/refresh cookies, CSRF primitive, password hashing, permission middleware, login audit events, and transaction-backed customer registration.
- Domain foundation: counters/public identifiers, published services, applications, status history, contact/callback queues, and immutable audit records with required indexes.
- Provider boundary: a deterministic development mock for email, a backend-only Gemini adapter, and Cloudinary storage that activates only when its three server secrets exist. SMS, payment processing, and WhatsApp Business integrations are intentionally out of scope; WhatsApp is a configurable contact link only.
- Idempotent seed command for 29 permissions, nine system roles, role mappings, and all 14 required services. It seeds no testimonials, metrics, lender relationships, approvals, or financial performance.

## Database changes

Phase 2 creates model definitions for `counters`, `permissions`, `roles`, `users`, `customers`, `contractors`, `refresh_tokens`, `services`, `applications`, `application_status_histories`, `contact_enquiries`, `callback_requests`, and `audit_logs`. Reference data is written only by `npm run seed --prefix server` after `MONGODB_URI` is configured.

Application submission uses a transaction so generated IDs, the application, initial public status history, referral lock, and audit record cannot partially commit. This requires MongoDB Atlas or another transaction-capable replica set.

## API routes

- `GET /api/v1/health` and `GET /api/v1/ready`
- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/customer/register`, `/login`, `/refresh`, `/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/services` and `/services/:slug`
- `POST /api/v1/contact/enquiries` and `/contact/callbacks`
- `POST /api/v1/tools/emi`
- `POST /api/v1/applications/public/submit`

## Security review

- Backend authorization is distinct from frontend navigation.
- Password hashes and internal status notes are excluded by schema selection/serialization.
- Refresh tokens are stored as SHA-256 hashes, rotate on use, expire automatically, and revoke the token family when reuse is detected.
- Public forms are validated, rate limited, size limited, and use honeypot fields; tracking/OTP and Turnstile remain Phase 3 work.
- Referral codes resolve only to approved contractors and become immutable at submission; later admin correction must be an audited permission-controlled transaction.
- Cloudinary secrets never enter `VITE_` variables; signed URLs are bounded to 15 minutes and default to five.
- Production startup fails if core secrets or MongoDB are absent. External provider production requirements will be tightened as each provider becomes operational.

## Verification

- Client ESLint: pass.
- Server ESLint: pass.
- Client unit tests: pass.
- API foundation integration tests: pass.
- Vite production build: pass with route-level code splitting.
- JavaScript-only `.ts`/`.tsx` scan: pass.
- npm audit: client 0 vulnerabilities; server 0 vulnerabilities after upgrading bcrypt and Multer.

## Phase 3 started

The public shell, homepage, published service listing/filter, all reusable service-detail routes, backend EMI calculation/export, contact enquiry form, customer registration/sign-in, and multi-step public application submission are operational against the API. Remaining Phase 3 scope includes the guided eligibility API, verified OTP tracking, callback UI, CMS-driven general pages/FAQ/gallery, in-person document coordination, technical SEO artifacts, and the full responsive/accessibility acceptance review.
