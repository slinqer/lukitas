# Wambito part 2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the infrastructure that still carries the old name (database role and names, compose project, volume, units, dumps, bucket, repository, Worker, guest domain) and delete the part 2a transition code, without losing data, sessions or backups.

**Architecture:** Two PRs. **PR A** (tasks 1–9, branch `feat/part-2b-code`) changes only code that is safe to auto-deploy: grants move from migration `0001` into the bootstrap so the role name is free, `APP_ROLE` becomes `wambito_app`, guests' emails move domain, the transition goes, links point at `slinqer/wambito`. **PR B** (tasks 10–13, branch `feat/part-2b-server`) renames everything in `deploy/personal`; the founder merges it with the deploy timer off and then runs the cutover runbook (spec §4.2). The manual steps (repo rename, cutover, key, AVD, Mac folder) are the founder's and are not tasks here.

**Tech Stack:** TypeScript (Hono API, React Router web, Drizzle, Vitest, testcontainers), Postgres 17, Bash (deploy scripts and their `test-*.sh`), Flutter/Dart, Kotlin (Android, Gradle unit tests), wrangler.

**Spec:** `docs/superpowers/specs/2026-11-03-wambito-part-2b-infrastructure-design.md`

## Global Constraints

- New names, exactly: role `wambito_app`; admin user and database `wambito`; compose projects `wambito` (dev, root) and `wambito-personal` (VPS); volume `wambito-personal-db`; images `wambito-{api,mcp,web}:personal`; units `wambito-backup.{service,timer}`, `wambito-deploy.{service,timer}`, `com.wambito.backup.plist`; dumps `wambito-YYYY-MM-DD.dump`, `wambito-YYYY-MM-DD-preupdate-HHMM.dump`; backup folder `~/Backups/wambito`; scratch database `wambito_verify`; bucket `wambito-backups`; repository `slinqer/wambito`; Worker `wambito-landing`; guest domain `guest.wambito.invalid`.
- The signing key alias `lukitas` stays (allowlist reason `key-alias`). Money slang never changes (root `AGENTS.md`).
- Allowlist reasons after PR A: `money`, `history`, `docs-rule`, `key-alias`, `2b`. After PR B: `money`, `history`, `docs-rule`, `key-alias`.
- PR A must not change any file under `deploy/personal` except `backup.sh` and `restore.sh` (task 3), so its auto-deploy keeps the VPS names.
- Never `docker compose down -v`. Never read `.env` files or secrets; use `.env.example`.
- Money is integer cents; fixtures are invented. Write the failing test first. Conventional Commits, lowercase sentence, no `Co-Authored-By`. Stage by path.
- Every task that changes an area's structure or rules updates that area's `AGENTS.md`.

## Review Focus

1. **A database migrated by the old `0001` (grants to `lukas_app` included) must take the new bootstrap and later migrations without error and keep `lukas_app`'s access**: this is the VPS between PR A and the cutover. Test in task 1.
2. **A dump taken on the VPS today (owner `lukitas`, grants to `lukas_app`) must restore into the new stack**: restore with `--no-acl`, then grants to `wambito_app`, and the app role reads its own rows under RLS. Test in task 3.
3. **A guest who signed up before PR A must still be a guest after it**: claim, cleanup and mailer refusal all key on the new domain once `0007` has run. Test in task 2.
4. **Two timers after the cutover**: installing `wambito-*` units on a machine that still has `lukitas-*` units must leave only the new ones. Test in task 12.
5. **Retention must never prune the other prefix**: the new stack's pruning ignores `lukitas-*` files in the same folder or bucket. Test in task 11.

---

## PR A — code (branch `feat/part-2b-code`, from `main` after the spec branch is merged)

Precondition (founder, before the PR is merged): the repository is renamed to `slinqer/wambito` on GitHub, and `git remote set-url origin git@github.com:slinqer/wambito.git` is run on the Mac.

### Task 1: Grants in the bootstrap, and the role named `wambito_app`

**Files:**
- Modify: `packages/db/src/bootstrap.ts` (`APP_ROLE`, `prepareDatabase`), `packages/db/src/scripts/bootstrap.ts` (log lines), `packages/db/drizzle/0001_rls.sql` (drop the last four statements), `packages/db/src/testing.ts`, `docker/postgres/init.sql`, `docker-compose.yml` (root), `.env.example` (root), `apps/api/test/config.test.ts`, `apps/api/test/passkey-origin.test.ts`, `apps/api/Dockerfile.prod` (comment), `packages/db/AGENTS.md`, `README.md` (dev stack section)
- Test: `packages/db/test/bootstrap.test.ts`

