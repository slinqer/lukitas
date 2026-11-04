# Wambito: publishing the Android app on F-Droid and Google Play

- **Date:** 2026-11-04
- **Status:** draft for review.
- **Reviewed with the founder:** every section, in conversation on 2026-11-04.
- **Follows:** part 2b (`2026-11-03-wambito-part-2b-infrastructure-design.md`, done). Builds on
  `docs/mobile/fdroid.md` (the F-Droid ledger) and `docs/mobile/release.md` (signing, versions).
- **Founder decisions (2026-11-04):**
  1. Google Play under an **organization account for Slinqer S.A.S.**, not a personal one: no
     12-tester closed test, and the company is already the entity for payments and contracts. It
     needs a D-U-N-S number (free, up to 30 days). `slinqer.com` is the account's verified website.
  2. The **official F-Droid** repository, not IzzyOnDroid.
  3. F-Droid signs Wambito with **F-Droid's own key**. No reproducible-build developer signature.
     Switching between the F-Droid build and the founder's build needs a reinstall. That is
     accepted: almost nobody switches stores. The future local-first work must ship export and
     import from its first version, which also covers a store switch.
  4. On Play, the founder **uploads the existing app key** (alias `lukitas`) to Play App Signing,
     so the Play build and the founder's own APK share one signature. Uploads are signed with a
     separate **upload key**.
  5. Privacy contact: **`privacy@wambito.com`**.

## 1. Goal

When this is done:

- `com.wambito.app` is on F-Droid, built by F-Droid from this repository. No prebuilt native code
  comes from Maven: Vosk and JNA are compiled from source in the recipe.
- `com.wambito.app` is on Google Play in production, published by Slinqer S.A.S. It is signed
  with the founder's app key.
- `wambito.com` has a privacy policy and an account-deletion page in es, en, it and pt.
  `privacy@wambito.com` reaches the founder.
- Passkeys and App Links work for all three builds: the founder's APK, Play and F-Droid.
  `ANDROID_CERT_SHA256` lists the founder's fingerprint and F-Droid's.
- Day-to-day development does not change. Dev builds, CI and `release.sh` without new flags
  behave as today.

Out of scope:

- reproducible builds with the founder's signature;
- IzzyOnDroid;
- publishing APKs on GitHub Releases;
- automated Play uploads (`fastlane supply`, the Play Developer API);
- an iOS app.

## 2. The pieces and their order

| # | Piece | Kind | Waits for |
|---|---|---|---|
| 1 | Legal pages (web) | PR | nothing |
| 2 | F-Droid readiness, recipe, submission | spike, then PR, then a merge request to `fdroiddata` | piece 1 for the URLs in the metadata |
| 3 | The Play build (AAB, upload key, feature graphic) | PR | nothing |
| 4 | Play Console, with the founder's steps guided by `docs/mobile/play.md` | founder work + doc PR | D-U-N-S and account approval; pieces 1 and 3 |

Pieces 1 and 2 start right away, while the D-U-N-S is pending. They touch disjoint files
(`apps/web` versus `apps/mobile`). Piece 2 starts with the spike of §3.1, because it carries the
most risk.

## 3. F-Droid

### 3.1 Spike first: Vosk from source

Before any other F-Droid work, build `libvosk.so` for `arm64-v8a` and `armeabi-v7a` from
`alphacep/vosk-api` at the tag matching `0.3.75`. The build uses the scripts in its `android/lib`
(Kaldi, OpenFst, OpenBLAS, CLAPACK) and runs in a Linux container with NDK `28.2.13676358`.

Measure:

- whether it builds;
- how long it takes;
- whether the app's voice works with it on the emulator and on a phone.

Do the same for JNA 5.18.1 (`libjnidispatch.so` built with Ant).

**Exit:** if Vosk does not build with this NDK, or the build is far beyond what F-Droid's build
server allows, stop and report to the founder before going on. The fallback, an F-Droid build
without voice, is the founder's call and is not taken by default.

### 3.2 Native dependencies from source, behind a switch

- **The script** `apps/mobile/scripts/build-native-deps.sh --vosk-src <dir> --jna-src <dir>
  --out <maven-repo>` builds only the two shipped ABIs. It publishes `vosk-android` and `jna` into
  a local Maven repository as version `0.3.75-src` and `5.18.1-src`, so they never mix with the
  Maven Central artifacts. It also packages their Java classes, built from the same sources.
- **The Gradle switch** is `-Pwambito.nativeFromSource=true`. With it, `android/app/build.gradle.kts`
  resolves Vosk and JNA from `android/third_party/m2` (git-ignored) at the `-src` versions, and
  excludes the transitive JNA from Maven. Without it, nothing changes.
- **These stay as they are:**
  - `proguard-rules.pro` (the `com.sun.jna.**` keeps);
  - `assets/licenses/android-libraries.json`, which already lists both libraries under their POM
    licences (JNA is dual Apache-2.0 / LGPL-2.1);
  - `scripts/check-no-google.sh` must pass on the from-source build too.

