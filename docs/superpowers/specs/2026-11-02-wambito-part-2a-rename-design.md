# Wambito — Part 2a: the name in the code and in everything people see

- **Date:** 2026-11-02
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-02.
- **Follows:** `2026-11-02-wambito-urls-design.md` (part 1). Part 1 moved hosts, mail and the Android
  package (`com.wambito.app`) off `andersonlaverde.com`. The cutover was done on 2026-11-02, and
  the VPS serves `app.wambito.com` directly.
- **Founder decisions (2026-11-02):**
  1. Part 2 is split in two:
     - **2a (this spec):** the name in the code and in everything people see.
     - **2b (its own spec):** the infrastructure names that hold live data or run on the server.
       That means the database role and name, the compose project, the volumes, the R2 bucket, the
       dump names, the systemd units, the folders on the VPS and on the Mac, the GitHub repository,
       and the Linux user.
  2. Wambi is the same drawing as Lukas. Only the name changes. The art, the 3D model and the icon
     stay as they are.
  3. Nothing named Lukitas or Lukas is left in the code, the UI, the emails or the live docs. The
     exceptions are the Colombian money slang and history.
  4. The one-time cost below is accepted: placed home-screen widgets and the quick-capture tile
     disappear and are added again (§4.4).

## 1. Goal

After 2a is merged and the new APK is installed:

- The app is called **Wambito** on the phone, on the web, in the landing, in the store texts, in
  the MCP connector and in the passkey manager.
- The mascot is **Wambi** in every text and in the code.
- Every email the app sends comes from `Wambito <hola@wambito.com>`, with subject and body in
  es, en, it and pt.
- No person has to sign in again, lose a setting, or reinstall. The new APK is an update of
  `com.wambito.app`.
- A CI guard fails on any new `lukitas`/`lukas` outside an explicit allowlist.

## 2. The name map

Every occurrence is classified; there is no blind search-and-replace. `lukas` is also the word for
money (`lukasHint` is about money, not the mascot).

