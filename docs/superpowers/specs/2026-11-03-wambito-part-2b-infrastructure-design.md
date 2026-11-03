# Wambito — Part 2b: the infrastructure names, and the end of the transition

- **Date:** 2026-11-03
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-03.
- **Follows:** `2026-11-02-wambito-part-2a-rename-design.md` (part 2a, merged). Part 2a renamed
  the code and everything people see; it left the infrastructure names (its §2, "Infrastructure")
  and the transition code (its §4) for this part.
- **Founder decisions (2026-11-03):**
  1. Every phone already runs the Wambito APK, so the §4 transition of part 2a goes now.
  2. The VPS database moves to the new names by **dump and restore** into a new stack, not by a
     rename in place. A few minutes without the app are accepted. The old volume stays untouched
     until the founder deletes it.
  3. The VPS gets a **new Linux user** `wambito`. The old user is removed only once everything
     works, so SSH access is never at risk.
  4. The signing key's **folder and file** move to `wambito` names; its **alias stays** `lukitas`
     (it lives inside the key; it is the only old name left outside money and history).
  5. Two PRs: **PR A** (code, safe to auto-deploy) and **PR B** (the server cutover, merged with
     auto-deploy switched off).

## 1. Goal

After part 2b:

- No tracked file names Lukitas or Lukas except money slang, history, the agent maps' rules and
  the signing key's alias. The guard's allowlist has only the reasons `money`, `history`,
  `docs-rule` and `key-alias`.
- On the VPS, the stack is `wambito-personal`: admin user and database `wambito`, role
  `wambito_app`, volume `wambito-personal-db`, units `wambito-backup.*`/`wambito-deploy.*`, run by
  the Linux user `wambito` from `~/wambito`.
- Backups are `wambito-YYYY-MM-DD.dump` in `~/Backups/wambito` and in the R2 bucket
  `wambito-backups`.
- The repository is `slinqer/wambito`, the landing Worker is `wambito-landing`, and the Mac
  checkout is `~/projects/wambito`.
- Nobody loses data, a session or a backup. Every step before the old resources are deleted can be
  undone.

## 2. The name map

| Old | New | Where | Changed in |
|---|---|---|---|
| role `lukas_app` | `wambito_app` | `APP_ROLE`, compose URLs, `init.sql`, tests, docs | dev: PR A; VPS: PR B |
| database `lukas` (dev), `lukitas` (VPS) | `wambito` | compose, `lib.sh`, `backup.sh`, `restore.sh` | dev: PR A; VPS: PR B |
| admin user `lukas` (dev), `lukitas` (VPS) | `wambito` | compose `POSTGRES_USER`, scripts | dev: PR A; VPS: PR B |
| dev stack named after the folder (`lukas-*`) | `name: wambito` | root `docker-compose.yml` | PR A |
| compose project `lukitas-personal` | `wambito-personal` | `deploy/personal/docker-compose.yml` | PR B |
| volume `lukitas-personal-db` | `wambito-personal-db` | compose, `lib.sh`, `.env.example` | PR B |
| images `lukitas-{api,mcp,web}:personal` | `wambito-…:personal` | compose | PR B |
| units `lukitas-backup.*`, `lukitas-deploy.*`, `com.lukitas.backup.plist` | `wambito-…`, `com.wambito.backup.plist` | `deploy/personal` | PR B |
| dumps `lukitas-*.dump`, `~/Backups/lukitas`, scratch db `lukitas_verify` | `wambito-*.dump`, `~/Backups/wambito`, `wambito_verify` | `backup.sh`, `lib.sh`, `restore.sh` | PR B |
| bucket `lukitas-backups` | `wambito-backups` | docs, `.env.example`, tests | PR B |
| tunnel `lukitas-personal` (docs only; the VPS runs `direct`) | `wambito-personal` | README, `cloudflared.yml` | PR B |
| `DEPLOY_GITHUB_REPO=slinqer/lukitas`, repository URL | `slinqer/wambito` | `.env.example`, links, store texts, ARB licences, models URL | PR A (`deploy/personal` in PR B) |
| Worker `lukitas-landing` | `wambito-landing` | `deploy/landing/wrangler.jsonc` | PR A |
| guest emails `@guest.lukitas.invalid` | `@guest.wambito.invalid` | `GUEST_EMAIL_DOMAIN`, migration `0007`, tests | PR A |
| key folder `~/.lukitas-signing/lukitas-release.p12` | `~/.wambito-signing/wambito-release.p12` | `docs/mobile/release.md` | PR A |
| AVD `lukitas-api36` | `wambito-api36` | `docs/mobile/setup.md` | PR A |
| key alias `lukitas` | **unchanged** | `docs/mobile/release.md` | allowlist `key-alias` |
| Mac folder `~/projects/lukas` | `~/projects/wambito` | the disk, Claude's memory folder | by hand, last |
| VPS user and `~/lukitas` | user `wambito`, `~/wambito` | the server | by hand, in the cutover |

