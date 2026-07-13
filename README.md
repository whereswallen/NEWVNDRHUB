# VNDR Hub production application

Self-hostable consignment retail SaaS. The existing Sites application remains the visual workflow reference while this repository becomes the transactional production system.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Run `docker compose up -d postgres`.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Run `npm run dev`.

Never commit secrets. Production requires HTTPS, managed backups, tested restoration, monitoring, email delivery, Stripe webhook verification, and a security review.
