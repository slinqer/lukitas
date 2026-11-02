# Wambito part 2a (the name in the code and in what people see) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One pull request that renames the app to Wambito and its mascot to Wambi everywhere people
read or code refers to them. The money slang and the part-2b infrastructure names stay. Transition
shims keep the installed app working until the new APK lands.

**Architecture:**
- The rename goes area by area, each task with its own green test run:
  1. packages and server;
  2. web;
  3. Flutter;
  4. Android;
  5. docs;
  6. a guard.
- Contracts between clients and the server go through one small helper per side:
  - **headers:** the new name first, the old one as fallback;
  - **stored keys:** migrate the old key once on read.
- An allowlist file names every legitimate remaining `luk*`, and a CI guard enforces it.

**Tech Stack:** pnpm/turbo TypeScript (Hono API, React Router web, MCP SDK), Flutter/Dart,
Kotlin/Android (WorkManager, Glance/RemoteViews widgets, SharedPreferences), Biome, Vitest,
Playwright, Flutter test, Gradle unit tests.

**Spec:** `docs/superpowers/specs/2026-11-02-wambito-part-2a-rename-design.md`

## Global Constraints

- **App** → `Wambito` / `wambito` / `WAMBITO_`. **Mascot** → `Wambi` / `wambi` / `WAMBI_`.
  **Internal** → `@wambito/*`, the Dart package `wambito`, `x-wambito-*`, `wambito.*` keys,
  `wambito://`, the DOM event `wambito:feedback`, the test domain `wambito.test`.
- **Never renamed (money):**
  - the words «luka/lukas/luca/lucas/palo(s)» in copy, the parser and grammar
    (`apps/mobile/lib/capture/**`), and the amount format (`lib/money/format.dart`);
  - `lukasHint` and its uses;
  - the MCP server instructions' luka lines;
  - every test asserting these.
- **Never renamed in 2a (part 2b):**
  - `lukas_app` and `lukas` (database), the `lukitas` admin user, `DB_VOLUME_NAME` and
    `lukitas-personal-db`;
  - the compose project `lukitas-personal`, `lukitas-backup.*`/`lukitas-deploy.*`,
    `com.lukitas.backup.plist`, `lukitas-*.dump`, `~/Backups/lukitas*`, the bucket
    `lukitas-backups`;
  - `DEPLOY_GITHUB_REPO`/`slinqer/lukitas`, the GitHub URL, and backup.sh/restore.sh/lib.sh dump
    and folder names.
- History: nothing under `docs/superpowers/**` changes (this spec and plan included).
- Passkey `rpID` stays `new URL(WEB_URL).hostname`; only `rpName` becomes `"Wambito"`.
- MCP tool names, scopes and `/mcp` do not change; the server's name/title become
  `wambito`/`Wambito`.
- `MAIL_FROM` default: `Wambito <hola@wambito.com>`.
- Android `applicationId`/`namespace` stay `com.wambito.app`. The APK file name becomes
  `wambito-<versionName>-<abi>.apk`.
- **Do not edit** `apps/web/app/features/landing/money-words.ts` or `MoneyHeadline.tsx`: a
  parallel branch (`landing-money-words-i18n`) changes them.
- Commits: repository style, no `Co-Authored-By` line. CI lint is `biome check .`. Gradle needs
  `JAVA_HOME=/Users/andirsun/development/jdk/jdk-17.0.21+9/Contents/Home`.
- Every `luk*` left after a task is either money, 2b, history, or transition code. Transition code
  is marked with a comment containing `2b: remove`.

## Review Focus

1. **An installed APK (old headers) against the new server.** A request with only `x-lukas-*` must
   behave exactly as before (locale, timezone, `background`, `client`, `next`). Pinned in Task 1.
2. **A person with old stored keys** (web `lukas.*`, app SharedPreferences files `lukitas.*`, the
   widget snapshot key). They stay signed in with the same theme, view, sound, passkey-offer state,
   notice settings and widget data, and a second read does not resurrect the old key.
   Pinned in Tasks 2 and 4.
3. **Scheduled background work across the update.** Old WorkManager unique names
   (`lukitas.widget.refresh`, `lukitas.widget.midnight`, `lukitas.notice.due`,
   `lukitas.notice.guest`) must not keep firing next to the renamed ones. No notice may fire twice.
   Pinned in Task 4.
4. **Pinned `lukitas://` links and shortcuts** still open the right screen; links the app builds
   use `wambito://`. Pinned in Tasks 3 and 4.