## 3. The database and the bootstrap

### 3.1 PR A: make a role rename safe, without renaming anything on the VPS

- **Grants move to the bootstrap.** Today `packages/db/drizzle/0001_rls.sql` ends with four
  statements that name `lukas_app` (table and sequence grants, and the two `ALTER DEFAULT
  PRIVILEGES`). A new database needs that role to exist before the migration runs.
  - Those four lines leave `0001`.
  - `prepareDatabase` (`packages/db/src/bootstrap.ts`) applies the migrations, then grants the same
    four privileges to `APP_ROLE` itself, every run (idempotent).
  - Drizzle's migrator decides what to apply from the `created_at` of the last applied migration,
    not from a hash, so editing `0001` re-runs nothing on an existing database. A test proves it:
    a database migrated with the old `0001` runs the new bootstrap without error and keeps its
    rows.
  - `APP_ROLE` becomes `"wambito_app"` in PR A (§3.3). The log lines in `scripts/bootstrap.ts`
    print the role from `APP_ROLE` instead of a literal.
- **`restore.sh` restores without ACLs.** `pg_restore … --no-owner --no-acl`, then the bootstrap
  (not only `--role-only`), which grants to whatever `APP_ROLE` is. So a dump made under
  `lukas_app` restores on a server whose role is `wambito_app`. `backup.sh`'s verify step restores
  the same way. RLS policies do not name a role, so they come through unchanged.
- **Guests.** Migration `0007_guest_domain.sql`:
  `UPDATE "user" SET email = replace(email, '@guest.lukitas.invalid', '@guest.wambito.invalid')
  WHERE email LIKE '%@guest.lukitas.invalid'`. `GUEST_EMAIL_DOMAIN` changes in the same PR. For
  the few seconds between `migrate` and the new API, the old API does not see the new domain as a
  guest's; nothing is mailed, because the mailer already refuses every `.invalid` address
  (`apps/api/src/mailer.ts`).
- **Dev stack (repo root).** `name: wambito`; `POSTGRES_USER`/`POSTGRES_DB` `wambito`; role
  `wambito_app` in `docker/postgres/init.sql`, `.env.example`, `docker-compose.yml`, `config` and
  `passkey-origin` tests, `packages/db/src/testing.ts` and `packages/db/test/bootstrap.test.ts`.
  - The dev stack starts on a new, empty volume (the project name changed). The old dev volume is
    not touched; the README says how to list and remove it.
  - The fixed `name:` also keeps the stack's name when the Mac folder moves (§6).

### 3.2 PR B: the VPS names

- `deploy/personal`: `POSTGRES_USER`/`POSTGRES_DB` `wambito`; `DATABASE_URL`
  `postgres://wambito_app:…@postgres:5432/wambito`; external volume `wambito-personal-db`;
  `pg_dump`, `pg_restore` and `psql` with `-U wambito -d wambito`.
