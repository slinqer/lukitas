# deploy/landing: the landing on Cloudflare Workers

`wrangler.jsonc`: static assets only (no Worker code) from `apps/web/build/client`, the
landing-only build, 404 page, route `wambito.com` (custom domain). Runbook: `docs/deploy/landing.md`.

## Build and deploy

- Build: `pnpm --filter @wambito/web build:landing` (`VITE_LANDING_ONLY=true`, see
  `apps/web/AGENTS.md`).
- Deploy: CI's `deploy-landing` job on push to `main` after `check` + `e2e` runs `wrangler deploy`
  from this folder (so wrangler does not auto-configure the web app). Don't deploy by hand.
- Check locally: `pnpm --filter @wambito/web e2e:landing-only` (and `e2e:landing-only-app`).

## Traps

- Don't rename the Worker in `wrangler.jsonc` (`wambito-landing`): a new name is a new Worker,
  and the old one must then be deleted by hand (`docs/deploy/landing.md`).
- The VPS redirects its landing paths here via `LANDING_URL` (`deploy/personal/routes.caddy`).
