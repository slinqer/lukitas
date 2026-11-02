# Wambito — Part 1: the URLs, and nothing on andersonlaverde.com

- **Date:** 2026-11-02
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-02.
- **Founder decisions (2026-10-30 to 2026-11-02):**
  1. Lukitas becomes **Wambito**; its mascot Lukas becomes **Wambi**. The reason is the LUKITAS SAS
     trademark application at the SIC (SD2026/0059780, classes 9/35/36/42).
  2. Wambito is not only for Colombia: the founder lives in Portugal and friends there will use it.
     So the primary domain is **wambito.com** (bought 2026-11-02). wambito.co, when bought,
     redirects to it.
  3. The rename goes in two parts. **This spec is part 1:** the app moves to `app.wambito.com`,
     the landing to `wambito.com`, and nothing depends on the founder's personal domain
     `andersonlaverde.com` any more. **Part 2** (its own spec) renames the code and the visible
     name: Lukitas → Wambito, Lukas → Wambi, with the Colombian money slang ("3 lukas", `lukasHint`)
     left as it is.
  4. Today only the founder and their family use the app. So the cutover is clean, with no
     compatibility with the old hosts and no redirects from them: everyone reinstalls once and
     registers their passkey again.
  5. The move from the Mac to the VPS (CAX11, EU) happens in this same cutover: the server is set
     up directly on `app.wambito.com`.
  6. On the VPS there is **no tunnel**: `app.wambito.com` points straight at the server (DNS only,
     Cloudflare's grey cloud), and Caddy holds its own Let's Encrypt certificate. TLS ends on the
     founder's server, not at Cloudflare. The tunnel stays in the repository for installs at home.

## 1. Goal

After the cutover:

- The app, its API, the MCP server and the OAuth issuer live at `https://app.wambito.com`, served
  by the VPS directly: TLS from the phone or the assistant ends at the VPS's Caddy, and no third
  party sits in the path of a request.
- The public landing lives at `https://wambito.com`.
- The Android app is `com.wambito.app`.
- Sign-in codes come from `hola@wambito.com`, and feedback goes to `hola@wambito.com`.
- `andersonlaverde.com` holds no record, tunnel, worker, token or mailbox that Wambito needs. A grep
  of the repository finds it only in history (`docs/superpowers/`, git log).

## 2. What depends on andersonlaverde.com today

| Today | Where | After |
|---|---|---|
| `app-lukas.andersonlaverde.com` (app, `/api`, `/mcp`, OAuth issuer, passkey `rpID`, App Links) | `deploy/personal/{docker-compose.yml,cloudflared.yml,up.sh,smoke.sh,.env.example,README.md}`, `AndroidManifest.xml`, `build.gradle.kts` (`default_server`), `lib/api/server_address.dart`, CI | `app.wambito.com` |
| `lukitas.andersonlaverde.com` (landing, a Cloudflare Worker) | `deploy/landing/wrangler.jsonc`, CI `deploy-landing`, `LANDING_URL` defaults, `apps/web/scripts/build-landing.ts`, `docs/deploy/landing.md` | `wambito.com` |
| `com.andersonlaverde.lukitas` (applicationId, namespace, Kotlin packages) | `build.gradle.kts`, `android/app/src/{main,debug,release,test}/kotlin/com/andersonlaverde/lukitas/`, `lib/home/widget_snapshot.dart`, `apps/web/app/features/sign-in/open-in-app.ts`, `deploy/personal/assetlinks.json.template`, `apps/mobile/scripts/{release,check-permissions}.sh`, `docs/mobile/*` | `com.wambito.app` |
| `hola@andersonlaverde.com` sends the codes, through Proton Bridge on the Mac | `deploy/personal/{.env.example,docker-compose.yml,README.md}` | `hola@wambito.com`, through Resend |
| `lukitas@andersonlaverde.com` receives feedback | `apps/web/app/features/settings/feedback.ts`, `apps/mobile/lib/settings/feedback.dart` | `hola@wambito.com`, through Cloudflare Email Routing to the founder's inbox |
| Cloudflare credentials limited to the `andersonlaverde.com` zone | `CLOUDFLARE_API_TOKEN` secret, `~/.cloudflared/andersonlaverde-cert.pem`, tunnel `lukitas-personal` | A token for the `wambito.com` zone (landing only); no tunnel, the VPS is reached directly (§3.6) |

Tests that assert these values (`origin.test.ts`, `LaunchLinksTest.kt`, `feedback_test.dart`,
`sign-in.spec.ts` and the rest) change with them.

## 3. Decisions

### 3.1 The passkey `rpID` stays the host

`rpID` is still `new URL(WEB_URL).hostname` (`apps/api/src/auth.ts`), so it becomes
`app.wambito.com`. No passkey code changes.

The alternative was the registrable domain `wambito.com`, so that passkeys outlive a change of host.
It was rejected: the old host had to change because it was borrowed from a personal domain, and
`app.wambito.com` belongs to Wambito. With an apex `rpID`, the landing Worker would also have to
serve `assetlinks.json` with the signing fingerprints, which couples the landing to sign-in.

### 3.2 The applicationId changes now

`com.andersonlaverde.lukitas` becomes `com.wambito.app` in this part, not in part 2. The host change
already means everyone touches the app. Changing the id later would mean a second reinstall and a
second passkey registration.

- `namespace` and `applicationId` both become `com.wambito.app`. The Kotlin sources move from
  `com/andersonlaverde/lukitas/` to `com/wambito/app/` in `main`, `debug`, `release` and `test`.
  Their `package` and `import` lines change with them.
- Class names (`LukitasSmallWidget`, `LukitasMediumWidget`…) stay as they are until part 2.
- The fully qualified names written elsewhere change too: the widget receivers in
  `widget_snapshot.dart`, `LaunchLinks.ALIAS`, `APP_PACKAGE` in `open-in-app.ts`,
  `assetlinks.json.template`, `PACKAGE` in `release.sh` and `check-permissions.sh`.
- The signing key stays the same. `ANDROID_CERT_SHA256` and the keystore secrets do not change; a key
  can sign a new package.
- The app has not been published (no Play listing, no F-Droid build), so nothing outside the
  founder's family is affected. `docs/mobile/fdroid.md`, which says the package cannot change once
  published, now names `com.wambito.app`.
- A new applicationId is a new app for Android. The old app's local data (session, settings, voice
  models, widget snapshot) does not carry over. Everything that matters lives on the server.

