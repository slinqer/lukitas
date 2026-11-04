# apps/api: the HTTP API (`@wambito/api`)

Hono + Better Auth + Drizzle (`@wambito/db`), OpenAPI document "Wambito API". Every client
(web, mobile, MCP) goes through it.

## Entry points

- `src/server.ts` starts it; `src/app.ts` builds the app (routes, OpenAPI).
- `src/config.ts`: zod env schema (`WAMBITO_VERSION` included); `.env.example` at the repo root.
- `src/auth.ts`: Better Auth: email OTP + magic link, anonymous guests, passkeys (`rpName`
  "Wambito", rpID = WEB_URL host), jwt + oauthProvider for the MCP.
- `src/http/session.ts`: `requireUser` (cookie or bearer session, or an OAuth JWT with `aud` =
  MCP_URL). `src/http/scopes.ts`: OAuth scopes (`finance:read`, …), enforced here, not in the MCP.
- `src/http/client-headers.ts`: `clientHeader`. `src/routes/*.ts`: the routes.
  `src/services/`: domain services. `src/emails/sign-in.ts`: sign-in mail copy (es/en/it/pt).
- `POST /v1/captures` (`src/routes/captures.ts`, `src/services/captures.ts`): saves a bank-notification
  capture to review; 10-minute duplicate merge, merchant → category memory, `system_key = other`
  fallback categories; the Idempotency-Key is required.
- `src/scripts/seed.ts`: creates `dev@wambito.test`.

## Talks to

- Mounted under API_URL's path (`/api` behind the web origin / Caddy, so auth cookies are
  first-party). Web and mobile call it; the MCP forwards the assistant's OAuth token.
- Client headers `x-wambito-{locale,next,timezone,client,background}`, always read via
  `clientHeader`, never `headers.get("x-…")`. A timezone header means "from the device"; `background: 1` reads the
  session with `disableRefresh` (not counted as activity).
- DB: connects as the runtime role (RLS); migrations run as admin (`packages/db`).

## Run and test (repo root)

- Services: `docker compose up -d postgres mailpit`; then `pnpm --filter @wambito/api dev`,
  seed with `pnpm --filter @wambito/api seed`. Mail lands in Mailpit (http://localhost:8025).
- Tests: `pnpm vitest run apps/api`, one file `pnpm vitest run apps/api/test/auth.test.ts`.
  Each file starts a Postgres testcontainer via `test/harness.ts` (`createTestApp`): Docker must
  run, or set `WAMBITO_TEST_DB=local`.
- After changing a route or schema, regenerate the clients' types (root `AGENTS.md`); CI diffs them.

## Traps

- See root `AGENTS.md`: secrets.
- Better Auth tables: `pnpm --filter @wambito/api auth:generate` writes
  `packages/db/src/schema/auth.ts`; then add a migration in `packages/db`.
- Rate limits trust one X-Forwarded-For hop set by Caddy: `docs/deploy/api.md`.
