# VNDR Hub on Proxmox

Use a dedicated Debian 12 or Ubuntu 24.04 virtual machine. Allocate at least 2 CPU cores, 4 GB RAM, and 40 GB storage. Install Docker Engine, the Docker Compose plugin, Git, curl, and OpenSSL inside the VM.

## First deployment

1. Point the Cloudflare `app` DNS record to the VM public IP and enable the proxy.
2. Set Cloudflare SSL mode to Full strict.
3. Forward inbound TCP ports 80 and 443 from the router to the VM. Do not expose PostgreSQL port 5432.
4. Clone the private VNDR Hub repository into `/opt/vndrhub`.
5. Run `chmod +x scripts/*.sh`.
6. Run `./scripts/prepare-proxmox.sh YOUR_ADMIN_EMAIL`.
7. Edit `.env.production` directly on the server. Leave the first credential in an optional integration group empty until that integration is ready.
8. Run `./scripts/deploy-production.sh`.
9. Confirm `https://app.vndrhub.ca/api/health/ready` returns `{"status":"ready"}`.

## Backups

Run `./scripts/backup-production.sh` from cron every night. Copy the resulting encrypted backup off the VM. A backup stored only on the same Proxmox host is not sufficient. Test `restore-production.sh` against a disposable VM before relying on it.

## Updates and rollback

Before every update, create a backup. Pull the reviewed Git commit and run `deploy-production.sh`. To roll back application code, check out the previous known good commit and redeploy. Database migrations require a tested database restore when they are not backward compatible.

## Cloudflare

Keep the DNS proxy enabled, use Full strict TLS, enable Always Use HTTPS, and configure a WAF rate limit for `/api/auth/*`. Caddy obtains and renews the origin certificate and sends strict security headers.