5. **Money slang caught by the rename.** «3 lukas», `(25 lukas)`, `lukasHint`, and the amounts
   parser must still pass their existing tests unchanged; a diff touching
   `apps/mobile/lib/capture/**` or `lib/money/format.dart` beyond imports is a defect.
   Pinned in Task 3 (the existing tests are the pin) and by the Task 6 allowlist.

---

### Task 1: Packages, API and MCP

**Files:**
- Modify:
  - every `package.json` name and `@lukas/*` dependency, import and `--filter` (152 files:
    workspace packages, `apps/*`, root scripts, `.github/workflows/ci.yml`,
    `deploy/personal/up.sh`, Dockerfiles, docs that show commands);
  - `pnpm-lock.yaml`, regenerated with `pnpm install`.
- Create: `apps/api/src/http/client-headers.ts`.
- Modify:
  - `apps/api/src/auth.ts` and `apps/api/src/http/session.ts` (read headers through the helper);
  - `apps/api/src/emails/sign-in.ts` (subject, heading, body; es, en, it, pt) and `mailer.ts`;
  - `auth.ts` (`rpName: "Wambito"`);
  - `apps/mcp/src/app.ts` (`name: "wambito", title: "Wambito"`);
  - `LUKITAS_VERSION` → `WAMBITO_VERSION` in `apps/{api,mcp}/src/config.ts`, the Dockerfiles,
    `deploy/personal/up.sh` and `docker-compose.yml`;
  - the `MAIL_FROM` default in `deploy/personal/docker-compose.yml` and `.env.example`;
  - `LUKAS_TEST_DB` → `WAMBITO_TEST_DB` (`packages/db/src/testing.ts`, CI, docs);
  - test domains `lukas.test` → `wambito.test` across `apps/**/test`;
  - the `Lukitas` interface/types in `packages/ai-assistant-tools` and `apps/mcp`
    (`Lukitas` → `Wambito`, `apiLukitas` → `apiWambito`, `api-lukitas.ts` → `api-wambito.ts`,
    `lukitasFor` → `wambitoFor`).
- Test: `apps/api/test/client-headers.test.ts` (new); existing API, MCP and ai-assistant-tools
  tests updated.

**Interfaces:**
- Produces:
  - `clientHeader(headers: Headers, name: "locale" | "next" | "timezone" | "client" | "background"): string | undefined`.
    It returns `x-wambito-<name>` if present, else `x-lukas-<name>` (marked `2b: remove`).
  - Header names the clients send: `x-wambito-locale`, `x-wambito-next`, `x-wambito-timezone`,
    `x-wambito-client`, `x-wambito-background`.

- [ ] **Step 1: Write `client-headers.test.ts`:**
  - `new wins over old`: both present → the new value;
  - `old alone still works`: only `x-lukas-timezone: Europe/Lisbon` → `"Europe/Lisbon"`;
  - `neither` → `undefined`.

  Also add one API integration case per header to the existing auth/session tests: a request with
  only the `x-lukas-*` form behaves exactly as one with `x-wambito-*` (locale picks the email
  language, timezone sets the new profile, `background: 1` does not slide the session).
- [ ] **Step 2: Run them and see them fail.**
  `pnpm vitest run apps/api/test/client-headers.test.ts`: FAIL (module missing).
- [ ] **Step 3: Implement the helper, and route every header read in `auth.ts` and `session.ts`
  through it.**
- [ ] **Step 4: Do the renames in Files.**
  - Keep the money lines of the MCP server instructions as they are.
  - The email copy: "Wambito" wherever "Lukitas" was. Wherever the mascot speaks, "Wambi".
- [ ] **Step 5: Run the checks.**
  - `pnpm install`;
  - `pnpm -s biome check .`;
  - `pnpm typecheck`;
  - `pnpm vitest run apps/api apps/mcp packages`;
  - `git grep -n "@lukas/" -- . ':!docs/superpowers'` prints nothing.
- [ ] **Step 6: Commit.**
  `git commit -m "refactor: the packages are @wambito/*, the API reads x-wambito-* (and x-lukas-* until 2b), mail and MCP say Wambito"`

### Task 2: Web

