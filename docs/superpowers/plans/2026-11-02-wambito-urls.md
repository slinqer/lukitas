# Wambito part 1 (URLs, no andersonlaverde.com) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One pull request that moves every host, address and package name off `andersonlaverde.com`
onto `wambito.com`, and lets the personal install be served directly by a server (Caddy with its own
certificate) instead of through a Cloudflare tunnel.

**Architecture:**
- Tasks 1, 2 and 5 are value swaps, proven by the existing tests changed with them and a CI guard.
- Tasks 3 and 4 change `deploy/personal`:
  - Caddy's routes move into one shared snippet, and the client's address becomes a single variable
    each way of serving sets.
  - A `direct` way (a compose override plus `Caddyfile.direct`) is chosen through `COMPOSE_FILE` in
    `.env`.
  - Both are tested against real Caddy containers.

**Tech Stack:** Caddy 2.11, Docker Compose v2 (`!override` needs ≥ 2.24.4), bash 3.2-compatible
scripts, Flutter/Kotlin (Android), React Router web app, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-02-wambito-urls-design.md`

## Global Constraints

- App host `app.wambito.com`; landing host `wambito.com`; with `https://` where a URL is meant.
- Android `applicationId` and `namespace`: `com.wambito.app`. Kotlin class names do not change.
- Sender and feedback address: `hola@wambito.com`. The `MAIL_FROM` default is
  `Lukitas <hola@wambito.com>`; the display name changes in part 2.
- Out of scope (part 2): the visible name, the mascot, `@lukas/*`, `lukas_app`, `x-lukas-*`, storage
  keys, `LUKITAS_*` variables, volume, bucket, unit and tunnel names (`lukitas-personal` stays the
  example name for home installs).
- History is not edited: `docs/superpowers/**` keeps every old name.
- Tunnel mode behaves exactly as today. It stays the default when `COMPOSE_FILE` is unset.
- Scripts in `deploy/personal` keep working with macOS's bash 3.2 (see `lib.sh`).
- Commit messages follow the repository's style (`feat(deploy): …`, `chore(mobile): …`). No
  `Co-Authored-By` line.

## Review Focus

1. **The server's own updates.** `update.sh` and the automatic deploy call `up.sh` with no flags.
   Expected: they stay `direct`, never ask for `TUNNEL_ID` and never start `cloudflared`.
   Pinned in Task 4, `test-compose-files.sh`.
2. **A request with a made-up client address, sent straight to the server.** It carries
   `Cf-Connecting-Ip` or `X-Forwarded-For`. Expected: the API is told the TCP peer's address, and
   the log records it. Pinned in Task 4, `test-caddy.sh` (direct cases).
3. **A public request that does not name `app.wambito.com`.** For example `Host: 127.0.0.1`, or a
   bare IP, on port 80 or 443. Expected: it never gets the app or the API over plain HTTP.
   Pinned in Task 4, `test-caddy.sh`.
4. **Merging the compose files.** Compose appends `ports` lists. Expected: in `direct` the web
   container publishes exactly `127.0.0.1:${WEB_PORT}→8080`, `80`, `443/tcp` and `443/udp`; no host
   port bound twice; `smoke.sh` on `127.0.0.1:8088` reaches the app, not a redirect.
   Pinned in Task 4, `test-compose-files.sh`.
5. **Names written out in full** (widget receivers, the launch-link alias, the App Link package).
   Expected: after the package move, the widgets still update and sign-in links still open the app.
   Pinned in Task 2, by the existing `widget_android_test.dart`, Kotlin unit tests and
   `open-in-app.test.ts`, with their expectations changed to `com.wambito.app`.

---

### Task 1: Hosts and mail addresses move to wambito.com

**Files** (every non-history file with one of the four strings below, as of 2026-11-02):
- Modify:
  - `.github/workflows/ci.yml` (landing job URLs and its zone comment);
  - `deploy/landing/wrangler.jsonc`;
  - `apps/web/scripts/build-landing.ts`;
  - `apps/web/app/features/settings/feedback.ts`;
  - `apps/mobile/lib/api/{server_address,client}.dart`, `apps/mobile/lib/settings/feedback.dart`;
  - `apps/mobile/android/app/build.gradle.kts` (`default_server`) and
    `apps/mobile/android/app/src/main/AndroidManifest.xml` (App Link host);
  - `deploy/personal/{docker-compose.yml,cloudflared.yml,up.sh,smoke.sh,.env.example,README.md}`
    (in the README, hostnames and addresses only; Task 4 rewrites its server sections);
  - `docs/deploy/landing.md`, `docs/mobile/fdroid.md`;
  - `apps/mobile/fastlane/metadata/android/*/full_description.txt`.