### 3.3 The rest of the Gradle side

- Commit `android/gradle/wrapper/gradle-wrapper.jar`, the one Flutter's pinned version writes.
  F-Droid checks wrapper jars against known checksums.
- Turn on Gradle dependency locking (`dependencyLocking { lockAllConfigurations() }`) with
  committed lockfiles. CI fails when they are stale, the same way the other generated-file checks
  do.

### 3.4 The recipe

The source of truth is `apps/mobile/fdroid/com.wambito.app.yml`, copied to `fdroiddata` when
submitting. It contains:

- `License:` the AGPL-3.0 SPDX id (`-only` or `-or-later`, as the founder confirms), plus the categories, source and issue links, and `subdir: apps/mobile`.
- srclibs: `flutter@3.47.7`, `vosk-api` at the tag the spike confirms (§3.1), `jna@5.18.1`.
- One build entry per ABI:
  - `versionName` and `versionCode` from the tag `mobile-vX.Y.Z`, with `VercodeOperation`
    `%c * 10 + 1` (`armeabi-v7a`) and `%c * 10 + 2` (`arm64-v8a`);
  - the same `--build-name` and `--build-number` as `release.sh`;
  - a `prebuild` that runs `build-native-deps.sh`;
  - a build with `-Pwambito.nativeFromSource=true` and `--split-per-abi` for the one ABI.
- `AutoUpdateMode: Version`, `UpdateCheckMode: Tags ^mobile-v`.
- The fastlane metadata in `apps/mobile/fastlane/metadata/android`. Confirm that F-Droid reads it
  from `subdir` (`fdroid.md`). If it does not, link it at the root.

### 3.5 Testing before submitting