| Class | Examples | Becomes |
|---|---|---|
| The app | `Lukitas`, `LukitasTheme`, `LukitasTokens`, `LukitasColors`, `LukitasApp`, `LukitasSmallWidget`, `lukitas_api.dart`, `lukitas_face.dart`, `LUKITAS_VERSION`, `LUKITAS_SERVER`, `LUKITAS_KEYSTORE*`, `LUKITAS_KEY_*`, MCP server `lukitas`, `rpName: "Lukitas"`, the APK file name `lukitas-<version>-<abi>.apk` | `Wambito…`, `wambito_…`, `WAMBITO_…`, `wambito-<version>-<abi>.apk` |
| The mascot | `Lukas`, `LukasBubble`, `LukasMood`, `LukasPose`, `LukasSpot`, `LukasLine`, `Lukas3D`, `LUKAS_ART`, `lukasMessage`, `LukasMessageKey`, `TravelingLukas`, `apps/mobile/assets/lukas/`, `data-lukas-*`, `.lk-lukas*`, the parity snapshots `lukas-bubble-*.png`, `docs/design/system/project/components/Lukas/` | `Wambi…`, `WAMBI_ART`, `wambiMessage`, `assets/wambi/`, `data-wambi-*`, `.lk-wambi*`, `wambi-bubble-*.png`, `components/Wambi/` |
| Internal names | `@lukas/*` packages and their filters, the Dart package `lukitas`, `x-lukas-*` headers, storage keys (`lukas.theme`, `lukas.home.view`, `lukas.sound`, `lukas.passkey.*`, `lukas.demo.lang`, `lukitas.widget.snapshot`, the app's preference and secure-storage keys), the scheme `lukitas://`, the DOM event `lukas:feedback`, `LUKAS_TEST_DB`, test domains `lukas.test`, `lukas.app`, `lukas-message.test` | `@wambito/*`, `wambito`, `x-wambito-*`, `wambito.*`, `wambito://`, `wambito:feedback`, `WAMBITO_TEST_DB`, `wambito.test` |
| **Money (never changes)** | «3 lukas», `(25 lukas)`, `lukasHint`, «una luka», «palo», the amount parser's slang units, the MCP server instructions' "luka" lines, the tests that assert them | unchanged |
| **Infrastructure (part 2b)** | role `lukas_app`, database `lukas`, admin user `lukitas`, `DB_VOLUME_NAME`/`lukitas-personal-db`, compose project `lukitas-personal`, `lukitas-backup.*`/`lukitas-deploy.*` units, `com.lukitas.backup.plist`, dumps `lukitas-*.dump`, `~/Backups/lukitas*`, bucket `lukitas-backups`, `DEPLOY_GITHUB_REPO=slinqer/lukitas`, the repository URL | unchanged in 2a |
| **History** | `docs/superpowers/**`, git history | unchanged |

## 3. What people see

- **Android:**
  - `android:label="Wambito"`;
  - the widget and tile labels, and the notification channel names;
  - every ARB string (es, en, it, pt) that names the app or the mascot.
- **Web:**
  - `<title>` and meta;
  - the manifest name;
  - every message catalog (`app.*.json`, `*.json`, four languages);
  - the landing and roadmap pages;
  - Storybook stories.
- **Emails:**
  - `MAIL_FROM` defaults to `Wambito <hola@wambito.com>` (in compose, `.env.example` and the
    README);
  - the sign-in email (`apps/api/src/emails/sign-in.ts`): subject, heading and body in four
    languages;
  - any other email the API sends.
- **Passkeys:** `rpName` becomes `"Wambito"`. The `rpID` (`app.wambito.com`) is unchanged, so
  existing passkeys keep working; only the label a password manager shows for new ones changes.
- **MCP:** the server announces `{ name: "wambito", title: "Wambito" }`. The tool names, the scopes
  and the URL `https://app.wambito.com/mcp` do not change, so connected assistants keep working.
  Their connector list may show the new name after they reconnect.
- **Store and docs:**
  - the fastlane texts in four languages;
  - README, CONTRIBUTING and the privacy policy;
  - `deploy/personal/README.md`;
  - `docs/mobile/*`, `docs/deploy/*`, `docs/design/*`, `docs/i18n/*`.

## 4. Nothing breaks between the merge and the new APK

The VPS deploys `main` by itself minutes after the merge. Phones only change when the founder
builds and installs the APK. So, for a transition that part 2b ends:

### 4.1 Headers

- The web and the new app send `x-wambito-locale`, `-next`, `-timezone`, `-client` and
  `-background`. The Kotlin workers in `notices/` and `widget/` send them too.
- The API reads each one through one helper:
  - the new name first;
  - else the old `x-lukas-*`, so the installed APK keeps working;
  - never a mix inside one request.
- These files read headers today: `apps/api/src/auth.ts` and `apps/api/src/http/session.ts`.

### 4.2 Stored keys

- **Web:** each `localStorage` read goes through one helper. If the new key is missing and the old
  one exists, it copies the old value to the new key, removes the old key and returns the value.
  The theme bootstrap script (which runs before paint) does the same inline.
- **App:**
  - the same rule for SharedPreferences;
  - the same rule for secure storage (the session, `api/session.dart`);
  - the same rule for the home cache, pending saves, stored flags and the widget snapshot.
- So nobody is signed out and no setting resets.

### 4.3 Deep links

The manifest registers `wambito://` and keeps `lukitas://` (same hosts: add, capture, due,
progress, home). The app builds only `wambito://` links. Anything pinned with `lukitas://` still
opens.

### 4.4 Accepted one-time cost

Android ties a placed widget to its receiver class and the tile to its service class. Renaming
`LukitasSmallWidget`/`LukitasMediumWidget` (and their receivers) removes placed widgets; the person
adds them again. The tile is re-added the same way. Release notes in the store texts say so.

### 4.5 What part 2b removes

Part 2b removes the `x-lukas-*` fallback, the old-key migration, and `lukitas://` from the manifest.
The guard's allowlist (§6) marks each of these as `2b: remove`.

## 5. Rollout

1. Merge. The VPS auto-deploys. The API now accepts both header names, and the web sends the new
   ones.
2. On the VPS, `MAIL_FROM=Wambito <hola@wambito.com>` in `deploy/personal/.env`: the value is
   pinned there, so the new default does not apply. Then `./up.sh --skip-web`, and check a sign-in
   email.
3. Build the APK (`apps/mobile/scripts/release.sh` with the renamed `WAMBITO_*` variables).
   Install it over the current app on each phone. The person stays signed in. They re-add widgets
   and the tile.
4. Reconnect the assistants only if their connector shows the old name and the founder wants the
   new one.

## 6. Verification

- **CI green:** lint, typecheck, vitest, web e2e, Flutter tests (including the parity snapshots
  under their new names), Kotlin unit tests, the deploy test scripts, and the release script's own
  test.
- **New tests:**
  - the header helper prefers `x-wambito-*` and falls back to `x-lukas-*`;
  - the storage migration (web and app) copies, removes and returns, and does not overwrite an
    existing new key;
  - the manifest accepts both schemes and the app builds only `wambito://`.
- **The guard.** A CI step fails on `lukitas` or `lukas` (case-insensitive) in tracked files
  outside an allowlist file kept in the repository.
  - Each allowlist line is a path pattern plus the reason: money slang, history, 2b
    infrastructure, or `2b: remove` transition code.
  - It runs next to the `andersonlaverde` guard and splits its own pattern the same way.
- **After the rollout:**
  - a sign-in email arrives from "Wambito";
  - the phone shows "Wambito";
  - the signed-in session survived the update;
  - the MCP still answers.

## 7. Later

- **Part 2b:**
  - the infrastructure names in §2;
  - the GitHub repository `slinqer/lukitas` → `slinqer/wambito`;
  - the VPS folder `~/lukitas` → `~/wambito` and the Mac folder `~/projects/lukas` →
    `~/projects/wambito` (moving Claude's memory folder with it);
  - removing the §4 transition code.
- The trademark at the SIC and the EUIPO, and the assistant directory listings.