- Test:
  - `apps/web/app/site/origin.test.ts`, `apps/web/app/features/landing/links.test.ts`,
    `apps/web/app/features/settings/feedback.test.ts`, `apps/web/scripts/finalize-build.test.ts`,
    `apps/web/app/site/files.test.ts`, `apps/web/app/features/sign-in/open-in-app.test.ts` (hosts
    only), `apps/api/test/mailer.test.ts`;
  - `apps/mobile/test/{api/client_test,launch/launch_links_test,settings/assistants_repository_test,settings/feedback_test,settings/server_url_test,settings/settings_screen_test,settings/url_opener_test}.dart`;
  - `apps/mobile/integration_test/*.dart` and the Kotlin tests under `apps/mobile/android/app/src/test`
    (hosts only).

**Interfaces:**
- Produces: the defaults later tasks rely on.
  - `PUBLIC_HOSTNAME` defaults to `app.wambito.com` and `LANDING_URL` to `https://wambito.com`, in
    `docker-compose.yml`, `up.sh` and `smoke.sh` (the `cfg` defaults).
  - `MAIL_FROM` defaults to `Lukitas <hola@wambito.com>`.

The four swaps, in this order (the third must run before the fourth):

| From | To |
|---|---|
| `app-lukas.andersonlaverde.com` | `app.wambito.com` |
| `lukitas@andersonlaverde.com` | `hola@wambito.com` |
| `hola@andersonlaverde.com` / `hola%40andersonlaverde.com` | `hola@wambito.com` / `hola%40wambito.com` |
| `lukitas.andersonlaverde.com` | `wambito.com` |

- [ ] **Step 1: Change the tests' expectations first.** Apply the four swaps to the test files
  listed above.
  - `mailer.test.ts` keeps its shape: `smtp://hola%40wambito.com:p%40ss%2Fword@…` decodes to
    `user: "hola@wambito.com"`.
  - `feedback.test.ts` and `feedback_test.dart` expect `mailto:hola@wambito.com`.
  - `origin.test.ts` expects `https://wambito.com`.
- [ ] **Step 2: Run them and see them fail.**
  - Run `pnpm vitest run apps/web/app/site apps/web/app/features apps/web/scripts apps/api/test/mailer.test.ts`.
    Expected: failures in `feedback.test.ts` only. The other web tests pass their own inputs
    through, and `mailer.test.ts` passes with any address.
  - Run `cd apps/mobile && flutter test test/settings test/api test/launch`. Expected: failures in
    the feedback and default-server expectations.
- [ ] **Step 3: Apply the four swaps to every source file listed above.**
  - In `deploy/personal/.env.example`, the Proton example becomes
    `smtp://hola%40wambito.com:BRIDGE_PASSWORD@host.docker.internal:1025`.
  - Its comments say Resend is the way on a server (spec §3.3).
  - `docs/deploy/landing.md` names the `wambito.com` zone for the token.
  - `fdroid.md` names `app.wambito.com` as the default server.
- [ ] **Step 4: Run the tests and see them pass.**
  - `pnpm vitest run apps/web apps/api/test/mailer.test.ts` passes.
  - `cd apps/mobile && flutter test --exclude-tags golden` passes.
  - `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --console=plain` passes.
  - `apps/mobile/scripts/check-fastlane.sh` passes.
- [ ] **Step 5: Commit.**
  `git commit -m "chore: the app lives at app.wambito.com, the landing at wambito.com, mail at hola@wambito.com"`

### Task 2: The Android package becomes com.wambito.app

**Files:**
- Move: `apps/mobile/android/app/src/{main,debug,release,test}/kotlin/com/andersonlaverde/lukitas/**`
  → `…/kotlin/com/wambito/app/**` (58 files, with `git mv` so history follows).