In the `fdroidserver` container (the image F-Droid's CI uses):

- `fdroid lint com.wambito.app`;
- `fdroid build -v -l com.wambito.app` against a local commit;
- `fdroid scanner` on the source tree and on the APK.

On the resulting APK:

- `check-no-google.sh` (on the classpath of the from-source build);
- `check-permissions.sh`;
- installs on the emulator;
- sign-in works (with the debug-signed build, as `fdroid build` leaves it unsigned or signs it with
  a local test key);
- voice capture works in Spanish and English.

### 3.6 Submitting and after

- The merge request to `gitlab.com/fdroid/fdroiddata` is opened from the founder's GitLab
  account, or by Claude with the founder's explicit go-ahead. Its description covers:
  - the runtime download of the voice models (data, Apache-2.0, SHA-256 checked, from the
    `voice-models-v1` release);
  - the default server `app.wambito.com`, which is free software in this repository and can be
    changed in Settings, in case `NonFreeNet` comes up.
- When F-Droid publishes the first build, read its signing certificate's SHA-256 from the
  published APK. Add it to `ANDROID_CERT_SHA256` in the VPS `.env`; the founder edits it, and
  agents never read that file. Update `deploy/personal/.env.example` and `docs/mobile/release.md`.
  Check that passkeys and App Links work with the F-Droid APK.
- Record the outcome in `docs/mobile/fdroid.md`: it changes from "what a submission needs" to
  "how Wambito is built on F-Droid".

## 4. Google Play

### 4.1 The Play build

- `release.sh --play` also builds an Android App Bundle: `flutter build appbundle --release
  --target-platform android-arm,android-arm64`, with the tag's `--build-name`. Its versionCode is
  `base * 10 + 0`, the scheme's "universal" digit (`release-lib.sh`, `build.gradle.kts`).
- The AAB is signed with **`jarsigner`**, because `apksigner` does not sign bundles, using the
  upload key from these variables:
  - `WAMBITO_UPLOAD_KEYSTORE`;
  - `WAMBITO_UPLOAD_KEY_ALIAS`;
  - `WAMBITO_UPLOAD_KEYSTORE_PASSWORD`;
  - `WAMBITO_UPLOAD_KEY_PASSWORD`, which is optional, as with the app key.
- The same hygiene as today: the passwords are never printed or passed on a command line, and
  tracing stays off.
- The script verifies the signature (`jarsigner -verify`). It also checks that the certificate is
  the upload key's and not the app key's, and that the bundle's manifest version matches the
  scheme.
- Output: `dist/<versionName>/wambito-X.Y.Z.aab`, plus its line in `SHA256SUMS`.
- `test-release.sh` covers `--play`, with throwaway keys made in the test, like the existing
  release self-test. CI runs it.
- Documented in `release.md`: the GitHub `arm64` APK of a release has a higher code than that
  release's AAB. Someone moving from the founder's APK to Play gets the Play update with the next
  release. This is accepted.

### 4.2 Store listing assets

- `targetSdk` is 36 (Flutter 3.47.7's default), which meets Play's requirement. The 512×512 icon
  and the screenshots are already in the fastlane metadata.
- Add `images/featureGraphic.png` (1024×500, required by Play) in each locale, made from the brand
  assets in `docs/brand`. `check-fastlane.sh` checks that it exists and has that size.

### 4.3 `docs/mobile/play.md`: the founder's guide

In order:

1. Request the D-U-N-S for Slinqer S.A.S.
2. Create the Play Console organization account (a one-time fee). Set up the company's payments
   profile and verify `slinqer.com`.
3. Create the upload key: `~/.wambito-signing/wambito-upload.p12` with JDK 17's `keytool`. Back it
   up in the password manager like the app key.
4. Create the app `com.wambito.app`. Choose to use your own app signing key, and upload the
   `lukitas` key with the PEPK tool that Play Console offers. The founder runs PEPK, because it
   reads the key's password.
5. Fill in the forms. The guide gives a drafted answer for each:
   - **Data safety:** what is collected (email address; financial info the person enters;
     device time zone and language), that nothing is shared, that data is encrypted in transit,
     and that deletion is possible (with the URL from §5);
   - content rating;
   - target audience (18+);
   - ads (none);
   - the **financial features** declaration (budgeting and expense tracking; no loans, no money
     movement, no crypto);
   - **app access** (reviewers use guest mode, no credentials);
   - the privacy policy URL.
6. Fill in the listing from the fastlane metadata.
7. Publish to **internal testing**. Install from Play, then check sign-in, passkeys, App Links,
   voice and the widget. `ANDROID_CERT_SHA256` needs no change, because it is the same key.
8. Promote to production.

## 5. Legal pages

- **Routes.** These follow the `roadmap` pattern: the same English path in every language,
  prerendered, served both by the landing Worker and by `app.wambito.com`.
  - Privacy: `/privacy`, `/en/privacy`, `/it/privacy`, `/pt/privacy`.
  - Account deletion: `/delete-account`, `/en/delete-account`, `/it/delete-account`,
    `/pt/delete-account`.
  - Both get `seo.ts` meta and links like the roadmap.
- **Privacy policy.** Slinqer S.A.S. is the data controller (*responsable del tratamiento*), under
  Colombia's Ley 1581 de 2012. It covers:
  - what is stored: email; passkeys; the transactions, categories, budgets and recurring items the
    person enters; the time zone and language headers;
  - why each is stored;
  - where: a server in the EU, and age-encrypted backups in Cloudflare R2 kept 14 days;
  - deleted accounts are gone from backups within 14 days;
  - no trackers, analytics or ads, and nothing sold or shared;
  - voice is processed on the phone and the audio never leaves it;
  - AI assistants reach data only with the person's OAuth consent;
  - guest mode;
  - a self-hosted server's operator is that server's controller;
  - the data subject's rights (to know, update, rectify, delete and revoke consent) and how to
    use them through `privacy@wambito.com`;
  - the version date.
- **Account deletion.** In the app: Settings → Delete account, on web and phone. Or by email to
  `privacy@wambito.com` from the account's address. It says what is deleted and when backups
  expire (14 days).
- **The footer and the FAQ** link to `/privacy`. The placeholder `PRIVACY_HREF = "#privacy"` goes.
- **Copy** lives in the four i18n JSON files. Spanish is written first; the founder reads the
  Spanish text before merge. A review by a Colombian data-protection lawyer is recommended. It
  runs in parallel and does not block the PR.
- **Tests:** unit tests for the routes and links (`links.test.ts`, `seo.test.ts`). The
  `e2e:landing` and `e2e:landing-only` suites open both pages in each language.
- **`privacy@wambito.com`.** Check whether `wambito.com` already has Cloudflare Email Routing. If
  not, set it up to forward to the founder's inbox. That changes the domain's MX records, so it
  needs the founder's go-ahead. The founder gives the destination address in the dashboard; it is
  never written in the repo. Send a test mail before the pages go live.

## 6. Risks

| Risk | What happens |
|---|---|
| Vosk/Kaldi does not build with NDK 28, or takes too long for F-Droid | The spike (§3.1) finds out first; the founder decides before more work |
| F-Droid reviewers object to the runtime model download or the default server | Answered in the merge request (§3.6); both are free and documented |
| D-U-N-S or Play account verification takes weeks | Pieces 1–3 do not wait for it |
| Losing the upload key | Play lets the account owner reset it; it is backed up like the app key |
| The policy text misses a Ley 1581 requirement | Lawyer review recommended; the page has a version date and can change |

## 7. Agent maps to update

- `apps/mobile/AGENTS.md`: `--play`, the upload key variables, `build-native-deps.sh`, the Gradle
  switch, the lockfiles, the recipe file.
- `apps/web/AGENTS.md`: the two new routes.
- `docs/AGENTS.md`: `docs/mobile/play.md`.