- The new stack starts empty, and `restore.sh` brings in the old stack's final dump (§4.2).

### 3.3 One role name, everywhere

`APP_ROLE` is the single source of the role name, and it becomes `wambito_app` in PR A, together
with the dev stack and the tests. On the VPS, between PR A and the cutover, this is harmless:

- the old compose still connects the API as `lukas_app` (its `DATABASE_URL`, unchanged until
  PR B);
- each deploy's bootstrap creates a second role, `wambito_app`, with the same password, and grants
  it the four privileges; nothing connects as it;
- `lukas_app` keeps the grants and default privileges the old `0001` gave it, so tables added by
  later migrations stay readable to it.

The extra role disappears with the old volume (§4.2, step 8). After PR A every tracked file says
`wambito_app`, except `deploy/personal` until PR B.

### 3.4 Tests

- The bootstrap on an empty database grants the four privileges to the role.
- A database migrated with the old `0001` (grants included) runs the new bootstrap and migrations
  without error.
- A dump made with role `lukas_app` restores into a database with role `wambito_app`, and the API
  role reads the rows under RLS.
- `0007` changes only guests' emails.

## 4. The server cutover (PR B and its runbook)

### 4.1 What changes in `deploy/personal`

- **Compose:** `name: wambito-personal`, images `wambito-{api,mcp,web}:personal`, external volume
  `wambito-personal-db`. Caddy's certificate volume (`web-caddy-data`) is scoped to the project
  name, so the runbook copies it to the new project's volume; Let's Encrypt is not asked again.
- **Units:** `wambito-backup.{service,timer}`, `wambito-deploy.{service,timer}`,
  `com.wambito.backup.plist`. `install-backup.sh` and `install-auto-deploy.sh` first disable and
  remove any `lukitas-*` units (and the old launchd label on macOS), so two timers never run.
- **Backups:** `wambito-YYYY-MM-DD.dump` and `wambito-YYYY-MM-DD-preupdate-HHMM.dump` in
  `~/Backups/wambito`; scratch database `wambito_verify`; bucket `wambito-backups` in the docs.
  Retention (`DAILY_DUMP`, `PREUPDATE_DUMP`) counts only the new prefix, so `lukitas-*` dumps are
  never pruned by the new stack. `restore.sh` accepts a file with either prefix.
- **`.env.example` and the README:** `DEPLOY_GITHUB_REPO=slinqer/wambito`; the tunnel name in the
  docs; the README loses every "until part 2b" note.
- **`auto-deploy.sh`:** its `curl` gains `-L`, so a future repository rename cannot stall the
  CI check with a 301.
- **Allowlist:** `deploy/personal/**` leaves it. Nothing in the folder names the old app.

### 4.2 The runbook (the founder runs it; the README's new "Moving from the old names" section)

1. **Before merging PR B:**
   - PR A is merged, deployed and working; the repository is already `slinqer/wambito`.
   - On the VPS: `sudo systemctl disable --now lukitas-deploy.timer`.
2. **Merge PR B.** Nothing deploys: the timer is off.
3. **The user `wambito`:**
   - `sudo adduser wambito`, add it to the `docker` group, copy `authorized_keys`.
   - Check `ssh wambito@<host>` from a second terminal before going on.
   - As `wambito`: `git clone git@github.com:slinqer/wambito.git ~/wambito`; copy the old
     `deploy/personal/.env` to `~/wambito/deploy/personal/.env` and change `DEPLOY_GITHUB_REPO`,
     `BACKUP_R2_BUCKET` and, if pinned, `DB_VOLUME_NAME`. The deploy key or token the old user
     used for GitHub is set up for the new one.
4. **R2:** create the bucket `wambito-backups` and a token scoped to it; put both in the new
   `.env`. The old bucket stays as an archive.
