# Store publishing (F-Droid and Google Play) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wambito's Android app is on F-Droid, built from source with Vosk and JNA compiled in the recipe, and on Google Play, published by Slinqer S.A.S. and signed with the founder's key. `wambito.com` has a privacy policy and an account-deletion page.

**Architecture:**
- The legal pages join the site's existing registry of prerendered public pages (`app/site/paths.ts`). Every page in that registry is prerendered, put in the sitemap and given `hreflang` alternates.
- The F-Droid build is the normal build plus one Gradle property, `wambito.nativeFromSource`. It swaps the Maven Vosk and JNA for ones built from source into a local Maven repository.
- The Play build adds one flag, `release.sh --play`, which builds an AAB and signs it with a separate upload key.

**Tech Stack:**
- React Router 7 (prerender), Vitest, Playwright;
- bash, Gradle Kotlin DSL (AGP 9.1.0), Flutter 3.47.7, NDK `28.2.13676358`;
- `fdroidserver` in Docker, `jarsigner`, `bundletool`.

**Spec:** `docs/superpowers/specs/2026-11-04-store-publishing-design.md`

## Global Constraints

- Package `com.wambito.app`. It never changes.
- versionCode is `base * 10 + digit`, with digit 0 for universal and AAB, 1 for `armeabi-v7a` and 2 for `arm64-v8a`. The base is `X*10000 + Y*100 + Z` from the tag `mobile-vX.Y.Z` (`scripts/release-lib.sh`).
- Shipped ABIs are `arm64-v8a` and `armeabi-v7a` only.
- Vosk `0.3.75` and JNA `5.18.1`. The from-source builds are published as versions `0.3.75-src` and `5.18.1-src`.
- The Gradle switch is `-Pwambito.nativeFromSource=true`, and the local repository is `apps/mobile/android/third_party/m2` (git-ignored).
- The upload key variables are `WAMBITO_UPLOAD_KEYSTORE`, `WAMBITO_UPLOAD_KEY_ALIAS`, `WAMBITO_UPLOAD_KEYSTORE_PASSWORD` and `WAMBITO_UPLOAD_KEY_PASSWORD` (optional, defaulting to the keystore password).
- Secrets are never printed, never passed on a command line and never traced. Agents never read `.env` files, keystores or passwords.
- The privacy contact is `privacy@wambito.com`, and Slinqer S.A.S. is the data controller under Ley 1581 de 2012.
- The legal paths:
  - privacy: `/privacy`, `/en/privacy`, `/it/privacy`, `/pt/privacy`;
  - account deletion: `/delete-account`, `/en/delete-account`, `/it/delete-account`, `/pt/delete-account`.
- Backups are kept 14 days.
- Repo conventions:
  - repo content is in English;
  - Conventional Commits, lowercase;
  - stage by path;
  - no `Co-Authored-By` line;
  - no personal names, emails or paths;
  - failing test first.
- Outward actions need the founder's explicit go-ahead in chat each time: opening the `fdroiddata` merge request, changing `wambito.com`'s DNS or Email Routing, and pushing or merging to `main`, since merging is deploying.

## Review Focus

1. **A visitor on the landing-only release (the Worker)** opens `/privacy` or `/delete-account`. They expect the prerendered page, not the 404. This is pinned in Task 3's `landing-only.spec.ts` cases.
2. **A visitor in Italian or Portuguese** opens a legal page. They expect text in their language, and the language switch lands on the same page in the other language, not on the landing. This is pinned in Task 3 (the footer language switch on a legal page).
3. **A dev or CI build with no `third_party/m2`** must resolve exactly as today. With the switch on and the repository empty, the build fails with a message naming `build-native-deps.sh`, not a cryptic resolution error. This is pinned in Task 6's `test-native-switch.sh`.
4. **`release.sh --play` with the upload key set to the app key** (the same file and alias) must refuse. Uploading the app key as the upload key defeats Play's key separation. This is pinned in Task 11.
5. **`release.sh` without `--play`** must produce exactly today's outputs: no `.aab`, and no new required variables. This is pinned in Task 11 (CI keeps the existing step unchanged and adds a second one).

---

## Part 1: Legal pages (PR `feat(web): privacy and account deletion pages`)

