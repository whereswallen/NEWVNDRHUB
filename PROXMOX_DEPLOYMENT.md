# VNDR Hub on Proxmox

Use a dedicated Debian 12 or Ubuntu 24.04 virtual machine. Allocate at least 2 CPU cores, 4 GB RAM, and 40 GB storage. Install Docker Engine, the Docker Compose plugin, Git, curl, and OpenSSL inside the VM.

## First deployment

1. Create a Cloudflare Tunnel and copy `cloudflared/config.yml.example` to `/etc/cloudflared/config.yml`. Route `app.vndrhub.ca` to the tunnel. Do not create router port forwards for this VM.
2. Keep Cloudflare SSL mode at Full strict and enable the proxy.
3. Allow no inbound Internet ports to the VM. Docker binds the origin only to loopback; PostgreSQL is never exposed.
4. Clone the private VNDR Hub repository into `/opt/vndrhub`.
5. Run `chmod +x scripts/*.sh`.
6. Run `./scripts/prepare-proxmox.sh YOUR_ADMIN_EMAIL`.
7. Edit `.env.production` directly on the server. Leave the first credential in an optional integration group empty until that integration is ready.
8. Run `./scripts/security-readiness.sh`, then `./scripts/deploy-production.sh`.
9. Confirm `https://app.vndrhub.ca/api/health/ready` returns `{"status":"ready"}` and run `./scripts/verify-backup.sh` against a newly created encrypted backup.

## Backups

Run `./scripts/backup-production.sh` from cron every night with Restic configured for off-site storage. A backup stored only on the same Proxmox host is not sufficient. Test `./scripts/verify-backup.sh backups/FILE.dump.age` and a full restore against a disposable VM before relying on it.

## Updates and rollback

Before every update, create a backup. Pull the reviewed Git commit and run `deploy-production.sh`. To roll back application code, check out the previous known good commit and redeploy. Database migrations require a tested database restore when they are not backward compatible.

## Cloudflare

Keep the DNS proxy enabled, use Full strict TLS, enable Always Use HTTPS, and configure Cloudflare WAF rate limits for `/api/auth/*`, `/sign-up`, and `/forgot-password`. The Tunnel is the only permitted path to the origin.
