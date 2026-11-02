# deploy/personal: the personal install (production VPS, or a Mac at home)

Docker compose stack: postgres, a one-shot `migrate`, api, mcp, web (Caddy serving the built web
app and proxying), optional cloudflared. Full runbook: `README.md` here; short version
`docs/deploy/personal.md`; settings `.env.example`.

## Two ways of serving (`COMPOSE_FILE` in `.env` picks)

- Tunnel (default, home Mac): `docker-compose.yml` + `Caddyfile` (plain HTTP, TLS at Cloudflare,
  client IP from `Cf-Connecting-Ip`) + `cloudflared.yml`.
- Direct (the VPS, `app.wambito.com`): `COMPOSE_FILE=docker-compose.yml:docker-compose.direct.yml`,
  `Caddyfile.direct` (Let's Encrypt, HSTS, client IP = TCP peer), no cloudflared.
- Both import `routes.caddy`: `/mcp` → mcp, `/api/*` → api, `/.well-known/…`, assets, pages, the
  landing paths redirect (302) to `LANDING_URL`.

## Scripts

- `up.sh` (build, migrate, start; `--no-tunnel`, `--skip-web`), `update.sh`, `smoke.sh`.
- `auto-deploy.sh` (timer every 5 min): deploys `main` once CI's `check` and `e2e` passed, backup
  first, rolls back on a failed smoke test. Installed by `install-auto-deploy.sh`.
- `backup.sh` / `restore.sh` / `install-backup.sh` / `uninstall-backup.sh`: age-encrypted dumps to
  Cloudflare R2, 14-day retention. `lib.sh`: shared helpers.
- Units `lukitas-*.service|timer` (Linux), `com.lukitas.backup.plist` (macOS).

## Test (CI runs all five)

- `./test-retention.sh`, `./test-r2.sh`, `./test-auto-deploy.sh`, `./test-caddy.sh`,
  `./test-compose-files.sh` (from this folder).

## Traps

- Caddy `vars` ordering: set `client_ip` with plain `vars` lines (with matchers that exclude each
  other) before `import routes.caddy`; a `route { }` block would run after the handle blocks, so
  the routes would see no `client_ip`.
- `COMPOSE_FILE` lives in `.env`: run compose from this folder so it applies. `./up.sh --skip-web`
  does not recreate containers after a compose-file change.
- The API trusts exactly one X-Forwarded-For hop, set by Caddy (`docs/deploy/api.md`).
- Migrations run in `migrate` as the owner; the api runs as `lukas_app` (RLS).
- Whole folder is part 2b: compose project `lukitas-personal`, volumes, units, plist, dumps
  `lukitas-*.dump`, bucket `lukitas-backups`, `~/lukitas`, user-facing "Lukitas" texts. Don't
  rename them here; 2b rewrites these files.
- Never read `.env` (here or on the VPS) or `~/.cloudflared/*.json`: secrets. Use `.env.example`.
- Merging to `main` deploys production by itself.
