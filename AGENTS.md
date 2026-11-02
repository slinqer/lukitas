# Wambito: agent map

Wambito is a free, open-source personal finance app; Wambi is its mascot (the same drawing as the
old Lukas). Monorepo: pnpm 12 workspaces + turbo, Node 22 (`.nvmrc`), TypeScript, Flutter for the
phone. Read the `AGENTS.md` of the area you work in; read code only to confirm.

## Map

| Folder | What | Map |
|---|---|---|
| `apps/api` | Hono + Better Auth HTTP API, OpenAPI | `apps/api/AGENTS.md` |
| `apps/web` | React Router app: landing, signed-in app, demo, OAuth consent | `apps/web/AGENTS.md` |
| `apps/mcp` | MCP server for AI assistants, calls the API | `apps/mcp/AGENTS.md` |
| `apps/mobile` | Flutter Android app + Kotlin side | `apps/mobile/AGENTS.md` |
| `packages/ai-assistant-tools` | MCP tools, prompts, instructions | `packages/ai-assistant-tools/AGENTS.md` |
| `packages/core` | shared domain: money, dates, budgets, quick-capture cases | `packages/core/AGENTS.md` |
| `packages/db` | Drizzle schema, migrations, RLS | `packages/db/AGENTS.md` |
| `packages/importers` | CSV importers | `packages/importers/AGENTS.md` |
| `deploy/personal` | the VPS / home install: compose, Caddy, backups, auto-deploy | `deploy/personal/AGENTS.md` |
| `deploy/landing` | Cloudflare Worker for the landing | `deploy/landing/AGENTS.md` |
| `docs` | design system, deploy, mobile, history | `docs/AGENTS.md` |
| `scripts` | repo guards (`scripts/check-old-name.sh`) | here |
| `docker-compose.yml` | root dev stack: postgres, mailpit, api | here |

## Dev stack and commands (repo root)

- Install: `pnpm install --frozen-lockfile`.
- Dev stack: `cp .env.example .env` once, then `docker compose up -d` (API on :3000, Mailpit).
  Services only: `docker compose up -d postgres mailpit`. Stop with `docker compose stop`,
  never `down -v` (it deletes the dev database).
- Lint: `pnpm lint` (= `biome check .`); fix with `pnpm format` (`biome check --write .`).
- Typecheck: `pnpm typecheck` (turbo). Tests: `pnpm test` (Vitest; projects per package/app).
- Docker must run for API/DB/MCP tests (testcontainers); `WAMBITO_TEST_DB=local` uses a local
  `initdb`/`pg_ctl` instead.
- Web e2e needs the dev stack with the pinned clock (see `apps/web/AGENTS.md`).
- Flutter: `export PATH="$HOME/development/flutter/bin:$PATH"`.
- Gradle needs JDK 17 (see `docs/mobile/setup.md`). The founder's:
  `JAVA_HOME=/Users/andirsun/development/jdk/jdk-17.0.21+9/Contents/Home`.

## What CI runs (`.github/workflows/ci.yml`)

- `check`: install, Playwright chromium, the two guards, `pnpm lint`, generated-file checks
  (web `tokens`, web and mcp `api:types` + `git diff --exit-code`), `pnpm typecheck`, `pnpm test`,
  then `deploy/personal/test-*.sh` (retention, r2, auto-deploy, caddy, compose-files).
- `e2e`: root stack with `E2E_NOW=2026-10-21T15:00:00Z`, then web `e2e`, `e2e:landing`,
  `e2e:landing-only`, `e2e:landing-only-app`.
- `deploy-landing`: push to `main` after `check` + `e2e`; `wrangler deploy` from `deploy/landing`.
- `mobile` / `mobile-build` (only when mobile paths change): pub get, analyze, tests without
  goldens, tokens and `apps/mobile/lib/api/gen` staleness, release self-tests, no-Google check,
  debug build, Gradle unit tests, release build.

## Guards (both in CI `check`, before lint)

- Old name: `scripts/check-old-name.sh` fails on the old app or mascot name outside
  `.github/name-allowlist.txt` (`<pathspec>  # <reason>`; reasons `money`, `2b`, `2b: remove`,
  `history`, `docs-rule`). A new legit hit: add the file there with its reason, never a folder glob.
- Personal domain: a `git grep` for the founder's personal domain outside `docs/superpowers`.
  Never write personal names, emails or domains into the repo.