- Modify:
  - `apps/mobile/android/app/build.gradle.kts` (`namespace`, `applicationId`);
  - every moved `.kt` file (`package`, `import`, `LaunchLinks.ALIAS`);
  - `apps/mobile/lib/home/widget_snapshot.dart` (the two receiver names);
  - `apps/web/app/features/sign-in/open-in-app.ts` (`APP_PACKAGE`);
  - `apps/web/app/features/sign-in/Verify.stories.tsx`;
  - `deploy/personal/assetlinks.json.template`;
  - `apps/mobile/scripts/{release,check-permissions,run-integration-tests}.sh` (`PACKAGE`);
  - `docs/mobile/{setup,fdroid}.md`. In `fdroid.md`, "Package name is `com.wambito.app`", and the
    line still says it cannot change once published.
- Test:
  - `apps/web/app/features/sign-in/open-in-app.test.ts`, `apps/web/e2e/sign-in.spec.ts`;
  - `apps/api/test/passkey-origin.test.ts` (`androidPackageName`);
  - `apps/mobile/test/tooling/{widget_android_test,check_permissions_test}.dart`, and the Kotlin
    tests that moved.

**Interfaces:**
- Consumes: Task 1's hosts (the App Link host is already `app.wambito.com`).
- Produces: `APP_PACKAGE = "com.wambito.app"` in `open-in-app.ts`. The receivers are
  `com.wambito.app.widget.LukitasSmallWidgetReceiver` and `…LukitasMediumWidgetReceiver`. The
  launch-link alias is `com.wambito.app.LaunchLinkAlias`.

- [ ] **Step 1: Change the tests' expectations.**
  - `open-in-app.test.ts` and `sign-in.spec.ts` expect `package=com.wambito.app;` in the `intent://`
    link.
  - `passkey-origin.test.ts` uses `androidPackageName: "com.wambito.app"`.
  - The tooling tests expect `com.wambito.app` and its receivers.
- [ ] **Step 2: Run them and see them fail.**
  - `pnpm vitest run apps/web/app/features/sign-in apps/api/test/passkey-origin.test.ts`: FAIL on
    the package.
  - `cd apps/mobile && flutter test test/tooling`: FAIL on the package.
- [ ] **Step 3: Move the Kotlin sources and rewrite the package everywhere listed.** Keep every
  class and file name. Afterwards, `git grep -n 'com.andersonlaverde\|com/andersonlaverde' -- apps deploy docs/mobile`
  prints nothing.
- [ ] **Step 4: Run the tests and see them pass.**
  - The two commands of Step 2.
  - `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --console=plain`.
  - `cd apps/mobile && flutter build apk --debug`, then
    `"$(ls -d "$ANDROID_HOME"/build-tools/* | tail -1)/aapt2" dump badging build/app/outputs/flutter-apk/app-debug.apk | head -1`
    shows
    `package: name='com.wambito.app'`.
  - `pnpm --filter @lukas/web e2e -- sign-in.spec.ts`.
- [ ] **Step 5: Commit.**
  `git commit -m "chore(mobile): the Android package is com.wambito.app"`

### Task 3: Caddy's routes in one snippet, the client's address in one variable

Tunnel mode behaves exactly as before. This task only makes room for Task 4, and adds the test
that proves the behavior did not change.

**Files:**
- Create: `deploy/personal/routes.caddy` (snippet), `deploy/personal/test-caddy.sh`.
- Modify: `deploy/personal/Caddyfile`, `deploy/personal/Dockerfile.web` (copy `routes.caddy` to
  `/etc/caddy/routes.caddy`), `.github/workflows/ci.yml` (`check` job runs `test-caddy.sh`).

**Interfaces:**
- Produces:
  - `routes.caddy` holds everything inside today's `:80 { … }`: `encode`, `log`, `header`, the MCP,
    OAuth metadata, API, assets, `assetlinks.json`, landing redirects, files and the SPA fallback.
    It reads the client's address only as `{vars.client_ip}`: it is sent upstream as
    `header_up X-Forwarded-For {vars.client_ip}` on both the `mcp:3001` and `api:3000` proxies,
    and logged as `log_append visitor_ip {vars.client_ip}`. Every site that imports it must set
    `client_ip` first.
  - `Caddyfile` (tunnel) is the global block (`auto_https off`, `admin off`) plus `:80 { … }`:
    1. Set `client_ip`, inside a `route { }` block so the two lines run in the order written. Caddy
       sorts same-name directives outside `route`, and a matcher-less `vars` could run last.
       ```
       route {
           vars client_ip {remote_host}
           vars @viaCloudflare client_ip {header.Cf-Connecting-Ip}
       }
       ```
       with `@viaCloudflare header Cf-Connecting-Ip *`.
    2. `import /etc/caddy/routes.caddy`.
  - `test-caddy.sh [tunnel|direct|all]` (default `all`): self-contained, needs Docker. It prints
    `ok …` / `FAIL …` lines like `smoke.sh` and exits non-zero on any failure.
    - The setup:
      - a Docker network `caddytest-<random>`, with a fixed subnet;
      - the upstream: `caddy:2.11-alpine` with the network aliases `api` and `mcp`, answering
        `:3000` and `:3001` with `respond "{header.X-Forwarded-For}"`;
      - the Caddy under test: `caddy:2.11-alpine` with the deploy's Caddy files mounted at their
        `/etc/caddy/` paths, a `/srv` holding `index.html` and `__spa-fallback.html`, and
        `LANDING_URL=https://wambito.com`;
      - the client: `curlimages/curl` with a fixed `--ip` (`CLIENT_IP`).
    - Everything is removed on exit (`trap`).