**Interfaces:**
- Produces: `APP_ROLE = "wambito_app"`; `grantAppRole(adminUrl: string): Promise<void>` exported from `packages/db/src/bootstrap.ts` (the four grants, idempotent); `prepareDatabase(adminUrl, appPassword)` = `ensureAppRole` → `GRANT USAGE ON SCHEMA public` → `runMigrations` → `grantAppRole`. Task 3 calls `prepareDatabase` after a restore.

- [ ] **Step 1: Write the failing tests** in `bootstrap.test.ts` (`asApp` uses `APP_ROLE`):
  - `"on an empty server: the app role can read and write every table and use every sequence"`: after `prepareDatabase`, for each table in `information_schema.tables where table_schema='public'`, `has_table_privilege('wambito_app', table, 'SELECT,INSERT,UPDATE,DELETE')` is true; for each sequence, `has_sequence_privilege('wambito_app', seq, 'USAGE,SELECT')` is true.
  - `"a table created after the bootstrap is granted by default"`: as admin, `create table later_t (id int)`; `has_table_privilege('wambito_app','later_t','SELECT')` is true.
  - `"a database migrated with the old 0001 takes the new bootstrap"`: on a fresh bare database, create role `lukas_app` (LOGIN, password `old-app-password-0123456789`), run the migrations, then run the four old grant statements to `lukas_app` by hand (copy them verbatim from git `HEAD:packages/db/drizzle/0001_rls.sql` into the test as a constant), insert one row in `"user"`; then `prepareDatabase(adminUrl, PASSWORD)` resolves; `select count(*) from __drizzle_migrations` (schema `drizzle`) is unchanged; `has_table_privilege('lukas_app','"user"','SELECT')` and the same for `wambito_app` are both true; the row is still there.
