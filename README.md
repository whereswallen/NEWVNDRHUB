# VNDR Hub production application

Self-hostable consignment retail SaaS. The existing Sites application remains the visual workflow reference while this repository becomes the transactional production system.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Run `docker compose up -d postgres`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.

## Implemented foundation

- Email and password authentication with secure database sessions
- Owner signup and sign in
- Transactional organization and first storefront onboarding
- 14 day trial with Standard or Unlimited plan selection
- Protected application workspace and tenant membership checks
- Global VNDR Hub platform administrator registry and customer overview
- Store-scoped manager and staff invitations with hashed, expiring tokens
- Role-specific navigation that keeps POS away from vendor accounts
- Employee acceptance flow locked to the invited email address
- Multi-storefront setup with the $20 CAD additional-location calculation
- Rentable spaces with size, dimensions, and configurable monthly rates
- Vendor creation with concurrency-safe plan-limit enforcement
- Historical rental assignments that snapshot the agreed monthly rent
- Email-locked vendor invitations and an isolated vendor portal
- PostgreSQL migration in `drizzle/`
- Core store, vendor, rental space, inventory, sale, commission, and audit models

Generate `BETTER_AUTH_SECRET` with at least 32 random characters. Set `BETTER_AUTH_URL` to the exact application origin, such as `https://app.vndrhub.ca`.

Run `npm run db:generate` only after changing the schema, then review the generated SQL before migrating.

Never commit secrets. Production requires HTTPS, managed backups, tested restoration, monitoring, email delivery, Stripe webhook verification, and a security review.