- [ ] **Step 1: Write `test-caddy.sh` with the tunnel cases** (requests to `http://web:80`):
  - `tunnel: Cf-Connecting-Ip becomes X-Forwarded-For`: `GET /api/x` with
    `Cf-Connecting-Ip: 203.0.113.7` and `X-Forwarded-For: 198.51.100.9` answers `203.0.113.7`.
  - `tunnel: without Cloudflare, the peer`: `GET /api/x` with only `X-Forwarded-For: 198.51.100.9`
    answers `$CLIENT_IP`.
  - The same two cases for `POST /mcp`.
  - `tunnel: schema not public`: `GET /api/openapi.json` is 404.
  - `tunnel: landing redirect`: `GET /pt?x=1` is `302 https://wambito.com/pt?x=1`.
  - `tunnel: log has the visitor`: `docker logs` of the Caddy under test has a line with
    `"visitor_ip":"203.0.113.7"`.
- [ ] **Step 2: Run it against today's Caddyfile.** Run `deploy/personal/test-caddy.sh tunnel`.
  Expected: every case is `ok`, since today's file already behaves this way. If not, fix the
  test, not the Caddyfile. That run is the baseline.
- [ ] **Step 3: Split the Caddyfile into `Caddyfile` + `routes.caddy`** as in Interfaces, and copy
  `routes.caddy` in `Dockerfile.web`.
- [ ] **Step 4: Run it again.** `deploy/personal/test-caddy.sh tunnel`: every case `ok`. Also
  `docker run --rm -v "$PWD/deploy/personal:/etc/caddy:ro" caddy:2.11-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`
  prints `Valid configuration`.
- [ ] **Step 5: Add `- run: deploy/personal/test-caddy.sh` to the `check` job** after
  `test-auto-deploy.sh`, with a one-line comment in the style of its neighbors.
- [ ] **Step 6: Commit.**
  `git commit -m "refactor(deploy): Caddy's routes in one snippet, the client's address in one variable"`

### Task 4: The direct way: served by the server, with its own certificate

**Files:**
- Create:
  - `deploy/personal/Caddyfile.direct`;
  - `deploy/personal/docker-compose.direct.yml`;
  - `deploy/personal/test-compose-files.sh`.
- Modify:
  - `deploy/personal/lib.sh` (`compose_files`, `exposure`, `compose`, `up_services`);
  - `deploy/personal/up.sh`;
  - `deploy/personal/Dockerfile.web` (copy `Caddyfile.direct`);
  - `deploy/personal/test-caddy.sh` (direct cases);
  - `deploy/personal/.env.example`;
  - `deploy/personal/README.md`;
  - `.github/workflows/ci.yml` (run `test-compose-files.sh`).

