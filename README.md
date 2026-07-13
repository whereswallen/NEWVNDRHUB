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
- Owner, manager, and vendor product creation within their permitted scope
- Append-only stock receipts, corrections, damage, returns, and removals
- Configurable storefront GST, HST, PST, and QST components
- Built-in multi-vendor POS cart with cash, card, and external payment recording
- Atomic checkout with stock locks, oversell protection, idempotency, tax breakdowns, and commission snapshots
- Searchable sales history and printable transaction receipts
- Partial and full refunds with optional inventory restocking
- Exact commission, tax, and vendor-net reversals for refunded items
- Monthly owner payout summaries with sales, refunds, commission, rent, and tax
- Isolated vendor statements with sales history and estimated payout
- Immutable finalized payout snapshots by vendor and month
- Manual, e-transfer, cheque, and Stripe payment-status recording
- Payment references, notes, paid timestamps, and audit events
- Store-scoped payout access for managers
- Vendor payout history and UTF-8 CSV exports
- Stripe Checkout for Standard, Unlimited, and additional storefront subscriptions
- Stripe customer billing portal
- Signed, idempotent Stripe subscription webhooks
- Server-side trial and billing-status enforcement for protected mutations
- PostgreSQL migration in `drizzle/`
- Core store, vendor, rental space, inventory, sale, commission, and audit models

Generate `BETTER_AUTH_SECRET` with at least 32 random characters. Set `BETTER_AUTH_URL` to the exact application origin, such as `https://app.vndrhub.ca`.

Run `npm run db:generate` only after changing the schema, then review the generated SQL before migrating.

Never commit secrets. Production requires HTTPS, managed backups, tested restoration, monitoring, email delivery, Stripe webhook verification, and a security review.

Configure the Stripe webhook endpoint as `/api/stripe/webhook` and subscribe it to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Create three recurring CAD prices and place their IDs in the matching environment variables.

## Production operations

`docker-compose.production.yml` binds the application only to localhost so a TLS reverse proxy can safely expose it. Keep `secrets/`, `.env.production`, and database dumps outside source control. Monitor `/api/health/live` for process health and `/api/health/ready` for database readiness.

Run `scripts/backup-database.sh` on a schedule with encrypted off-server storage. Test restoration regularly with `scripts/restore-database.sh` against a disposable database before relying on any backup.