### 3.3 Mail goes through Resend

The API already sends through Resend when `RESEND_API_KEY` is set and `SMTP_URL` is empty
(`apps/api/src/config.ts`, `server.ts`). The README's "Moving to a server" section already uses it,
because Proton Bridge stays on the Mac. So:

- `MAIL_FROM` defaults to `Lukitas <hola@wambito.com>`. The display name changes in part 2.
- `wambito.com` is verified in Resend (SPF and DKIM records in Cloudflare DNS).
- The README's mail sections describe Resend as the server's way. Proton Bridge stays documented as
  the way to run on a Mac with an existing Proton account, with no address of the founder in the
  examples.

Feedback goes to `hola@wambito.com`. Cloudflare Email Routing (free) forwards it to the founder's
inbox. One address is enough while the founder answers everything; `soporte@` can come later.

### 3.4 No redirects from the old hosts

Only the family uses the old hosts, and the old passkeys and the old app stop working anyway. The
records are deleted, not redirected. That is what frees the domain.

### 3.5 The database is not touched

The role `lukas_app`, the database `lukas`, the volume `lukitas-personal-db`, the R2 bucket and the
systemd and launchd units keep their names in this part. The Mac's dump restores on the VPS with
`restore.sh` as it is. Part 2 renames them on a database that already holds data, so the role is
renamed with `ALTER ROLE … RENAME`, not by editing `0001_rls.sql`.

### 3.6 The VPS is reached directly, with no tunnel

The tunnel exists because the Mac sits behind a home router with no public address. The VPS has
one. And through the tunnel, Cloudflare ends TLS, so it could read every request in clear:
amounts, transactions, tokens. Pointing DNS at the VPS removes that third party and the
`cloudflared` container.