**Interfaces:**
- Consumes: `routes.caddy` and `{vars.client_ip}` from Task 3.
- Produces:
  - `.env`: `COMPOSE_FILE=docker-compose.yml:docker-compose.direct.yml` selects direct; unset means
    tunnel. Compose reads it itself when typed by hand in `deploy/personal`.
  - `lib.sh`:
    - `compose_files` prints one absolute path per line: `cfg COMPOSE_FILE docker-compose.yml`,
      split on `:`, each resolved under `$DIR`. It dies on a name other than `docker-compose.yml`
      or `docker-compose.direct.yml`, or when `docker-compose.yml` is not first.
    - `exposure` prints `direct` when that list includes `docker-compose.direct.yml`, else
      `tunnel`.
    - `compose` passes one `-f` per `compose_files` line instead of today's single `-f`.
  - `docker-compose.direct.yml` changes `web` only:
    - `command: ["caddy", "run", "--config", "/etc/caddy/Caddyfile.direct", "--adapter", "caddyfile"]`;
    - `ports: !override` with `127.0.0.1:${WEB_PORT:-8088}:8080`, `80:80`, `443:443` and
      `443:443/udp`;
    - a named volume `web-caddy-data` at `/data` (certificates);
    - `PUBLIC_HOSTNAME: ${PUBLIC_HOSTNAME:-app.wambito.com}` in its environment;
    - the healthcheck on `http://127.0.0.1:8080/sign-in`.
  - `Caddyfile.direct`:
    - the global block is `admin off` only (automatic HTTPS on);
    - `{$PUBLIC_HOSTNAME} { … }` sets `vars client_ip {remote_host}` (never a request header), adds
      `header Strict-Transport-Security "max-age=31536000"` and does
      `import /etc/caddy/routes.caddy`;
    - `http://:8080 { … }` sets the same `client_ip` and imports the same routes, without HSTS.
  - `lib.sh` also gets `up_services WITH_TUNNEL`, where `WITH_TUNNEL` is `0` for `--no-tunnel` and
    `1` otherwise. It prints `api mcp web`, followed by ` cloudflared` only when `exposure` is
    `tunnel` and `WITH_TUNNEL` is `1`.
  - `up.sh` starts `up_services "$with_tunnel"`. It checks `TUNNEL_ID` and the credentials only when
    that list includes `cloudflared`. Its last line prints `On the internet: https://$host` whenever
    the site is public (tunnel started, or direct).

- [ ] **Step 1: Write `test-compose-files.sh`.** No Docker daemon is needed: `docker compose config`
  only reads files. It uses a temporary `ENV_FILE` per case, sourcing `lib.sh` like
  `test-auto-deploy.sh` does. Cases:
  - `unset: tunnel`: no `COMPOSE_FILE`; `exposure` is `tunnel`, and `compose_files` is just
    `$DIR/docker-compose.yml`.
  - `direct`: `COMPOSE_FILE=docker-compose.yml:docker-compose.direct.yml`; `exposure` is `direct`.
  - `unknown file refused`: `COMPOSE_FILE=docker-compose.yml:evil.yml` makes `compose_files` exit
    non-zero.
  - `direct ports`: `compose config --format json` gives `web.ports` exactly
    `127.0.0.1:8088→8080/tcp`, `80→80/tcp`, `443→443/tcp`, `443→443/udp`, and nothing else
    published on 8088.
  - `tunnel ports`: in tunnel mode `web.ports` is exactly `127.0.0.1:8088→80/tcp`, as today.
  - `direct command`: `web.command` names `Caddyfile.direct`.
  - `services`:
    - in tunnel, `up_services 1` is `api mcp web cloudflared` and `up_services 0` is
      `api mcp web`;
    - in direct, both are `api mcp web`;
    - `grep -n 'up_services' up.sh` finds the call, and the `TUNNEL_ID` check sits inside a test
      for `cloudflared` in that list (checked by grep, since `up.sh` itself builds and deploys).
- [ ] **Step 2: Run it and see it fail.** `deploy/personal/test-compose-files.sh`: FAIL (no
  `exposure`, no override file).
- [ ] **Step 3: Implement `compose_files`, `exposure` and the new `compose` in `lib.sh`; write
  `docker-compose.direct.yml`; change `up.sh` as in Interfaces.**