- [ ] **Step 2: Run them to see them fail**: `pnpm vitest run --project @wambito/db test/bootstrap.test.ts` → FAIL (role `wambito_app` does not exist / no privilege).
- [ ] **Step 3: Implement.** `APP_ROLE = "wambito_app"`; `grantAppRole` runs, with `%I`-quoted `APP_ROLE`: `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public`, `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public`, and the two `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT …` statements; call it at the end of `prepareDatabase`. Remove lines 37–40 of `0001_rls.sql` and the `--> statement-breakpoint` at the end of line 36, so the file ends with a complete statement and no empty one. The script's logs print `` `Role ${APP_ROLE} ready` `` and `` `Database ready: ${APP_ROLE} role set, migrations applied` ``. Update the doc comments that say "migration 0001 grants".
- [ ] **Step 4: Dev and test names.** `testing.ts`: role `wambito_app`/password `wambito_app`, comments. `init.sql`: role `wambito_app`. Root `docker-compose.yml`: top-level `name: wambito`; `POSTGRES_USER: wambito`, `POSTGRES_DB: wambito`, the URLs `postgres://wambito_app:wambito_app@postgres:5432/wambito` and the admin URL with `wambito`. Root `.env.example`: the same URLs, the comment. `config.test.ts`, `passkey-origin.test.ts`: `postgres://wambito_app:x@db:5432/wambito`. `Dockerfile.prod` comment. Search: `git grep -n -E "lukas_app|POSTGRES_(USER|DB): lukas|/lukas\b" -- . ':!deploy/personal' ':!docs/superpowers'` must print nothing.
- [ ] **Step 5: README and AGENTS.** README dev section: the stack is named `wambito` (containers `wambito-api`, `wambito-postgres`, `wambito-mailpit`), starts on a new empty volume; the old dev volume is listed with `docker volume ls --filter name=lukas` and removed with `docker volume rm <name>` once not needed. `packages/db/AGENTS.md`: grants live in `grantAppRole` (bootstrap), not in migrations; the rule "never edit an applied migration" gains "(the one exception: `0001`'s grants moved to the bootstrap in part 2b)"; drop the "part 2b names: don't rename" rule.
- [ ] **Step 6: Run** `pnpm vitest run --project @wambito/db` and `pnpm vitest run --project @wambito/api` → PASS. Then `docker compose up -d` from the root and `curl -fsS localhost:3000/health` (or the API's health path in `apps/api/AGENTS.md`) answers.
- [ ] **Step 7: Commit** `feat(db): the bootstrap grants the app role, now named wambito_app`.

### Task 2: Guests under `guest.wambito.invalid`

**Files:**
- Create: `packages/db/drizzle/0007_guest_domain.sql` via `pnpm --filter @wambito/db generate --custom --name guest_domain` (journal entry included)
- Modify: `apps/api/src/auth.ts:42`, `apps/api/src/mailer.ts:18` (comment), `apps/api/test/{allowlist,claim-email,guest-cleanup,mailer}.test.ts`, `apps/mobile/test/api/auth_api_test.dart` (if it names the domain), `apps/api/AGENTS.md`
- Test: `packages/db/test/guest-domain.test.ts` (new), `apps/api/test/guests.test.ts`

**Interfaces:**
- Produces: `GUEST_EMAIL_DOMAIN = "guest.wambito.invalid"`.

- [ ] **Step 1: Failing test** `guest-domain.test.ts`: on a bare database, run migrations up to `0006` only (apply with a copy of the migrations folder without `0007`, or insert the rows before `runMigrations` on a database where `0007` is the only pending one: create via `startBareDatabase`, `runMigrations` from a temp folder holding `0000`–`0006` + their journal), insert users `temp-a@guest.lukitas.invalid`, `Temp-B@guest.lukitas.invalid`, `member@wambito.test`, `x@guest.lukitas.invalid.example`; run the full `runMigrations`; expect emails `temp-a@guest.wambito.invalid`, `Temp-B@guest.wambito.invalid`, `member@wambito.test`, `x@guest.lukitas.invalid.example` (only a true suffix moves).
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/db test/guest-domain.test.ts` → FAIL.
- [ ] **Step 3: Write `0007`**: `UPDATE "user" SET email = left(email, length(email) - length('@guest.lukitas.invalid')) || '@guest.wambito.invalid' WHERE lower(email) LIKE '%@guest.lukitas.invalid';` (keeps the local part's case).
- [ ] **Step 4: API.** `GUEST_EMAIL_DOMAIN` and every test that names the old domain use the new one; `guests.test.ts` gains `"a guest created under the old domain is a guest after the migration"` only if the API has any code path reading stored guest emails by domain (check `auth.ts` around line 525 and the cleanup job); otherwise the db test covers it. `mailer.test.ts` keeps asserting a `.invalid` address is refused.
- [ ] **Step 5: Run** `pnpm vitest run --project @wambito/db --project @wambito/api` → PASS.
- [ ] **Step 6: Commit** `feat(api): guests' placeholder emails move to guest.wambito.invalid`.

### Task 3: Backup and restore without ACLs

**Files:**
- Modify: `deploy/personal/restore.sh:101-120` (and the drill path), `deploy/personal/backup.sh:132` (verify restore)
- Test: `packages/db/test/restore.test.ts` (new)

**Interfaces:**
- Consumes: `prepareDatabase` (task 1).

- [ ] **Step 1: Failing test** `"a dump made under lukas_app restores into a server whose role is wambito_app"` (skip with `test.skipIf(process.env.WAMBITO_TEST_DB === "local" && !hasPgDump)` if needed): database A as in task 1's old-0001 case, with a user and one transaction for that user; `pg_dump -Fc` of A (run inside the container with `container.exec`, or the local binary); a second bare database B (a server without `lukas_app`); `prepareDatabase(B, PASSWORD)` with `--role-only` semantics (`ensureAppRole`), then `pg_restore --no-owner --no-acl --exit-on-error --single-transaction` into an empty database on B, then `prepareDatabase`; as `wambito_app` with `set app.user_id = '<id>'`, `select count(*) from transactions` = 1; with another id, 0. Expose what the test needs from `testing.ts` (for example `startBareDatabase` returning an `exec(cmd: string[])` helper); keep it small.
- [ ] **Step 2: Run** → FAIL (without `--no-acl` the restore errors on `role "lukas_app" does not exist`; write the test so it uses the same flags as the scripts: put the flag list in one exported constant `RESTORE_FLAGS` in `testing.ts` and mirror it in the scripts, with a comment naming each other).
- [ ] **Step 3: Implement.** `restore.sh`: `pg_restore … --no-owner --no-acl …`; keep `--role-only` before the restore; after the swap (the restored database has the live name), run `compose run --rm migrate` (the full bootstrap: it grants to the role and applies any migration newer than the dump). The drill path grants on its scratch database with the same four statements, through a `--grant-only <db>` flag added to `scripts/bootstrap.ts` that calls `grantAppRole` on that database's URL. The `say` lines name the role from the compose env, not a literal. `backup.sh` verify: `--no-acl` too. Names stay as they are (PR B renames them).
- [ ] **Step 4: Run** the db test → PASS; `cd deploy/personal && ./test-compose-files.sh && ./test-retention.sh` → PASS.
- [ ] **Step 5: Commit** `fix(deploy): a restore no longer depends on the app role's name`.

### Task 4: API without the old headers

**Files:**
- Modify: `apps/api/src/http/client-headers.ts`, `apps/api/src/http/session.ts:34`, `apps/api/test/client-headers.test.ts`, `apps/api/test/auth.test.ts:206…`, `apps/api/test/guests.test.ts:111…`, `apps/api/test/guest-cleanup.test.ts:289…`, `apps/api/test/sign-in-email.test.ts`, `apps/api/AGENTS.md:24`

**Interfaces:**
- Produces: `clientHeader(headers, name)` keeps its signature and returns `headers.get(\`x-wambito-${name}\`) ?? undefined`.

- [ ] **Step 1: Failing test** in `client-headers.test.ts`: `"an old x-lukas-* header is ignored"`: `clientHeader(new Headers({"x-lukas-locale":"es"}), "locale")` is `undefined`. Delete the fallback tests and the `2b: remove` blocks in `auth`, `guests` and `guest-cleanup` tests.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/api test/client-headers.test.ts` → FAIL.
- [ ] **Step 3: Implement**; drop `NAMES` if unused; fix the doc comments in both files.
- [ ] **Step 4:** `sign-in-email.test.ts`: the test that names the old mascot to assert it is absent asserts instead that the text names "Wambi" (keep its other assertions); it leaves the allowlist in task 8.
- [ ] **Step 5: Run** `pnpm vitest run --project @wambito/api` → PASS. **Commit** `refactor(api): the client headers are only x-wambito-*`.

### Task 5: Web without the old keys

**Files:**
- Modify: `apps/web/app/lib/stored.ts`, `apps/web/app/lib/stored.test.ts`, `apps/web/app/theme/theme-bootstrap.ts`, `apps/web/app/theme/theme-bootstrap.test.ts`, `apps/web/e2e/landing.spec.ts:1313…`, `apps/web/AGENTS.md`

- [ ] **Step 1: Failing tests**: `stored.test.ts` `"an old lukas.* key is neither read nor removed"` (storage holds `lukas.theme=night`; `readStored("theme")` is null and the old key is still there); `theme-bootstrap.test.ts` the same for the inline script. Delete the migration tests and the e2e block at `landing.spec.ts:1313`.
- [ ] **Step 2: Run** `pnpm vitest run --project @wambito/web app/lib/stored.test.ts app/theme/theme-bootstrap.test.ts` → FAIL.
- [ ] **Step 3: Implement**: remove `OLD_STORED_PREFIX` and the migration in `readStored`; remove the old-key branch in the bootstrap script.
- [ ] **Step 4: Run** `pnpm vitest run --project @wambito/web` and `pnpm --filter @wambito/web typecheck` → PASS. **Commit** `refactor(web): stored keys are only wambito.*`.

### Task 6: App (Dart) without the key migration and the old scheme

**Files:**
- Delete: `apps/mobile/lib/storage/migrate_keys.dart`, `apps/mobile/test/storage/migrate_keys_test.dart`
- Modify: `apps/mobile/lib/main.dart:22` (the call), `apps/mobile/lib/launch/launch_links.dart:25-32` (`_oldLaunchScheme`), `apps/mobile/test/launch/launch_links_test.dart`, `apps/mobile/AGENTS.md:9`

- [ ] **Step 1: Failing test** in `launch_links_test.dart`: `"a lukitas:// link is not a launch link"` (the parser returns null for `lukitas://add`); remove the old-scheme cases.
- [ ] **Step 2: Run** `cd apps/mobile && flutter test test/launch/launch_links_test.dart` → FAIL.
- [ ] **Step 3: Implement**; delete the migration file, its test and the call in `bootstrap()`.
- [ ] **Step 4: Run** `flutter analyze && flutter test --exclude-tags golden` (or the CI command in `apps/mobile/AGENTS.md`) → PASS. **Commit** `refactor(mobile): no more old storage keys or lukitas:// links`.

### Task 7: Android (Kotlin) without `Migration` and `lukitas://`

**Files:**
- Delete: `apps/mobile/android/app/src/main/kotlin/com/wambito/app/Migration.kt`, `apps/mobile/android/app/src/test/kotlin/com/wambito/app/MigrationTest.kt`
- Modify: `MainActivity.kt:49`, `notices/NoticeWorkers.kt:72,156`, `widget/RefreshWorker.kt:42`, `widget/WambitoSmallWidget.kt:30`, `widget/WambitoMediumWidget.kt:30`, `notices/NoticeSettings.kt:49`, `launch/LaunchLinks.kt` (`OLD_SCHEME`, lines 26, 55), `src/test/.../launch/LaunchLinksTest.kt:50`, `AndroidManifest.xml:96-104`, `apps/mobile/test/tooling/manifest_test.dart`, `apps/mobile/test/tooling/widget_android_test.dart:102-105`, `apps/mobile/AGENTS.md:22,54-55`

- [ ] **Step 1: Failing tests**: `manifest_test.dart` counts `android:host="due"` once and finds no `android:scheme="lukitas"`; `LaunchLinksTest.kt` `lukitasLinkIsIgnored`; `widget_android_test.dart` no longer expects the `2b: remove` alias.
- [ ] **Step 2: Run** `cd apps/mobile && flutter test test/tooling/` and `cd android && ./gradlew testDebugUnitTest --tests '*LaunchLinksTest'` → FAIL.
- [ ] **Step 3: Implement**: delete the files and every `Migration.run(context)` call; remove the old `<data>` entries and their comment in the manifest; remove `OLD_SCHEME`; fix the `NoticeSettings` comment.
- [ ] **Step 4: Run** `./gradlew testDebugUnitTest` and `flutter test test/tooling/` → PASS; `flutter build apk --debug` succeeds. **Commit** `refactor(android): no more key migration or lukitas:// filter`.

### Task 8: Repository, models, Worker, docs, and the guard

**Files:**
- Modify: `apps/web/app/features/landing/links.ts:8`, `apps/web/app/features/landing/Landing.stories.tsx:85,209`, `apps/web/e2e/landing.spec.ts:11`, `apps/web/e2e/landing-only.spec.ts:13`, the four `apps/mobile/fastlane/metadata/android/*/full_description.txt`, the four `apps/mobile/lib/l10n/app_*.arb` (`licenseNoticeSounds`, `licenseNoticeApp`), `apps/mobile/lib/capture/models_download.dart:16`, `apps/mobile/test/capture/models_download_test.dart`, `apps/mobile/test/l10n/arb_parity_test.dart` (title and comment), `deploy/landing/wrangler.jsonc:5`, `deploy/landing/AGENTS.md`, `docs/deploy/landing.md`, `docs/deploy/personal.md`, `docs/mobile/release.md`, `docs/mobile/setup.md`, `README.md`, root `AGENTS.md`, `docs/AGENTS.md`, `.github/name-allowlist.txt`, `scripts/check-old-name.sh`
- Create: `scripts/test-check-old-name.sh`; add it to CI `check` next to the guard in `.github/workflows/ci.yml`

- [ ] **Step 1: Failing tests**: `models_download_test.dart` expects base URL `https://github.com/slinqer/wambito/releases/download/voice-models-v1`; the landing e2e and stories expect `https://github.com/slinqer/wambito`; `scripts/test-check-old-name.sh` runs the guard against a temporary allowlist (env `NAME_ALLOWLIST` read by the script, default `.github/name-allowlist.txt`) and checks: a line `foo.txt  # money` passes, `foo.txt  # 2b: remove` fails with `unknown reason`, `foo.txt` with no reason fails, `foo.txt  # money, key-alias` passes.
- [ ] **Step 2: Run** them → FAIL.
- [ ] **Step 3: Implement** the URL changes (`slinqer/lukitas` → `slinqer/wambito` everywhere outside `deploy/personal` and `docs/superpowers`); `wrangler.jsonc` `"name": "wambito-landing"`; `docs/deploy/landing.md` says the old Worker is deleted by hand after the first deploy (spec §5.4). Guard: each allowlist line's reasons (comma-split, trimmed) must be in `money history docs-rule key-alias 2b`; otherwise it prints the line and exits 1.
- [ ] **Step 4: Docs.** `release.md`: folder `~/.wambito-signing`, file `wambito-release.p12`, alias `lukitas` with one sentence on why it stays, and the move steps (spec §6.1); `cd ~/projects/wambito`. `setup.md`: AVD `wambito-api36`, plus `avdmanager delete avd -n lukitas-api36`. Root `AGENTS.md`: drop the "Part 2b (not done)" list and the `2b: remove` rule; keep money slang; add the `key-alias` reason; point the history section at the 2b spec; the Mac folder line says `~/projects/wambito`. Area `AGENTS.md`s: drop their 2b notes (except `deploy/personal/AGENTS.md`, PR B).
- [ ] **Step 5: Allowlist.** Remove every `2b: remove` entry; remove the `2b` entries that no longer hit (re-run the guard after each removal); `docs/mobile/release.md` becomes `# key-alias`; recheck every comma-joined line keeps only reasons that still apply. What remains with `2b` is `deploy/personal/**` and nothing else (CI deploy texts excluded).
- [ ] **Step 6: Run** `scripts/check-old-name.sh && scripts/test-check-old-name.sh && pnpm lint && pnpm typecheck && pnpm test` → PASS; the web e2e for the landing (`pnpm --filter @wambito/web e2e:landing`) → PASS.
- [ ] **Step 7: Commit** in two commits: `feat: links point at slinqer/wambito, and the landing Worker is wambito-landing`, then `chore: the name guard checks each allowlist reason`.

### Task 9: Open PR A

- [ ] **Step 1:** Push `feat/part-2b-code`, open the PR to `main`. The body lists the founder's steps: repository renamed **before** the merge; after the merge, check the landing at `wambito.com`, sign in at `app.wambito.com`, then build and install the APK (`docs/mobile/release.md`) and check the session survived and widgets and links open.
- [ ] **Step 2:** CI green (`check`, `e2e`, `mobile`, `mobile-build`).

---

## PR B — the server names (branch `feat/part-2b-server`, from `main` after PR A is merged)

### Task 10: Compose project, volume and images

**Files:**
- Modify: `deploy/personal/docker-compose.yml` (`name:`, `POSTGRES_USER`, `POSTGRES_DB`, the URLs, image names, `DB_VOLUME_NAME` default), `deploy/personal/docker-compose.direct.yml` (if it names any), `deploy/personal/lib.sh:132,181` (`psql -U wambito`, volume default), `deploy/personal/up.sh:79`, `deploy/personal/smoke.sh` (if it names any), `deploy/personal/.env.example` (`DB_VOLUME_NAME`, `DEPLOY_GITHUB_REPO=slinqer/wambito`, the role comment, the tunnel name, `age-keygen -o wambito-backup.key`, `BACKUP_R2_BUCKET` example), `deploy/personal/cloudflared.yml:1`
- Test: `deploy/personal/test-compose-files.sh`

- [ ] **Step 1: Failing checks** in `test-compose-files.sh`: `docker compose config --format json | jq -r .name` is `wambito-personal`; the `db` volume's `name` is `wambito-personal-db`; the api's `DATABASE_URL` user is `wambito_app` and its database `wambito`; images are `wambito-api:personal`, `wambito-mcp:personal`, `wambito-web:personal`.
- [ ] **Step 2: Run** `cd deploy/personal && ./test-compose-files.sh` → FAIL.
- [ ] **Step 3: Implement**; update the command the test expects `restore.sh` to print.
- [ ] **Step 4: Run** → PASS. **Commit** `feat(deploy): the personal stack is wambito-personal`.

### Task 11: Backups under the new prefix

**Files:**
- Modify: `deploy/personal/backup.sh` (header, `BACKUP_DIR` default `$HOME/Backups/wambito`, names, scratch `wambito_verify`, `table_counts wambito`, `pg_dump -U wambito -d wambito`), `deploy/personal/lib.sh:191-192` (`DAILY_DUMP`, `PREUPDATE_DUMP` with `wambito-`), `deploy/personal/restore.sh` (`-U wambito`, `alter database wambito rename`, the printed commands), `deploy/personal/test-retention.sh`, `deploy/personal/test-r2.sh`

- [ ] **Step 1: Failing tests**: `test-retention.sh` builds dumps with the new names and adds `"old-prefix dumps are never pruned"`: 20 `lukitas-YYYY-MM-DD.dump` files older than the keep window are all still there after a prune; `test-r2.sh` expects `r2:wambito-backups/wambito-2026-10-29.dump.age`; a case `"restore accepts a lukitas-*.dump file name"` wherever `restore.sh`'s name check lives (if it checks names at all; if it does not, no case).
- [ ] **Step 2: Run** `./test-retention.sh && ./test-r2.sh` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS. **Commit** `feat(deploy): backups are wambito-*.dump in ~/Backups/wambito`.

### Task 12: Units, and the old ones removed on install

**Files:**
- Rename (`git mv`): `lukitas-backup.{service,timer}` → `wambito-backup.*`, `lukitas-deploy.{service,timer}` → `wambito-deploy.*`, `com.lukitas.backup.plist` → `com.wambito.backup.plist`
- Modify: their descriptions and comments (`Wambito: …`), `install-backup.sh`, `install-auto-deploy.sh`, `uninstall-backup.sh`, `auto-deploy.sh:4,16`
- Test: `deploy/personal/test-auto-deploy.sh` (repo `slinqer/wambito`), new `deploy/personal/test-install-units.sh`; add it to CI `check` with the other five and to `deploy/personal/AGENTS.md`

**Interfaces:**
- Produces: a `remove_old_units()` function in `lib.sh` used by both install scripts: on Linux, `systemctl disable --now` and delete `/etc/systemd/system/lukitas-{backup,deploy}.{service,timer}` if present; on macOS, `launchctl bootout gui/$(id -u)/com.lukitas.backup` and delete `~/Library/LaunchAgents/com.lukitas.backup.plist` if present. It is the one place that names the old units; it spells them split like the guard's pattern (`"luk""itas-deploy.timer"`), so no allowlist entry is needed.
- [ ] **Step 1: Failing test** `test-install-units.sh`: with `sudo`, `systemctl` and `launchctl` replaced by stub scripts on `PATH` that log their arguments, and a temp dir as the unit folder (`UNIT_DIR`, default `/etc/systemd/system`, read by the install scripts), pre-create `lukitas-deploy.timer`; run `install-auto-deploy.sh`; expect the log to contain `disable --now lukitas-deploy.timer` before `enable --now wambito-deploy.timer`, and `UNIT_DIR` to hold only `wambito-*` files. Same for `install-backup.sh`.
- [ ] **Step 2: Run** `./test-install-units.sh` → FAIL.
- [ ] **Step 3: Implement** (`UNIT_DIR` override, `remove_old_units`, the renames).
- [ ] **Step 4: Run** all six `test-*.sh` → PASS. **Commit** `feat(deploy): units are wambito-*, and installing them removes the old ones`.

### Task 13: Runbook, docs, final guard, PR B

**Files:**
- Modify: `deploy/personal/README.md` (all names; new section "Moving from the old names (part 2b)" with spec §4.2 steps 1–8 verbatim in substance, including the rollback and the Caddy volume copy command `docker run --rm -v lukitas-personal_web-caddy-data:/from -v wambito-personal_web-caddy-data:/to alpine cp -a /from/. /to/`), `deploy/personal/AGENTS.md`, `docs/deploy/personal.md`, `.github/name-allowlist.txt`, `scripts/check-old-name.sh` (allowed reasons drop `2b`), `scripts/test-check-old-name.sh` (a `2b` reason now fails)
- [ ] **Step 1: Failing test**: `test-check-old-name.sh` case `"2b is no longer a reason"` → FAIL.
- [ ] **Step 2: Implement**; remove `deploy/personal/**` and the remaining `2b` entries and the `2b` lines of the allowlist header. The runbook and the units' removal code name the old names: split them like the guard's pattern (`luk''itas`) in scripts; in the README, the migration section is the one allowed place: add `deploy/personal/README.md  # history` (it documents the move).
- [ ] **Step 3: Run** `scripts/check-old-name.sh && scripts/test-check-old-name.sh && pnpm lint && pnpm test` and the six deploy tests → PASS.
- [ ] **Step 4: Commit** `docs(deploy): the move to the new names, and the guard without 2b`; push; open PR B. Its body starts with **"Do not merge until `sudo systemctl disable --now lukitas-deploy.timer` has run on the VPS"**, then links the README section.