### Task 1: Register the two pages

**Files:**
- Modify: `apps/web/app/site/paths.ts`
- Modify: `apps/web/app/features/landing/seo.ts` (generalize the roadmap meta and links)
- Test: `apps/web/app/site/files.test.ts`, `apps/web/app/features/landing/seo.test.ts`

**Interfaces:**
- Produces:
  - `PRIVACY_PATH` and `DELETE_ACCOUNT_PATH: Record<Locale, string>`;
  - `SitePage = "landing" | "roadmap" | "privacy" | "deleteAccount"`, and `SITE_PAGES` includes both new pages;
  - `pageMeta(page: Exclude<SitePage, "landing">, locale: Locale): MetaDescriptor[]`, which reads the namespace `<i18n key>.meta` (`roadmap.meta`, `legal.privacy.meta`, `legal.delete_account.meta`);
  - `pageLinksFor(page, locale): LinkDescriptor[]`.
- `roadmapMeta` and `roadmapLinks` stay as thin wrappers, so the roadmap routes do not change.

- [ ] **Step 1: Write the failing tests.**
  - In `files.test.ts`: `sitemapXml(ORIGIN)` contains `${ORIGIN}/privacy`, `${ORIGIN}/en/privacy`, `${ORIGIN}/pt/delete-account`, and the `hreflang` alternates of `/it/delete-account`.
  - In `seo.test.ts`: `pageMeta("privacy", "en")` has a title that is not the roadmap's, and `pageLinksFor("deleteAccount", "es")` has canonical `/delete-account`.
- [ ] **Step 2: Run them.** Run `pnpm --filter @wambito/web exec vitest run app/site app/features/landing/seo.test.ts`. They should fail.
- [ ] **Step 3: Implement the change.** Add the paths and the pages, and generalize `seo.ts` over `SitePage`. Add placeholder `meta` titles in the four JSON files only as far as the tests need. Task 2 writes the real copy.
- [ ] **Step 4: Run them again.** Same command; they should pass. Then run `pnpm --filter @wambito/web typecheck`.
- [ ] **Step 5: Commit.** `feat(web): register the privacy and account deletion pages`.

### Task 2: The pages and their copy

**Files:**
- Create:
  - `apps/web/app/features/legal/LegalPage.tsx`;
  - `apps/web/app/features/legal/legal.css`;
  - `apps/web/app/features/legal/LegalPage.stories.tsx`;
  - `apps/web/app/routes/{privacy,en.privacy,it.privacy,pt.privacy}.tsx`;
  - `apps/web/app/routes/{delete-account,en.delete-account,it.delete-account,pt.delete-account}.tsx`.