- **DNS:** `A` and `AAAA` records for `app.wambito.com` to the VPS, **DNS only** (grey cloud). The
  orange cloud (Cloudflare's proxy) was rejected because it ends TLS at Cloudflare again. The
  `wambito.com` zone stays on Cloudflare for the landing Worker and Email Routing.
- **Firewall:** Hetzner's Cloud Firewall, outside the machine:
  - in: 22/tcp (SSH, key only, ideally only from the founder's address), 80/tcp, 443/tcp and
    443/udp (HTTP/3);
  - nothing else.

  Not `ufw`: Docker publishes ports around it.
- **A second way to expose the stack, chosen in `.env`.** Today's way stays the default (`tunnel`):
  Caddy on plain HTTP behind cloudflared, for installs at home. The new way (`direct`) is set in
  `.env`, so `update.sh` and the automatic deploy keep it without a flag. In `direct`:
  - A compose override publishes 80/tcp, 443/tcp and 443/udp, and keeps Caddy's certificates in a
    volume. `cloudflared` is not started and `TUNNEL_ID` is not required. Every `docker compose`
    the scripts run, and one typed by hand in `deploy/personal`, uses the override (for example,
    `COMPOSE_FILE` in `.env`, which Compose reads itself).
  - Caddy serves the site at `{$PUBLIC_HOSTNAME}` with automatic HTTPS (Let's Encrypt, HTTP to HTTPS
    redirect) and adds `Strict-Transport-Security`.
  - Caddy also serves a plain-HTTP listener on a port published only on `127.0.0.1`, for the
    container's healthcheck and `smoke.sh`. It is never reachable from outside. A public request
    that names `127.0.0.1` as its host must not reach the app over plain HTTP.
  - The routes (MCP, OAuth metadata, API, app, landing redirects, `assetlinks.json`) are written
    once and shared by both ways (a Caddy snippet imported by each), so they cannot drift.
- **The client's address.** Sign-in limits count by client address
  (README, "How the client address gets to the API"):
  - Today Caddy copies `Cf-Connecting-Ip` into `X-Forwarded-For`, which is safe only because nothing
    but Cloudflare can reach Caddy.
  - Reached directly, anyone could send that header and dodge the limits. So in `direct` Caddy
    ignores `Cf-Connecting-Ip` and forwards the TCP peer's address, replacing any `X-Forwarded-For`
    the client sent. The access log records the same peer address.
  - The API side does not change: `CLIENT_IP_HEADER=x-forwarded-for` and
    `TRUSTED_PROXIES=<Caddy's fixed address>`.
  - Docker keeps the real source address for published ports when its firewall rules handle them
    (IPv4, and IPv6 with `ip6tables`). That is checked on the VPS, for both address families, in
    step 6 of the cutover, before the phones move (§5, §6).
- **What we give up:** Cloudflare's DDoS shield and hiding the VPS's address. Hetzner's own basic
  DDoS protection, the firewall above and the existing rate limits in the API and the MCP are
  judged enough for a family install.

## 4. The code change (one pull request)

1. **Hosts.**
   - `deploy/personal`: defaults `app.wambito.com` (`PUBLIC_HOSTNAME`) and `https://wambito.com`
     (`LANDING_URL`) in `docker-compose.yml`, `up.sh`, `smoke.sh`, `cloudflared.yml` and
     `.env.example`.
   - Android: the App Links host in `AndroidManifest.xml` and `default_server` in
     `build.gradle.kts`.
   - The app's default server in `server_address.dart`, and its doc comment in `client.dart`.
   - CI `deploy-landing`: `VITE_SITE_URL` and `VITE_APP_URL`, and the comment naming the zone.
   - `deploy/landing/wrangler.jsonc`: the route pattern `wambito.com`.
   - `apps/web/scripts/build-landing.ts`: the usage examples.
2. **applicationId and Kotlin packages**, as in §3.2.
3. **Mail.** The `MAIL_FROM` default, and the feedback address in web and app (§3.3).
4. **Direct mode**, as in §3.6:
   - the compose override;
   - the Caddyfile split into shared routes plus the two ways of serving them;
   - `up.sh` (no tunnel check or `cloudflared` in `direct`) and `smoke.sh`;
   - `.env.example`, which documents the setting.

   Tested like the rest of `deploy/personal` (its `test-*.sh` scripts and CI's checks of the
   folder). One test proves that a `Cf-Connecting-Ip` sent to Caddy in `direct` does not become
   the address the API sees.
5. **Docs.**
   - `deploy/personal/README.md`:
     - hostnames and Resend;
     - "Moving to a server", rewritten for `direct` (firewall, DNS records, no tunnel), no longer
       saying to keep the old hostname;
     - the tunnel steps, kept for home installs and written for any zone;
     - "How the client address gets to the API", for both ways.
   - `docs/deploy/landing.md`: the zone and the token for `wambito.com`.
   - `docs/mobile/setup.md` and `docs/mobile/fdroid.md`.
   - The four store descriptions in `apps/mobile/fastlane/metadata/android/*/full_description.txt`.
6. **Tests**, changed with the values they assert.
7. **A guard.** A check in CI that fails when `andersonlaverde` appears anywhere outside
   `docs/superpowers/`. It is the proof that the domain is free, and it keeps it free.

Out of scope: the visible name, the mascot, `@lukas/*`, `lukas_app`, `x-lukas-*`, storage keys and
infrastructure names (all part 2), and buying wambito.co.

## 5. The cutover (runbook)

Done together, after the pull request is merged. **F** is the founder (accounts, payments,
phones); **C** is Claude (commands, checks, records to add).

1. **F:** put the `wambito.com` zone in the Cloudflare account, moving its nameservers if it was
   bought elsewhere.
2. **F + C:** in Resend, add `wambito.com` and create an API key. **C** gives the exact DNS records.
   In Cloudflare, switch on Email Routing and route `hola@wambito.com` to the founder's inbox.
3. **F + C:** on the VPS, clone the repository. Write `deploy/personal/.env` with:
   - `PUBLIC_HOSTNAME=app.wambito.com`;
   - the same `BETTER_AUTH_SECRET` as the Mac;
   - `RESEND_API_KEY`, with `SMTP_URL` empty and `SMTP_TLS_INSECURE=false`;
   - the same `ANDROID_CERT_SHA256`;
   - the `direct` setting (§3.6).

   Keep a copy in the password manager. Before DNS points at the server, Caddy cannot get a
   certificate yet. So this first start is checked only on the local listener
   (`./up.sh`, then `./smoke.sh`).
4. **C:** set up the R2 copy of the backup on the VPS and test a full restore from it, as
   `server-and-backups` requires, before real data arrives.
5. **C:** on the Mac, stop everything that writes (`docker compose stop cloudflared web api mcp`,
   keeping only the database up), so nothing is saved after the dump. Then `./backup.sh`, copy the
   dump, and on the VPS `./restore.sh --yes <dump>`.
6. **F + C:** expose the VPS directly (§3.6):
   - In Hetzner, attach the Cloud Firewall: 22/tcp from the founder's address with key-only SSH,
     plus 80/tcp, 443/tcp and 443/udp.
   - In Cloudflare, add `A` and `AAAA` records for `app.wambito.com` to the VPS, **DNS only**.
   - `./up.sh --skip-web` so Caddy gets its certificate.
   - Run `./smoke.sh` locally, then the public checks of §6.
7. **F:** in GitHub, replace `CLOUDFLARE_API_TOKEN` with a token limited to the `wambito.com` zone.
   Re-run `deploy-landing` on main; check `https://wambito.com`.
8. **F:** on each phone, install the `com.wambito.app` APK and uninstall the old app. Sign in with
   the emailed code (from `hola@wambito.com`) and register the passkey again.
9. **F:** in Claude and ChatGPT, remove the old connector and add `https://app.wambito.com/mcp`.
10. **Free the domain (F + C):**
    - delete the `app-lukas` and `lukitas` DNS records;
    - remove the old Worker's custom domain;
    - `cloudflared tunnel delete lukitas-personal`, and remove `~/.cloudflared/andersonlaverde-cert.pem`;
    - revoke the old Cloudflare token;
    - on the Mac, `./uninstall-backup.sh` and `docker compose down` in `deploy/personal`.

    Proton Bridge is no longer needed for Wambito. What happens to `lukitas@andersonlaverde.com` is
    the founder's call.

Rollback until step 10: start the Mac's stack again (`./up.sh`). The old DNS record still points at
the old tunnel, and the old APK is still installable. After step 10 there is no way back, which is
why step 10 is last.

## 6. Verification

- **Pull request:** CI green (lint, typecheck, vitest, web e2e, Android build and tests), and the
  `andersonlaverde` guard from §4.7.
- **Cutover:**
  - `smoke.sh` passes on the VPS.
  - `curl -sI http://app.wambito.com` redirects to `https://`.
  - The certificate's issuer is Let's Encrypt, not Cloudflare.
  - The response has `Strict-Transport-Security`.
  - From outside, a request with a made-up `Cf-Connecting-Ip` or `X-Forwarded-For` is logged by
    Caddy and counted by the API under the real address. Checked over IPv4 and IPv6.
  - Only 22, 80 and 443 answer from outside (a port scan of the VPS).
  - A code reaches the founder's inbox from `hola@wambito.com`.
  - Feedback sent from the app reaches the founder's inbox.
  - The sign-in link in the email opens the app (App Links verified for `com.wambito.app`).
  - A passkey registers and signs in on the phone.
  - "¿Cómo voy este mes?" through the reconnected Claude connector answers with real data.
  - `https://wambito.com` shows the landing, and its "abrir la app" goes to `app.wambito.com`.
  - The R2 backup ran and its restore was tested.
- **After step 10:** `dig app-lukas.andersonlaverde.com` and `dig lukitas.andersonlaverde.com` find
  nothing.

## 7. Later

- **Part 2:** the code and visible rename (Lukitas → Wambito, Lukas → Wambi), the repository
  `slinqer/lukitas` → `slinqer/wambito`, and the database and infrastructure names.
- Buy wambito.co and redirect it to wambito.com.
- The trademark: search "Wambito" and "Wambi" in TMview; file at the SIC (9/36/42) and consider the
  EUIPO for Portugal.
- The Claude and ChatGPT directory listings, once part 2 is done.