**Files:**
- Create: `apps/web/app/lib/stored.ts`.
- Modify:
  - `apps/web/app/features/home/home-storage.ts`, `apps/web/app/feedback/feedback.ts`,
    `apps/web/app/theme/ThemeProvider.tsx`, `apps/web/app/theme/theme-bootstrap.ts`,
    `apps/web/app/auth/passkey.ts`, and every other `localStorage` user (read and write through
    `stored.ts`);
  - the API client: the headers it sends become `x-wambito-*`, as in `features/sign-in` and any
    fetch wrapper;
  - every message catalog `apps/web/app/i18n/messages/*.json` (es, en, it, pt: app name →
    Wambito, mascot → Wambi);
  - the mascot components, CSS (`.lk-lukas*` → `.lk-wambi*`), `data-lukas-*` → `data-wambi-*`,
    `LukasMessageKey` → `WambiMessageKey`, `TravelingLukas` → `TravelingWambi`, and assets;
  - the DOM event `lukas:feedback` → `wambito:feedback`;
  - `<title>`, meta, the web manifest, Storybook stories, e2e specs, landing copy (except the
    two money-words files), and the share images' text.
- Test: `apps/web/app/lib/stored.test.ts` (new), `theme-bootstrap.test.ts`, and the existing unit,
  Storybook and e2e tests.

**Interfaces:**
- Consumes: Task 1's header names.
- Produces:
  - `readStored(name: string): string | null`. `name` is the part after the prefix, e.g.
    `"theme"`. It reads `wambito.<name>`. If that is missing and `lukas.<name>` exists, it writes
    the value to `wambito.<name>`, removes `lukas.<name>` and returns the value. It never throws;
    storage errors return `null`. The migration is marked `2b: remove`.
  - `writeStored(name: string, value: string): void` and `removeStored(name: string): void`.
  - Keys used: `theme`, `home.view`, `sound`, `passkey.offered`, `passkey.used`, `demo.lang`.

- [ ] **Step 1: Write `stored.test.ts`:**
  - `migrates once`: old `lukas.theme=day` → returns `day`, `wambito.theme=day` is set and
    `lukas.theme` is gone;
  - `new wins`: both set → the new value, and the old one is removed;
  - `storage throws` → `null`.

  Extend the bootstrap test: with only `lukas.theme=day` in a jsdom document, the script sets
  `data-theme="day"` and moves the key.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement `stored.ts`, mirror it inline in `THEME_BOOTSTRAP_SCRIPT`, and switch
  every `localStorage` user to it.**
- [ ] **Step 4: Do the renames in Files.**
- [ ] **Step 5: Run the checks.**
  - `pnpm -s biome check .`;
  - `pnpm typecheck`;
  - `pnpm vitest run apps/web`;
  - with the dev stack up (`E2E_NOW=… docker compose up -d --build`; stop it afterwards if you
    started it): `pnpm --filter @wambito/web e2e`, `e2e:landing`, `e2e:landing-only` and
    `e2e:landing-only-app`.

  Update the e2e localStorage assertions to `wambito.*`, and add one e2e case: a page loaded with
  `lukas.theme=day` shows the day theme.
- [ ] **Step 6: Commit.**
  `git commit -m "refactor(web): Wambito and Wambi everywhere, stored keys move from lukas.* once"`

### Task 3: Flutter (Dart)