## Cross-cutting rules

- Names: app = Wambito, mascot = Wambi. Packages are `@wambito/*`, headers `x-wambito-*`,
  stored keys `wambito.*`, deep links `wambito://`, channels `wambito/*`.
- Money slang is never renamed: «lukas/luka/palo» in the capture parser, copy and tests,
  `lukasHint`, the money words of the landing. A global search-and-replace of the old name breaks
  them; check each hit.
- Part 2b (not done) keeps these old names; do not rename them in passing:
  - database role `lukas_app`, database `lukas`, admin user `lukitas`;
  - compose project `lukitas-personal` and its volumes;
  - units `lukitas-backup`/`lukitas-deploy`, `deploy/personal/com.lukitas.backup.plist`;
  - dumps `lukitas-*.dump`, R2 bucket `lukitas-backups`;
  - repo URL `slinqer/lukitas`, Worker `lukitas-landing`, `guest.lukitas.invalid` (live user rows);
  - signing key alias `lukitas` and its keystore path (re-keying breaks updates), AVD `lukitas-api36`;
  - folders `~/lukitas` (VPS) and `~/projects/lukas` (Mac).
- Transition code that carries old names over is marked `2b: remove`; keep it until 2b.
- Persistent names on phones (prefs files, WorkManager unique names, widget receivers, snapshot
  key) need a migration to change.
- Never read `deploy/personal/.env`, the root `.env`, `~/.cloudflared/*.json`, the signing keystore
  or any other secret. Use the `.env.example` files.
- Money is an integer number of cents, never a float. Fixtures are invented, never real data.
- Generated files are regenerated, never hand-edited:
  - `apps/web/app/styles/tokens.css`: `pnpm --filter @wambito/web tokens`;
  - `apps/mobile/lib/theme/tokens.g.dart`: `dart run scripts/gen-tokens.dart` (in `apps/mobile`);
    both from `docs/design/system/project/tokens.json`;
  - `apps/web/app/api/schema.d.ts`: `pnpm --filter @wambito/web api:types --file`;
  - `apps/mcp/src/api/schema.d.ts`: `pnpm --filter @wambito/mcp api:types`;
  - `apps/mobile/lib/api/gen`: `apps/mobile/scripts/gen-api.sh`;
  - Flutter l10n (`app_localizations*.dart`, git-ignored): `flutter pub get`.
- Write the failing test first. Everything in English.
- Commits: Conventional Commits, repo style `feat(area): …`, `fix(android): …`, `docs: …`, a
  lowercase sentence. Never a `Co-Authored-By` line. Stage by path, never `git add -A`.
- Whoever changes an area's structure, commands or conventions updates its `AGENTS.md`.

## Production

- The VPS serves `app.wambito.com` directly (no tunnel), `direct` mode via `COMPOSE_FILE` in its
  `.env`. It deploys `main` by itself once CI passes (`deploy/personal/auto-deploy.sh`).
  Merging to `main` is deploying.
- The landing `wambito.com` is the Cloudflare Worker (`deploy/landing`), deployed by CI.

## History: `docs/superpowers/**` (read only when needed, never edit)

- Product and architecture: `docs/superpowers/specs/2026-10-20-lukas-design.md`.
- Web: `docs/superpowers/specs/2026-10-21-stage-2-web-design.md`.
- Mobile: `docs/superpowers/specs/2026-10-22-stage-3-mobile-design.md`, parity
  `docs/superpowers/specs/2026-10-23-stage-3b-mobile-parity-design.md`, feature parity
  `docs/superpowers/specs/2026-10-24-stage-3c-mobile-feature-parity-design.md`.
- Italian/Portuguese: `docs/superpowers/specs/2026-10-26-italian-portuguese-design.md`.
- MCP: `docs/superpowers/specs/2026-10-29-stage-4-mcp-design.md`.
- Donations: `docs/superpowers/specs/2026-10-29-support-contributions-design.md`.
- URLs and direct mode (part 1): `docs/superpowers/specs/2026-11-02-wambito-urls-design.md`.
- The rename (part 2a, and what 2b will do): `docs/superpowers/specs/2026-11-02-wambito-part-2a-rename-design.md`.
- Plans: `docs/superpowers/plans/`; rulings and spikes: `docs/superpowers/reports/`.