- [ ] **Step 4: Run it and see it pass.** `deploy/personal/test-compose-files.sh`: all `ok`.
- [ ] **Step 5: Add the direct cases to `test-caddy.sh`.** The Caddy under test runs with
  `Caddyfile.direct` and `PUBLIC_HOSTNAME=app.localhost`: Caddy uses its internal CA for
  `*.localhost`, so no ACME is needed. The client reaches it as `app.localhost` with
  `--resolve app.localhost:443:<caddy ip>` and `-k`. Cases:
  - `direct: spoofed Cf-Connecting-Ip ignored`: `GET https://app.localhost/api/x` with
    `Cf-Connecting-Ip: 203.0.113.7` and `X-Forwarded-For: 198.51.100.9` answers exactly
    `$CLIENT_IP`.
  - The same case for `POST /mcp`.
  - `direct: log has the peer`: the log line's `visitor_ip` is `$CLIENT_IP`, and no line has
    `203.0.113.7`.
  - `direct: HTTP goes to HTTPS`: `GET http://app.localhost/sign-in` is a `308` to
    `https://app.localhost/sign-in`.
  - `direct: HSTS`: `GET https://app.localhost/sign-in` has `Strict-Transport-Security`.
  - `direct: internal listener`: `GET http://web:8080/sign-in` is 200 with no HSTS header.
    `GET http://web:8080/api/x` with `Cf-Connecting-Ip: 203.0.113.7` answers `$CLIENT_IP`.
  - `direct: other hosts get nothing`: `GET http://<caddy ip>/sign-in` and
    `curl -H 'Host: 127.0.0.1' http://<caddy ip>/api/x` do not answer the SPA fallback or the
    upstream's body: a redirect to `https://app.localhost` or an empty answer.
  - `direct: tunnel cases unchanged`: `test-caddy.sh all` runs both sets.
- [ ] **Step 6: Run it and see the direct cases fail, then write `Caddyfile.direct` (as in
  Interfaces) and copy it in `Dockerfile.web`.** Run `deploy/personal/test-caddy.sh all`: every
  case `ok`. `caddy validate` passes for both Caddyfiles.
- [ ] **Step 7: Document the direct way.**
  - `.env.example`: a `COMPOSE_FILE` block saying when to set it (a server with its own public
    address) and what it changes. It notes that the firewall is outside the machine, because Docker
    publishes ports around `ufw`.
  - `README.md`:
    - "Moving to a server" is rewritten to the cutover's server steps (spec §5 steps 3–6):
      `.env` with `COMPOSE_FILE`, Resend, Hetzner Cloud Firewall (22 from your address and key-only
      SSH, plus 80/tcp, 443/tcp and 443/udp), `A`/`AAAA` records DNS only, `./up.sh`, `./smoke.sh`.
      It no longer says to keep the old hostname. It does say that passkeys are bound to
      `PUBLIC_HOSTNAME`.
    - "How the client address gets to the API" covers both ways: tunnel trusts
      `Cf-Connecting-Ip`; direct uses the TCP peer, so spoofing either header changes nothing.
    - Mail: Resend on a server; Proton Bridge on a Mac.
    - The file table lists `routes.caddy`, `Caddyfile.direct`, `docker-compose.direct.yml`,
      `test-caddy.sh` and `test-compose-files.sh`.
- [ ] **Step 8: Add `- run: deploy/personal/test-compose-files.sh` to the `check` job.**
- [ ] **Step 9: Commit.**
  `git commit -m "feat(deploy): the direct way: a server with a public address serves Wambito itself"`

### Task 5: Nothing on andersonlaverde.com, and a guard that keeps it so

**Files:**
- Modify: `.github/workflows/ci.yml` (`check` job), plus whatever the grep below still finds.

- [ ] **Step 1: Add the guard to the `check` job** before `pnpm lint`. The pattern is split so
  the workflow does not match itself:
  ```yaml
  # Wambito depends on nothing at the founder's personal domain (docs/superpowers keeps history).
  - run: "! git grep -n -I -e 'anderson''laverde' -- . ':!docs/superpowers'"
  ```
- [ ] **Step 2: Run the same command locally.**
  `! git grep -n -I -e 'anderson''laverde' -- . ':!docs/superpowers'`. Expected: exit 0, no
  output. If anything prints, it is a file Tasks 1–2 missed. Change it with the same swaps, rerun
  that file's tests, and commit it with the guard.
- [ ] **Step 3: Run the whole suite as CI does.**
  - `pnpm lint && pnpm typecheck && pnpm test`;
  - the five `deploy/personal/test-*.sh`;
  - `pnpm --filter @lukas/web e2e`;
  - in `apps/mobile`: `flutter analyze`, `flutter test --exclude-tags golden`,
    `scripts/check-fastlane.sh`;
  - in `apps/mobile/android`: `./gradlew :app:testDebugUnitTest`.

  Expected: all pass.
- [ ] **Step 4: Commit.**
  `git commit -m "ci: nothing in the repository depends on the personal domain"`

---

After the pull request is merged, the cutover is the runbook in the spec, §5. It is run together
with the founder, and it is not part of this plan.
