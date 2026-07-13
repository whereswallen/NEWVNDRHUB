# Security operations runbook

## Before staging

1. Create separate `postgres_owner_password`, `postgres_app_password`, and `postgres_backup_password` secrets.
2. Configure a Cloudflare Tunnel. Do not open inbound router ports to the VM.
3. Configure an offline Age recipient and a Restic off-site repository.
4. Enrol the platform administrator in Better Auth TOTP, then set `REQUIRE_PLATFORM_ADMIN_MFA=true`.
5. Run a staging restore test and retain evidence of the result.

## Enforcing row-level security

RLS policies are installed by migration but intentionally remain disabled until staging uses tenant context for every protected database query. After the isolation suite passes, run:

```sh
SECURITY_ENFORCE_RLS=true DATABASE_OWNER_URL='postgres://...' node scripts/enable-rls.mjs
```

This operation is intentionally irreversible without an owner-level database change. It must be performed only against staging first.

## Daily checks

- Check `/api/health/live` and `/api/health/ready` through an external monitor.
- Confirm the encrypted Restic backup completed.
- Review Cloudflare WAF and authentication rate-limit events.
- Review platform-admin, payout, refund, and integration audit events.

## Incident response

1. Disable the affected user or organization.
2. Rotate Better Auth, database, Stripe, Square, Resend, and integration-encryption credentials as applicable.
3. Preserve audit logs and Cloudflare events.
4. Restore only to an isolated environment while investigating.
5. Record the incident, impact, corrective action, and customer notifications.
