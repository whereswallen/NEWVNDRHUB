# Staging security verification

Do not run these steps on production first.

1. Create a separate Cloudflare Tunnel hostname such as `staging.vndrhub.ca`.
2. Deploy from the security pull-request branch to a new Proxmox VM or isolated VM snapshot.
3. Run `scripts/prepare-proxmox.sh` with a non-production administrator email.
4. In `.env.production`, set `DEPLOYMENT_ENV=staging`, the staging hostnames, and `REQUIRE_PLATFORM_ADMIN_MFA=false` initially.
5. Deploy, create the platform-admin account, visit `/platform`, and complete TOTP enrollment with recovery codes stored offline.
6. Change `REQUIRE_PLATFORM_ADMIN_MFA=true` and redeploy. Confirm `/platform` rejects an unenrolled admin account.
7. Create two test organizations with distinct stores, vendors, products, and sales.
8. Configure Age and Restic, run an encrypted backup, then verify it with `scripts/verify-backup.sh`.
9. Set `SECURITY_ENFORCE_RLS=true` and run `node scripts/enable-rls.mjs` with the owner database URL.
10. Run `scripts/verify-staging-security.sh` using the app database URL.
11. Perform manual role tests: owner, manager, staff, vendor, suspended organization, expired trial, and platform admin.

If any check fails, restore the staging database or rebuild the staging VM. Do not enable RLS in production until this checklist succeeds.