5. **The cutover (minutes without the app):**
   1. As the old user, in `~/lukitas/deploy/personal`: `./backup.sh` (the final, verified dump;
      it also goes to the old bucket).
   2. `docker compose -p lukitas-personal stop` (never `down -v`).
   3. Copy `lukitas-personal_web-caddy-data` into `wambito-personal_web-caddy-data` with a
      throwaway container.
   4. Copy the final dump to `~wambito/Backups/wambito/` (owned by `wambito`).
   5. As `wambito`: `./up.sh --skip-web` (creates the empty volume, migrates, sets the role), then
      `./restore.sh <final dump>`.
   6. `./smoke.sh`, then sign in at `app.wambito.com`, and check the MCP answers.
6. **New units, as `wambito`:** `./install-backup.sh`, `./install-auto-deploy.sh`, then
   `./backup.sh` once by hand: it ends with `In R2: wambito-backups/wambito-….dump.age`.
7. **Rollback, if step 5 or 6 fails:** `docker compose -p wambito-personal down` (no `-v`),
   `docker compose -p lukitas-personal start`, `sudo systemctl enable --now lukitas-deploy.timer`
   and the old backup timer. Nothing is lost: the old volume was never written.
8. **After a week without problems (the founder decides):** remove the volume
   `lukitas-personal-db`, the `lukitas-*` images, the old user (`sudo deluser --remove-home`), the
   old bucket once its 14-day retention has passed, and the old tunnel if one exists.

### 4.3 Tests

- The existing `test-*.sh` scripts with the new names.
- New: the install scripts remove `lukitas-*` units before installing the new ones.
- `test-compose-files.sh` checks the project name and the volume name.
- Retention ignores `lukitas-*` files.
- `restore.sh` accepts a `lukitas-*.dump`.

## 5. The transition, the repository, the Worker and the models (PR A)

### 5.1 Removing the part 2a transition

- **API:** `client-headers.ts` reads only `x-wambito-*` (kept as a plain accessor, or inlined if it
  becomes trivial); the comment in `session.ts`; the tests of the fallback. The `sign-in-email`
  test that names the old mascot keeps checking that the email says "Wambi" and no longer names
  the old one.
- **Web:** `stored.ts` reads and writes only `wambito.*`, with no copy from an old key; the same in
  the inline script of `theme-bootstrap.ts`; their tests.