**Files:**
- Modify:
  - `apps/mobile/pubspec.yaml` (`name: wambito`, the description);
  - every `package:lukitas/` import (237 files);
  - `build.yaml`/`l10n.yaml` if they name the package;
  - classes and files: `LukitasApp`, `LukitasTheme`, `LukitasTokens`, `LukitasColors`,
    `LukitasShadows`, `LukitasMood`, `LukitasFace` (`lukitas_face.dart`), the mascot's `Lukas*`
    (`lukas_line.dart`, `LukasBubble`, `LukasMood`, `LukasPose`, `Lukas3D`, `LUKAS_ART`),
    `precacheLukitas`, `MemoryLukitas`, the generated API client folder
    `lib/api/gen/lukitas_api.dart` (regenerate with the repo's generator under its new name), and
    `lib/theme/tokens.g.dart`'s class names (regenerate);
  - `apps/mobile/assets/lukas/` → `assets/wambi/` (in pubspec too);
  - the ARB files (es, en, it, pt) and the generated `app_localizations*.dart`;
  - `lib/api/device.dart` and the HTTP client: send `x-wambito-*`;
  - `lib/launch/launch_links.dart`: it parses `wambito` and `lukitas` (marked `2b: remove`) and
    builds only `wambito`;
  - `lib/home/widget_snapshot.dart`: the key `wambito.widget.snapshot`, plus the receivers'
    class names from Task 4;
  - the test files and parity snapshots (`test/parity/**/lukas-*.png` → `wambi-*.png`, with
    `git mv`).
- Create: `apps/mobile/lib/storage/migrate_keys.dart`.
- Test: `apps/mobile/test/storage/migrate_keys_test.dart` (new), `launch_links_test.dart`, and the
  existing suite.

**Interfaces:**
- Consumes: Task 1's header names.
- Produces:
  - `Future<void> migrateStoredKeys(SharedPreferencesAsync prefs)`. Use whatever prefs API the app
    already uses. It runs once at startup, before anything reads prefs. For every key in the app's
    own SharedPreferences whose name starts with `lukitas.` or `lukas.`, it copies the value to the
    `wambito.`-prefixed key if that is unset, then removes the old one. It is idempotent and marked
    `2b: remove`.
  - `parseLaunchLink(Uri)` accepts `wambito://` and `lukitas://`; the link builders emit
    `wambito://`.
  - Widget snapshot key: `wambito.widget.snapshot`, which Task 4's Kotlin reads.

- [ ] **Step 1: Write `migrate_keys_test.dart`:**
  - `copies and removes`: `lukitas.widget.snapshot` → `wambito.widget.snapshot`;
  - `does not overwrite a new key`;
  - `second run is a no-op`.

  Add launch-link cases: `lukitas://capture` and `wambito://capture` both parse to the capture
  route; the builder outputs `wambito://`.
- [ ] **Step 2: Run them and see them fail.**
  `cd apps/mobile && flutter test test/storage test/launch`.
- [ ] **Step 3: Implement both, and call `migrateStoredKeys` in `main.dart` before the app reads
  prefs.**
- [ ] **Step 4: Do the renames in Files.**
  - Imports first (pubspec `name` and a sed of `package:lukitas/`).
  - Then classes and files with `git mv`.
  - Then the ARB copy.
  - Regenerate the l10n, API client and tokens outputs with the commands CI checks.
- [ ] **Step 5: Run the checks.**
  - `flutter pub get`;
  - `flutter analyze`;
  - `flutter test --exclude-tags golden`, plus the parity and golden suite the repo runs locally;
  - the generated-code checks from CI (`tokens.g.dart` and `lib/api/gen` up to date);
  - `git diff --stat main -- apps/mobile/lib/capture apps/mobile/lib/money/format.dart` shows
    import-only changes.
- [ ] **Step 6: Commit.**
  `git commit -m "refactor(mobile): the Dart package is wambito; Wambito and Wambi in the app"`

### Task 4: Android (Kotlin, manifest, release)

**Files:**
- Modify:
  - `AndroidManifest.xml`:
    - `android:label="Wambito"`;
    - an intent-filter `<data android:scheme="wambito" …/>` for add, capture, due, progress and
      home, keeping the `lukitas` entries (comment `2b: remove`);
    - the renamed receiver classes;
  - classes and resources:
    - `LukitasSmallWidget`/`LukitasMediumWidget` and their receivers → `Wambito…`;
    - `res/xml/lukitas_{small,medium}_widget.xml` → `wambito_…`;
    - the `widget_lukitas`/`lukitas_night_bg` resource names → `widget_wambito`/`wambito_night_bg`;
    - string resources naming the app;
  - `LaunchLinks.SCHEME = "wambito"`, with `lukitas` still accepted;
  - `FileTransfer.FALLBACK_NAME = "wambito"`;
  - header names in `notices/NoticeApi.kt` and `widget/SummaryFetcher.kt` → `x-wambito-*`;
  - WorkManager unique names (`RefreshScheduler.PERIODIC`/`MIDNIGHT`, `NoticeScheduler.DUE`/`GUEST`)
    → `wambito.*`;
  - SharedPreferences file names (`RefreshScheduler.PREFS`, `NoticeSettings.FILE`,
    `VoiceModels.FILE`) and `WidgetSnapshot.KEY` → `wambito.*`/`wambito_voice`;
  - notification channel ids, if they carry the old name;
  - `apps/mobile/scripts/release.sh` and `release-lib.sh`: the `WAMBITO_KEYSTORE`,
    `WAMBITO_KEY_ALIAS`, `WAMBITO_KEYSTORE_PASSWORD` and `WAMBITO_KEY_PASSWORD` variables, and
    APK names `wambito-<v>-<abi>.apk`;
  - `test-release.sh`, `check-permissions.sh`, `run-integration-tests.sh`;
  - `LUKITAS_SERVER` → `WAMBITO_SERVER` (`build.gradle.kts`, `server_address.dart` in Task 3's
    files if not done there);
  - CI's release step variables;
  - the fastlane texts (four languages): "Wambito", plus a line in the next changelog saying
    widgets and the tile must be added again once.
- Create: `apps/mobile/android/app/src/main/kotlin/com/wambito/app/Migration.kt`.
- Test: `src/test/kotlin/com/wambito/app/MigrationTest.kt` (new), the manifest tooling tests,
  `LaunchLinksTest.kt`, and the existing Kotlin tests.

**Interfaces:**
- Consumes: Task 3's `wambito.widget.snapshot` key and launch-link schemes.
- Produces: `object Migration { fun run(context: Context) }`, called first in
  `Application`/`MainActivity` and at the start of every Worker and widget receiver. Marked
  `2b: remove`. It:
  1. copies every entry of the old SharedPreferences files (`lukitas.widget.refresh`,
     `lukitas.notices`, `lukitas_voice`) into the new ones when the new file is empty, then
     deletes the old files;
  2. calls `WorkManager.cancelUniqueWork` for the four old unique names;
  3. deletes old notification channels, if their ids changed;
  4. records a done-flag so it runs once.

- [ ] **Step 1: Write `MigrationTest.kt`** (Robolectric or the repo's existing Android test setup):
  - `prefs carried over`: values in old files appear in the new ones, and the old files are gone;
  - `old unique work cancelled`: with WorkManager's test driver, old-name work enqueued before is
    cancelled, and only new-name work remains;
  - `runs once`.

  In `LaunchLinksTest`: both schemes resolve; the builder uses `wambito`. In the manifest tooling
  test: both schemes are present for all five hosts.
- [ ] **Step 2: Run them and see them fail.**
  `JAVA_HOME=… ./gradlew :app:testDebugUnitTest --console=plain`.
- [ ] **Step 3: Implement `Migration`, wire its calls, and do the renames in Files.**
- [ ] **Step 4: Run the checks.**
  - Gradle unit tests green;
  - `cd apps/mobile && flutter build apk --debug`, then `aapt2 dump badging`: package
    `com.wambito.app`, `application-label:'Wambito'`;
  - `scripts/test-release.sh` and `scripts/check-fastlane.sh` green.
- [ ] **Step 5: Commit.**
  `git commit -m "refactor(android): Wambito on the phone; prefs, work and links carried over from lukitas"`

### Task 5: Live docs and deploy texts

**Files:**
- Modify:
  - `README.md`, `CONTRIBUTING.md`, `docs/privacy-policy.md`;
  - `deploy/personal/README.md` and `.env.example`: the product name only; 2b names stay;
  - `docs/deploy/*`, `docs/mobile/*` (including `release.md`'s `WAMBITO_*` variables and APK
    names), `docs/design/**` (`components/Lukas/` → `components/Wambi/`, the mascot README),
    and `docs/i18n/*`;
  - `deploy/landing/wrangler.jsonc`: only its comment; the Worker name `lukitas-landing` is 2b.
- Test: `pnpm -s biome check .`, and the markdown/link checks CI runs, if any.

- [ ] **Step 1: Do the renames by the name map.**
  - Wherever a doc shows a 2b name (a unit, volume, bucket, dump, folder or the repo URL), leave
    it.
  - Where a doc mentions both names, add the clarifying words "(renamed in part 2b)".
- [ ] **Step 2: Run the checks.**
- [ ] **Step 3: Commit.**
  `git commit -m "docs: Wambito and Wambi in the live docs"`

### Task 6: The allowlist and the guard

**Files:**
- Create: `.github/name-allowlist.txt`, one entry per line: `<git pathspec>  # <reason>`. The
  reason is one of `money`, `2b`, `2b: remove`, `history`.
- Create: `scripts/check-old-name.sh`.
- Modify: `.github/workflows/ci.yml` (the `check` job, next to the domain guard).

**Interfaces:**
- Produces: `scripts/check-old-name.sh`. It runs
  `git grep -n -I -i -E 'luk''itas|\bluk''as\b' -- . <one :!exclude per allowlist pathspec>`,
  prints the hits and exits 1 on any. The script and the allowlist file match neither themselves
  nor each other: use split patterns, and put both in the excludes.

- [ ] **Step 1: Write the allowlist** from what Tasks 1–5 left.
  - Money: `apps/mobile/lib/capture/**`, `apps/mobile/lib/money/format.dart` and their tests, the
    landing money-words files, and the MCP instructions file.
  - 2b: `deploy/personal/{lib,backup,restore,install-*,uninstall-*,auto-deploy}.sh`, the units,
    the plist, `docker-compose.yml`'s project/volume lines, and `wrangler.jsonc`.
  - Transition: the helpers from Tasks 1–4.
  - History: `docs/superpowers/**`.

  Prefer file-level entries. Where a file mixes money and app names (e.g. an ARB file), do not
  allowlist it: rename the app names, and let the guard's `\bluk..s\b` match only the slang lines,
  then list those files with reason `money`.
- [ ] **Step 2: Run the guard.** `scripts/check-old-name.sh` prints nothing and exits 0. Plant
  `Lukitas` in a tracked file: it exits 1. Then revert the plant.
- [ ] **Step 3: Add the CI step** after the domain guard:
  `- run: scripts/check-old-name.sh`, with a one-line comment.
- [ ] **Step 4: Run the whole suite as CI does:**
  - lint, typecheck, `pnpm test`;
  - the five deploy test scripts;
  - web e2e (all four);
  - Flutter analyze/test/check-fastlane/test-release;
  - Gradle unit tests;
  - both guards.
- [ ] **Step 5: Commit.**
  `git commit -m "ci: no Lukitas or Lukas outside the allowlist"`

### Task 7: Agent maps (AGENTS.md + CLAUDE.md)

Added at the founder's request (2026-11-02). The goal: an agent working in any area learns what it
is, where to start and how to test it without reading the code. That keeps tokens low.

**Files:**
- Create `AGENTS.md` and `CLAUDE.md` in:
  - the repo root;
  - `apps/api`, `apps/web`, `apps/mcp`, `apps/mobile`;
  - each `packages/*`;
  - `deploy/personal`, `deploy/landing`;
  - `docs`.
- Each `CLAUDE.md` holds exactly one line: `@AGENTS.md`.
- Modify `CONTRIBUTING.md`: one line saying that whoever changes an area's structure, commands or
  conventions updates its `AGENTS.md`.

**What each `AGENTS.md` contains:**
- Root: at most ~120 lines. Others: at most ~60 lines.
- Pointers, not code: exact paths, no prose about what the code obviously does.
- **Root:**
  - the monorepo map (one line per folder: what it is and the path of its AGENTS.md);
  - the toolchain and the commands CI runs;
  - the cross-cutting rules:
    - money slang («lukas/luka/palo», `lukasHint`) is never renamed;
    - the 2b infrastructure names stay until part 2b;
    - `docs/superpowers/**` is history;
    - never read `deploy/personal/.env` or any secret;
    - Gradle needs JDK 17 (`JAVA_HOME` path);
    - lint is `biome check .`;
    - web e2e needs the dev stack;
    - generated files (`tokens.css`, `schema.d.ts`, `lib/api/gen`, `tokens.g.dart`, l10n) are
      regenerated, not hand-edited, with the command;
    - commit style, and no `Co-Authored-By`;
  - which spec/plan docs explain what, read only when needed.
- **Per area:**
  - its purpose;
  - entry points (files);
  - how it talks to the other areas (API routes and auth, headers, MCP → API, app → API, Caddy
    routes);
  - how to run and test it (exact commands);
  - conventions;
  - known traps, e.g.:
    - the Caddy `vars` ordering (`route {}` runs after the handles);
    - `COMPOSE_FILE` selects tunnel or direct;
    - WorkManager unique names;
    - migrations are drizzle and run as admin;
    - RLS with `lukas_app`;
    - the parity snapshots.

**Source:** the Task 1–6 reports in the plan's SDD workspace (each implementer already walked its
area), plus targeted reads to confirm. Do not crawl whole trees. Every path named must exist.

- [ ] **Step 1: Write the files** from the reports, checking each path and command.
- [ ] **Step 2: Verify.**
  - A script checks that every backticked repo path in every `AGENTS.md` exists
    (`git ls-files` / `test -e`), and that each `CLAUDE.md` is exactly `@AGENTS.md`.
  - Line counts are within the limits.
  - `scripts/check-old-name.sh` (Task 6) still passes. Mentions of money slang or 2b names are
    rules, and the files get an allowlist entry with reason `docs-rule` if needed.
- [ ] **Step 3: Commit.**
  `git commit -m "docs: AGENTS.md maps for every area, so agents start from the right file"`

---

After merge, the rollout is spec §5. Run it together with the founder:
1. the VPS auto-deploys;
2. set `MAIL_FROM=Wambito <hola@wambito.com>` in its `.env`, then `./up.sh --skip-web`;
3. build the APK with the `WAMBITO_*` variables;
4. install it over the current app.