- Modify: `apps/web/app/routes.ts` (eight routes next to the roadmap's, outside the `landingOnly` branch), and `apps/web/app/i18n/messages/{es,en,it,pt}.json` (a new `legal` namespace).
- Test: `apps/web/app/i18n/messages.test.ts` already checks key parity across locales. Add `apps/web/app/features/legal/legal.test.ts`.

**Interfaces:**
- Produces: `LegalPage({ page }: { page: "privacy" | "deleteAccount" })`. It renders the `SiteHeader` and `Footer` like `Roadmap`, an `h1`, a "Versión del 2026-11-XX" line, and `h2` sections in the order of a `sections` array of keys.
- Message shape: `legal.privacy.{meta.{title,description}, title, version, sections.<key>.{title, body}}`. The body takes rich tags `<email>` (a `mailto:privacy@wambito.com` link) and `<link>` (internal links). The same shape applies under `legal.delete_account`.
- Privacy section keys, in this order: `controller`, `data`, `purposes`, `storage`, `not_done`, `voice`, `assistants`, `guest`, `self_hosted`, `rights`, `changes`.
- Delete-account section keys: `in_app`, `by_email`, `what_goes`, `backups`.

- [ ] **Step 1: Write the failing test.** `legal.test.ts` checks the following, for each locale and each page:
  - every `sections` key has a non-empty `title` and `body`;
  - the privacy `rights` and `controller` bodies contain `privacy@wambito.com`;
  - the `controller` body contains `Slinqer S.A.S.` and `1581`;
  - the `storage` and `backups` bodies contain `14`.
- [ ] **Step 2: Run it.** Run `pnpm --filter @wambito/web exec vitest run app/features/legal`. It should fail.
- [ ] **Step 3: Write the Spanish copy first.** Cover every item of spec §5, and say only what the code does. Check these against the code:
  - the guest cleanup (`apps/api/src/services/guest-cleanup.ts`);
  - account deletion (`DeleteAccount.tsx` and its API route);
  - the 14-day backup retention (`deploy/personal`);
  - the headers `x-wambito-timezone` and `x-wambito-locale`;
  - on-device Vosk;
  - OAuth consent.

  Then write en, it and pt with the same facts. Build the component and the routes.
- [ ] **Step 4: Run the tests and the build.** Run `pnpm --filter @wambito/web exec vitest run` and `pnpm --filter @wambito/web build`. Both should pass, and `build/client/privacy/index.html` and `build/client/en/delete-account/index.html` should exist.
- [ ] **Step 5: Founder gate.** Send the founder the Spanish text of both pages, rendered from Storybook or the build, for review. Apply their changes before committing.
- [ ] **Step 6: Commit.** `feat(web): privacy policy and account deletion pages in four languages`.

### Task 3: Links, and the e2e

**Files:**
- Modify:
  - `apps/web/app/features/landing/links.ts` (drop `PRIVACY_HREF`);
  - `apps/web/app/features/landing/Footer.tsx` (link to `PRIVACY_PATH[locale]`, plus a "Borrar cuenta" / "Delete account" link to `DELETE_ACCOUNT_PATH[locale]`);
  - the FAQ privacy answer in the four JSON files (a `<privacy>` tag linking to the policy);
  - `Faq.tsx`.
- Test: `apps/web/app/features/landing/links.test.ts`, `apps/web/e2e/landing.spec.ts`, `apps/web/e2e/landing-only.spec.ts`.

**Interfaces:**
- Consumes: `PRIVACY_PATH` and `DELETE_ACCOUNT_PATH` from Task 1, and `LegalPage` from Task 2.
- The `Footer`'s `page` prop widens to `SitePage`, so the language switch keeps the current page.

- [ ] **Step 1: Write the failing tests.**
  - In `landing.spec.ts` and `landing-only.spec.ts`, for each locale:
    - the footer's privacy link goes to the locale's `/…privacy` path, which responds 200 and shows the `legal.privacy.title` heading;
    - the same for `/…delete-account`;
    - on `/it/privacy`, the language menu's Portuguese entry goes to `/pt/privacy`;
    - the FAQ privacy answer links to the policy.
  - In `links.test.ts`: no export named `PRIVACY_HREF`.
- [ ] **Step 2: Run them.** Run `pnpm --filter @wambito/web e2e:landing` and `pnpm --filter @wambito/web e2e:landing-only`. The new cases should fail.
- [ ] **Step 3: Implement the change.**
- [ ] **Step 4: Run every web suite.** Run `pnpm --filter @wambito/web exec vitest run`, `e2e:landing`, `e2e:landing-only` and `e2e:landing-only-app`, then from the repo root `pnpm lint` and `pnpm typecheck`. All should pass.
- [ ] **Step 5: Update `apps/web/AGENTS.md` and commit.** The two routes go in its route list. Commit `feat(web): link the privacy policy and account deletion pages`.

### Task 4: `privacy@wambito.com` (operations, no code)

- [ ] **Step 1: Look up Email Routing, read-only.** Use the Cloudflare MCP to read whether Email Routing is on for the `wambito.com` zone and which rules exist. Report this to the founder.
- [ ] **Step 2: Founder gate.** If routing is off, ask the founder to approve turning it on, which adds MX and TXT records, and a rule `privacy@wambito.com` → their inbox. The founder enters the destination address in the dashboard; it is never written in the repo or the chat log. Do it only after their yes.
- [ ] **Step 3: Test it.** The founder sends a test mail and confirms it arrived. Only then is Part 1's PR merged, with the founder's go-ahead, because merging is deploying.

---

## Part 2: F-Droid

### Task 5: Spike, Vosk and JNA from source (gate)

**Files:**
- Create: `docs/superpowers/reports/2026-11-XX-vosk-from-source-spike.md`.
- Scratch work goes in a throwaway folder outside the repo.

- [ ] **Step 1: Prepare the sources.**
  - In a Linux container (`docker run --platform linux/amd64`, Debian bookworm), install the NDK `28.2.13676358` with `sdkmanager`.
  - Clone `alphacep/vosk-api` and find the tag or commit that `vosk-android:0.3.75` was built from, starting with the POM's `scm` and the tag list.
  - Clone `java-native-access/jna` at `5.18.1`.
- [ ] **Step 2: Build Vosk.** Run vosk-api's `android/lib` build scripts for `arm64-v8a` and `armeabi-v7a` only, and time each. Record:
  - the commands;
  - the wall time;
  - the patches needed;
  - the `.so` sizes compared with the Maven AAR's.
- [ ] **Step 3: Build JNA.** Build `libjnidispatch.so` for `android-aarch64` and `android-armv7` (`ant -Dos.prefix=…`), and record the same items.
- [ ] **Step 4: Try them in the app.** Swap the built `.so` files into a local debug APK by hand (a scratch copy of the AAR in `flatDir`). Then check on the emulator and on a phone that voice capture works in Spanish and English.
- [ ] **Step 5: Write the report and stop.** The report gives the outcome, the times, the patches, the exact source revisions, and a recommendation. Commit it as `docs: the vosk from source spike`. **Report to the founder and wait.** If Vosk does not build or takes too long for F-Droid's build server, Tasks 6–10 wait for the founder's decision.

### Task 6: `build-native-deps.sh` and the Gradle switch

**Files:**
- Create:
  - `apps/mobile/scripts/build-native-deps.sh`;
  - `apps/mobile/scripts/test-native-switch.sh`.
- Modify:
  - `apps/mobile/android/app/build.gradle.kts` (dependencies block, around line 135);
  - `apps/mobile/android/settings.gradle.kts` or the app's `repositories`;
  - `apps/mobile/android/.gitignore` (`/third_party/`).

**Interfaces:**
- Produces:
  - `build-native-deps.sh --vosk-src <dir> --jna-src <dir> --ndk <dir> [--out <dir>]`. The default `--out` is `android/third_party/m2`. It writes `com/alphacephei/vosk-android/0.3.75-src/vosk-android-0.3.75-src.{aar,pom}` and `net/java/dev/jna/jna/5.18.1-src/jna-5.18.1-src.{aar,pom}`, with only the `arm64-v8a` and `armeabi-v7a` `jni/` folders. It uses the build commands from the spike report.
  - The Gradle property `wambito.nativeFromSource`. When it is `true`: add `maven { url = uri("../third_party/m2") }` first, depend on `vosk-android:0.3.75-src` with `exclude(group = "net.java.dev.jna")`, and add `net.java.dev.jna:jna:5.18.1-src@aar`. If `third_party/m2` has no Vosk, fail at configuration with `wambito.nativeFromSource is set but android/third_party/m2 has no vosk-android 0.3.75-src: run apps/mobile/scripts/build-native-deps.sh first`.

- [ ] **Step 1: Write the failing test.** `test-native-switch.sh` runs `./gradlew :app:dependencies --configuration releaseRuntimeClasspath` three ways and checks:
  - (a) without the property, the output contains `com.alphacephei:vosk-android:0.3.75` and `net.java.dev.jna:jna:5.18.1`, and no `-src`;
  - (b) with the property and an empty `third_party`, the build fails, and its output contains `run apps/mobile/scripts/build-native-deps.sh first`;
  - (c) with the property and a fake `third_party` holding stub `-src` POMs and AARs that the test writes, the output contains `0.3.75-src` and `5.18.1-src`, and no plain `jna:5.18.1`.

  The test cleans up its stubs.
- [ ] **Step 2: Run it.** Run `cd apps/mobile && JAVA_HOME=<JDK 17> scripts/test-native-switch.sh`. Checks (b) and (c) should fail.
- [ ] **Step 3: Implement the switch and the build script.**
- [ ] **Step 4: Run the test, then the real thing.** Run the test again; it should pass. Then run `build-native-deps.sh` for real in the Linux container from the spike, and build `flutter build apk --release --split-per-abi --target-platform android-arm,android-arm64 -Pwambito.nativeFromSource=true` (passed through `--android-project-arg`, or `ORG_GRADLE_PROJECT_wambito.nativeFromSource=true`). Check that `scripts/check-no-google.sh` passes on it, that `scripts/check-licenses.sh` passes, and that voice works on the emulator.
- [ ] **Step 5: Add the test to CI and commit.** The test goes in the `mobile` job, next to the Kotlin unit tests. Commit `feat(android): build vosk and jna from source behind wambito.nativeFromSource`.

### Task 7: Wrapper jar and dependency locking

**Files:**
- Modify:
  - `apps/mobile/android/gradle/wrapper/gradle-wrapper.jar` (commit the file Flutter's pinned version writes);
  - `apps/mobile/android/app/build.gradle.kts` (`dependencyLocking { lockAllConfigurations() }`);
  - `.github/workflows/ci.yml`.
- Create: `apps/mobile/android/app/gradle.lockfile` and `apps/mobile/android/settings-gradle.lockfile` if Gradle writes one.

- [ ] **Step 1: Write the failing check.** A CI step in `mobile` runs `./gradlew :app:dependencies --write-locks` followed by `git diff --exit-code -- android/**/*.lockfile`. Run it locally: it fails, because no lockfile exists yet.
- [ ] **Step 2: Implement locking.** Turn on locking and write the locks.
- [ ] **Step 3: Check the locks.** Run `./gradlew :app:assembleDebug :app:testDebugUnitTest`; it should pass with the locks enforced. Then run the CI command again: no diff. Check the wrapper jar's SHA-256 against Gradle's published checksum for the version in `gradle-wrapper.properties`, and record it in the commit message.
- [ ] **Step 4: Update `docs/mobile/setup.md` and commit.** Add the "regenerate locks after changing a dependency" line to `setup.md`. Commit `build(android): commit the gradle wrapper and lock dependencies`.

### Task 8: The recipe, tested in `fdroidserver`

**Files:**
- Create:
  - `apps/mobile/fdroid/com.wambito.app.yml`;
  - `apps/mobile/scripts/fdroid-build-local.sh`.

**Interfaces:**
- Consumes: `build-native-deps.sh` from Task 6 and the switch.
- The recipe follows spec §3.4:
  - the AGPL-3.0 SPDX id is the founder's answer, `-only` or `-or-later`, asked before this task;
  - `subdir: apps/mobile`;
  - srclibs `flutter@3.47.7`, `vosk-api@<revision from the spike>` and `jna@5.18.1`;
  - two builds, with `VercodeOperation` `%c * 10 + 1` and `%c * 10 + 2`;
  - `prebuild` runs `build-native-deps.sh`, and the build passes `--split-per-abi --target-platform android-arm` or `android-arm64`, `--build-name` and `--build-number`, and the switch;
  - `AutoUpdateMode: Version`, `UpdateCheckMode: Tags ^mobile-v`.
- `fdroid-build-local.sh <commit>` runs the `registry.gitlab.com/fdroid/fdroidserver:buildserver` image with a scratch `fdroiddata` holding the recipe, pointed at the given commit of this checkout. It then runs `fdroid lint`, `fdroid build -v -l com.wambito.app` and `fdroid scanner`.

- [ ] **Step 1: Run it against a commit before Task 6.** Run `apps/mobile/scripts/fdroid-build-local.sh <a commit before Task 6>`. The scanner should flag the prebuilt `.so` files from Maven, or the build should fail on the switch. Record which.
- [ ] **Step 2: Write the recipe and make it pass.** Iterate on the recipe until `fdroid-build-local.sh HEAD` passes lint, build and scanner. Patches belong in the recipe only if the spike found them necessary.
- [ ] **Step 3: Check the resulting APKs.** For both, check:
  - `aapt2 dump badging` shows versionCode `base*10+1` / `base*10+2` for a test tag;
  - `scripts/check-permissions.sh --apk` passes;
  - they install on the emulator, signed with a local test key;
  - sign-in and voice capture work in Spanish and English.

  Also confirm whether F-Droid read the metadata from `subdir`. If it did not, add the root link and note it.
- [ ] **Step 4: Commit.** `feat(android): the f-droid recipe and a local fdroidserver build`.

### Task 9: Docs and the submission (founder gate)

**Files:**
- Modify:
  - `docs/mobile/fdroid.md`, rewritten from "what a submission needs" to "how Wambito is built on F-Droid": the switch, the script, the recipe, the local build, and what was decided;
  - `apps/mobile/AGENTS.md` (the script, the switch, the lockfiles, the recipe);
  - `docs/AGENTS.md` if the description of `fdroid.md` changes.
- Create: `apps/mobile/fdroid/MERGE_REQUEST.md`, the text for the `fdroiddata` merge request. It covers:
  - what the app is;
  - the runtime voice-model download (data, Apache-2.0, SHA-256 checked, from the `voice-models-v1` release);
  - the default server `app.wambito.com` (AGPL, in this repo, changeable in Settings);
  - that F-Droid signs with its own key.

- [ ] **Step 1: Write the docs and commit.** Commit `docs(mobile): how wambito is built on f-droid`.
- [ ] **Step 2: Open the PR, then submit after the founder's yes.** Open Part 2's PR, then merge it with the founder's go-ahead. After the merge and a `mobile-v*` tag on that commit, the recipe's tag and commit must exist upstream. **Ask the founder** whether they open the `fdroiddata` merge request from their GitLab account with `MERGE_REQUEST.md`, or authorize Claude to do it. Do nothing outward before that answer.

### Task 10: F-Droid's fingerprint (after F-Droid publishes)

- [ ] **Step 1: Read the fingerprint.** Download F-Droid's published APK for `com.wambito.app`, telling the founder the file, its source (`f-droid.org`) and its size first. Read its certificate SHA-256 with `apksigner verify --print-certs`.
- [ ] **Step 2: The founder adds it.** The founder appends it to `ANDROID_CERT_SHA256` in the VPS `.env`, comma-separated after the existing value (both `apps/api/src/config.ts` and `deploy/personal/web-entrypoint.sh` already take a comma-separated list), then runs `deploy/personal/up.sh`.
- [ ] **Step 3: Check it.** Run `curl -s https://app.wambito.com/.well-known/assetlinks.json`; it should list both fingerprints. Then sign in with a passkey in the F-Droid build. Update `deploy/personal/.env.example`'s comment and `docs/mobile/release.md`, and commit `docs(mobile): f-droid's signing fingerprint`.

---

## Part 3: Google Play

### Task 11: `release.sh --play`

**Files:**
- Modify:
  - `apps/mobile/scripts/release.sh`;
  - `apps/mobile/scripts/release-lib.sh` (only if a helper is needed: `release_aab_name <versionName>` → `wambito-<versionName>.aab`);
  - `apps/mobile/scripts/test-release.sh`;
  - `.github/workflows/ci.yml` (a second step after "scripts/release.sh, with a throwaway key").

**Interfaces:**
- Produces: the `--play` flag. With it, the upload-key variables are required and checked like the app key's (present, the file readable, never printed). In addition to today's APKs, it:
  1. runs `without_secrets env WAMBITO_UNSIGNED_RELEASE=1 flutter build appbundle --release --target-platform android-arm,android-arm64 --build-name "$version_name" --build-number "$base_code"`;
  2. signs with `with_secrets jarsigner -keystore "$WAMBITO_UPLOAD_KEYSTORE" -storepass:env WAMBITO_UPLOAD_KEYSTORE_PASSWORD -keypass:env WAMBITO_UPLOAD_KEY_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 -signedjar "$dist/wambito-$version_name.aab" <unsigned> "$WAMBITO_UPLOAD_KEY_ALIAS" | redact`;
  3. verifies with `jarsigner -verify -strict`;
  4. checks that the certificate (from `keytool -printcert -jarfile`) equals the upload keystore's and **differs** from the app key's fingerprint, refusing with `the bundle is signed with the app key: use a separate upload key (docs/mobile/play.md)`;
  5. reads versionCode `base*10+0` with `bundletool dump manifest --xpath /manifest/@android:versionCode`, when `WAMBITO_BUNDLETOOL` names a bundletool jar, and otherwise prints a warning that it was skipped, the same pattern as for keytool;
  6. adds the `.aab` to `SHA256SUMS` and prints `Upload to Play: …`.

- [ ] **Step 1: Write the failing tests.**
  - In `test-release.sh`: `release_version_code mobile-v1.0.0 universal` = `100000`, which already holds, plus `release_aab_name 1.0.0` = `wambito-1.0.0.aab`.
  - A new CI step "scripts/release.sh --play, with throwaway keys" makes a second throwaway keystore for the upload key, runs `scripts/release.sh --play --out "$RUNNER_TEMP/dist-play"`, and checks that `wambito-0.0.0-dev.<sha>.aab` exists and is in `SHA256SUMS`.
  - The same step then sets the upload variables to the app keystore and alias, and expects `release.sh --play` to exit non-zero with `signed with the app key`.
- [ ] **Step 2: Run them.** Run `apps/mobile/scripts/test-release.sh`; it should fail on `release_aab_name`. Run the CI step's commands locally with throwaway keys made in a temp folder; they should fail on the unknown flag.
- [ ] **Step 3: Implement `--play`.** Without `--play`, nothing in the script's path changes.
- [ ] **Step 4: Run them again.** Run `test-release.sh`, then the local `--play` run, which should produce the AAB, and the app-key refusal, which should exit non-zero. Then run `release.sh` without `--play`: the output has no `.aab`, and it needs no upload variables.
- [ ] **Step 5: Update `docs/mobile/release.md` and commit.** The `release.md` section "The Play bundle" covers the upload key, `--play`, `WAMBITO_BUNDLETOOL`, and the note that an `arm64` APK outranks the same release's AAB. Commit `feat(release): build and sign the play bundle with an upload key`.

### Task 12: The feature graphic

**Files:**
- Create:
  - `docs/brand/tools/gen-feature-graphic.cjs`, the same conventions as `gen-icon.cjs` (its header documents the usage, using `NODE_PATH` and the same renderer);
  - `apps/mobile/fastlane/metadata/android/{es-ES,en-US,it-IT,pt-PT}/images/featureGraphic.png`.
- Modify: `apps/mobile/scripts/check-fastlane.sh`, and `docs/AGENTS.md` (`docs/brand/tools` now writes the feature graphic too).

- [ ] **Step 1: Write the failing check.** `check-fastlane.sh` requires `images/featureGraphic.png` in every locale: a PNG, exactly 1024×500, at most 1 MB. Run it; it should fail.
- [ ] **Step 2: Generate the graphic.** Write the generator: the brand plum background (token `brand-plum`), Wambi from `docs/brand/wambi-pointing.webp`, the logo from `wambito-logo-dark.svg`, and no text other than the logo, so all four locales share one image. Run it to write the four files.
- [ ] **Step 3: Check it, then the founder's gate.** Run `apps/mobile/scripts/check-fastlane.sh`; it should pass. Show the image to the founder and commit only after their yes.
- [ ] **Step 4: Commit.** `feat(mobile): the play feature graphic`.

### Task 13: `docs/mobile/play.md`

**Files:**
- Create: `docs/mobile/play.md`.
- Modify: `docs/AGENTS.md` (the map line), `apps/mobile/AGENTS.md` (`--play` and the upload key variables).

- [ ] **Step 1: Write the guide.** It follows the order of spec §4.3, with exact commands where there are any:
  - the `keytool -genkeypair` for `~/.wambito-signing/wambito-upload.p12`, alias `upload`, RSA 4096, PKCS12;
  - the `release.sh --play` invocation with the upload variables;
  - where to run PEPK.

  It also carries the drafted answers for Data safety, content rating, target audience, ads, the financial features declaration and app access, plus the privacy and account-deletion URLs from Part 1. Every answer has to match what Part 1's policy says, so cross-check them.
- [ ] **Step 2: Lint and commit.** Run `pnpm lint` and `scripts/check-old-name.sh`. Both should pass; the alias `lukitas` is allowed in `release.md` and `play.md` only under the reason `key-alias`, so add `play.md` to `.github/name-allowlist.txt` if it names the alias. Commit `docs(mobile): the google play guide`.
- [ ] **Step 3: Open the PR and hand over to the founder.** Open Part 3's PR (Tasks 11–13) and merge it with the founder's go-ahead. Then the founder follows `play.md` once the D-U-N-S and the account are ready. Claude helps live, but never enters credentials or keys.
