# VFS Groups

Production-oriented MERN platform for VFS Groups, built with JavaScript, React + Vite, Express, MongoDB/Mongoose, and Cloudinary-ready provider adapters.

## Workspace

- `client/` — React/Vite web application for public, customer, contractor, and admin experiences.
- `server/` — Express REST API, Mongoose data layer, authentication, RBAC, provider adapters, and jobs.
- `docs/` — architecture, data relationships, API/RBAC design, setup, and phase acceptance records.

The implementation follows the phase plan in [`docs/PHASE_1_ARCHITECTURE.md`](docs/PHASE_1_ARCHITECTURE.md). No secrets belong in source control; copy each `.env.example` to `.env` locally.

## Implemented operational flows

- Public service catalogue, comparison, EMI calculator, enquiry, six-step application, 30-day MongoDB drafts, and referral attribution.
- Application tracking with rate-limited mobile verification and a public status history; any required documents are coordinated in person.
- Cloudinary authenticated document delivery and consent-controlled public gallery media.
- Customer, contractor, and administrator authentication with role-protected dashboards.
- Administrator application operations, document review, business settings, FAQs, legal content, gallery, verified testimonials, and privacy-friendly analytics.
- MongoDB-backed privacy, terms, disclaimer, FAQ, and site settings content.
- Gemini assistant with a deterministic service-knowledge fallback when Gemini is unavailable.

## Local commands

```bash
cd server
npm install
npm run seed
npm run dev
```

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The API uses `http://localhost:5000` and Vite uses `http://localhost:5173` by default.

## Deployment notes

- Render uses [`render.yaml`](render.yaml); its `prestart` seed safely upserts roles, services, initial FAQs, legal pages, and official site settings.
- Configure MongoDB Atlas, Cloudinary, JWT/cookie/encryption secrets, and initial administrator variables in Render.
- `SMS_PROVIDER=mock` with `MOCK_OTP_DISPLAY=true` enables the temporary demo verification code. Switch this off when a real SMS provider is connected.
- `AI_PROVIDER=gemini` requires `GEMINI_API_KEY`; the backend falls back to its approved service knowledge if the provider fails.
- Email remains on the mock provider until an official business email and delivery provider are configured.
