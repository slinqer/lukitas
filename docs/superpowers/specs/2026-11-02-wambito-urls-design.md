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

## 1. Goal

After the cutover:

- The app, its API, the MCP server and the OAuth issuer live at `https://app.wambito.com`, served
  by the VPS.
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
| Cloudflare credentials limited to the `andersonlaverde.com` zone | `CLOUDFLARE_API_TOKEN` secret, `~/.cloudflared/andersonlaverde-cert.pem`, tunnel `lukitas-personal` | A token and a tunnel for the `wambito.com` zone |

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
4. **Docs.**
   - `deploy/personal/README.md`: hostnames; Resend; the tunnel steps for `wambito.com`; "Moving to
     a server", which no longer says to keep the old hostname.
   - `docs/deploy/landing.md`: the zone and the token for `wambito.com`.
   - `docs/mobile/setup.md` and `docs/mobile/fdroid.md`.
   - The four store descriptions in `apps/mobile/fastlane/metadata/android/*/full_description.txt`.
5. **Tests**, changed with the values they assert.
6. **A guard.** A check in CI that fails when `andersonlaverde` appears anywhere outside
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
   - the same `ANDROID_CERT_SHA256`.

   Keep a copy in the password manager. Then `./up.sh --no-tunnel`.
4. **C:** set up the R2 copy of the backup on the VPS and test a full restore from it, as
   `server-and-backups` requires, before real data arrives.
5. **C:** on the Mac, stop everything that writes (`docker compose stop cloudflared web api mcp`,
   keeping only the database up), so nothing is saved after the dump. Then `./backup.sh`, copy the
   dump, and on the VPS `./restore.sh --yes <dump>`.
6. **F + C:** create a new tunnel on the VPS (`cloudflared tunnel login` choosing `wambito.com`,
   then `cloudflared tunnel create wambito` and `cloudflared tunnel route dns wambito
   app.wambito.com`). `./up.sh --skip-web`, then `./smoke.sh`.
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
  `andersonlaverde` guard from §4.6.
- **Cutover:**
  - `smoke.sh` passes against `app.wambito.com`.
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