- **App:** `migrate_keys.dart` (and its call at start-up) and `Migration.kt` go; the old
  preference file and widget-snapshot names go; `lukitas://` leaves the manifest, and
  `_oldLaunchScheme` leaves `launch_links.dart` and `LaunchLinks.kt`; the note in
  `NoticeSettings.kt`; their Dart and Kotlin tests, `manifest_test` and `widget_android_test`.
  A shortcut still pinned as `lukitas://` stops opening; accepted (only the founder's phones).
- **Allowlist:** every `2b: remove` entry leaves. `arb_parity_test` and `landing.spec.ts` keep only
  what remains (`money`).

### 5.2 The repository

- **The founder renames it on GitHub (Settings → Rename) before merging PR A.** GitHub redirects
  the old web URLs and git remotes, so `git fetch` on the VPS keeps working. It does not follow
  the API: `auto-deploy.sh` asks for check runs with `curl -fsS` (no `-L`) and gets a 301, so the
  CI state reads "pending" forever and PR A never deploys. The VPS runs the script it already
  has, so the fix is a step on the VPS, right after the rename: `git -C ~/lukitas remote set-url
  origin <the new URL, in the form the VPS uses, SSH or HTTPS>`, and `DEPLOY_GITHUB_REPO=
  slinqer/wambito` in its `deploy/personal/.env` if that variable is set there.
- PR A: `GITHUB_HREF`, the landing's e2e and stories, the four fastlane descriptions, the
  licence strings in the four ARB files, the README and the docs.
- The Mac's remote: `git remote set-url origin git@github.com:slinqer/wambito.git`.

### 5.3 The voice models

`apps/mobile/lib/capture/models_download.dart` points at
`https://github.com/slinqer/wambito/releases/download/voice-models-v1`. The release moves with the
repository; the redirect covers any APK that still has the old URL. Its test checks the new URL.

### 5.4 The landing Worker

- `deploy/landing/wrangler.jsonc`: `"name": "wambito-landing"`, same custom domain `wambito.com`.
  CI deploys it as a new Worker.
- The domain is attached to `lukitas-landing` today. Checked in wrangler 4.151.3 (the version CI
  pins): without a TTY, `wrangler deploy` sets `override_existing_origin`, so CI moves
  `wambito.com` to the new Worker with no gap. The founder deletes `lukitas-landing` afterwards.
  If the move fails anyway, CI's deploy step fails and the old Worker keeps serving; the fix is to
  detach the domain from `lukitas-landing` in the dashboard and re-run the job.

### 5.5 Docs

- `docs/deploy/landing.md`; `docs/mobile/release.md` (the key's new folder and file; the alias
  stays); `docs/mobile/setup.md` (AVD `wambito-api36`, and how to delete the old one).
- The `AGENTS.md` files (root and areas) lose the "part 2b keeps these names" list and the
  transition rules; the root map's history section points at this spec.

## 6. The close on the Mac, the guard, and the order

### 6.1 The signing key

1. `mkdir -p ~/.wambito-signing && chmod 700 ~/.wambito-signing`; copy the key to
   `~/.wambito-signing/wambito-release.p12`, `chmod 600`.
2. `keytool -list -keystore ~/.wambito-signing/wambito-release.p12 -alias lukitas` prints the same
   SHA-256 as the one written next to the backup.
3. Only then remove `~/.lukitas-signing`. The backup in the password manager is unchanged: it is
   the same key.

### 6.2 The emulator

Create `wambito-api36` with the command in `setup.md`; `avdmanager delete avd -n lukitas-api36`.

### 6.3 The guard

- Allowlist reasons: `money`, `history`, `docs-rule`, `key-alias`. `2b` and `2b: remove` go.
- `scripts/check-old-name.sh` fails on an allowlist line whose reason is not one of these, with a
  test.
- Each PR leaves the allowlist with what it still needs: PR A drops the transition and repository
  entries; PR B drops `deploy/personal/**` and the last `2b` entries.

### 6.4 The Mac folder (last: it ends the Claude session that ran this)

1. Close Claude; `docker compose stop` in the dev stack.
2. `mv ~/projects/lukas ~/projects/wambito`.
3. Move Claude's memory folder with it: `~/.claude/projects/-Users-<user>-projects-lukas` →
   `~/.claude/projects/-Users-<user>-projects-wambito`; update the memory notes that call part 2b
   pending.
4. Open Claude in `~/projects/wambito` and check the memory loads; `pnpm install`;
   `docker compose up -d` (same stack: its `name:` is fixed).

### 6.5 The order

1. Rename the repository on GitHub; update the Mac's remote, and the VPS's the same way
   (`git -C ~/lukitas remote set-url origin <new URL>`, plus `DEPLOY_GITHUB_REPO` in its `.env`
   if set), so auto-deploy can read the CI state.
2. PR A: merge → auto-deploy; build and install the APK; check the landing (new Worker).
3. PR B: switch the deploy timer off → merge → the cutover runbook (§4.2).
4. Move the signing key; new AVD.
5. Move the Mac folder and Claude's memory.
6. After a week: delete the old volume, user, bucket, Worker and images.

## 7. Verification

- **CI green** after each PR: lint, typecheck, vitest, web e2e, Flutter and Kotlin tests, the
  deploy test scripts, the guard.
- **After PR A:** a sign-in works; a guest account still works (its email now under
  `guest.wambito.invalid`); the landing answers at `wambito.com`; the APK opens with the session
  intact and its widgets and links work.
- **After the cutover:** `docker ps` shows `wambito-personal-*` only; `smoke.sh` passes; sign-in and
  the MCP answer; a backup reaches `wambito-backups`; the next `main` merge deploys by itself from
  `wambito-deploy.timer`.
