# apps/mobile: the Android app (Flutter, Dart package `wambito`)

Android only, `com.wambito.app`. No Play Services or Firebase (`scripts/check-no-google.sh`);
deps pinned, free-licensed (`scripts/check-licenses.sh`). Setup, emulator, JDK 17:
`docs/mobile/setup.md`. Release and signing: `docs/mobile/release.md`.

## Dart entry points (`lib/`)

- `lib/main.dart` `bootstrap()`: `DeviceHints.read()`,
  settings, then `WambitoApp` (`lib/app.dart`). Router: `lib/router.dart` (go_router).
- One folder per feature (`lib/home/`, `lib/capture/`, `lib/budgets/`, …); Riverpod 3 providers
  sit next to their feature; tests override them.
- API: `lib/api/client.dart` (Dio, `WambitoApi`); headers from `lib/api/device.dart`
  (`x-wambito-timezone`, `-locale`, `-client: android`); server defaults to `https://app.wambito.com`,
  override `--dart-define=WAMBITO_SERVER=…` (`lib/api/server_address.dart`) or in Settings.
- Storage: secure storage for session and settings; widget snapshot JSON under
  `wambito.widget.snapshot` in `HomeWidgetPreferences` (`lib/home/widget_snapshot.dart`).
- Deep links `wambito://{add,capture,due,progress,home}` (`lib/launch/launch_links.dart`).

## Android (`android/app/src/main/kotlin/com/wambito/app/`)

- `MainActivity.kt`: takes the launch link. Channels:
  `wambito/*`, registered in `MainActivity.kt`; names match the Dart constants (rename both at once).
- `widget/`: Glance widgets via home_widget; `notices/`: WorkManager `DueWorker`/`GuestWorker`,
  local notices only. Voice: Vosk, never Android's SpeechRecognizer. Passkeys: androidx.credentials.

## Generated

- See root `AGENTS.md` (`lib/api/gen`, `tokens.g.dart`, l10n). `scripts/gen-api.sh` needs root
  `pnpm install`, JDK 17, Flutter. ARBs `lib/l10n/app_{es,en,it,pt}.arb`, es is the template.

## Commands (from `apps/mobile`, `export PATH="$HOME/development/flutter/bin:$PATH"`)

- `flutter pub get --enforce-lockfile`, `flutter analyze`, `flutter test --exclude-tags golden` (CI).
- Goldens: `flutter test --tags golden` (`--update-goldens`); on macOS without PingFang set
  `PARITY_PINGFANG` to a `PingFang.ttc` (see `test/support/parity.dart`). CI skips goldens.
- Parity (`docs/mobile/parity.md`, list `test/parity/parity.json`): `pnpm --filter @wambito/web
  parity:fixtures|parity:shots [id]`, `flutter test --update-goldens test/parity`,
  `dart run tool/parity/compose.dart --max 2 [id]`.
- Kotlin: `cd android && JAVA_HOME=<JDK 17> ./gradlew :app:testDebugUnitTest --console=plain`.
- Integration tests (emulator + root dev stack): `scripts/run-integration-tests.sh`.
- F-Droid (`docs/mobile/fdroid.md` explains the whole build):
  - `scripts/build-native-deps.sh --vosk-src <dir> --jna-src <dir> --ndk <NDK 28.2.13676358>
    [--abi <one ABI>] [--work <dir>]` builds Vosk and JNA from source (Linux x86_64 only, a
    linux/amd64 container on a Mac; 46 min with `--jobs 4`, about half with `--abi`) into
    `android/third_party/m2` (git-ignored). `scripts/test-build-native-deps-args.sh` (CI) tests
    its arguments.
  - The switch `-Pwambito.nativeFromSource=true` (`flutter build apk -P ...`, or, for `gradlew` and the check scripts,
    `env 'ORG_GRADLE_PROJECT_wambito.nativeFromSource=true' scripts/check-no-google.sh`; the name has
    a dot, so `export` and a bare `NAME=value` prefix do not work) takes
    those artifacts. ARM only, so off for the x86_64 emulator. `scripts/test-native-switch.sh`
    (CI) tests it.
  - Recipe: `fdroid/com.wambito.app.yml` is the source of truth, copied to fdroiddata when
    submitting; one build per ABI, srclibs in `fdroid/srclibs/*.yml`, natives built in `build:`
    (after F-Droid's source scan). Change it together with the revisions in `build-native-deps.sh`
    (`scripts/check-fdroid-recipe.sh`, CI, fails on drift from them and `.flutter-version`). After
    submission fdroiddata's copy is the live one: such changes need their own fdroiddata merge
    request before tagging (`docs/mobile/fdroid.md`).
    `UpdateCheckData` reads `pubspec.yaml`'s version at a `mobile-v*` tag (`docs/mobile/release.md`).
    The text for the merge request is `fdroid/MERGE_REQUEST.md`.
  - `scripts/fdroid-build-local.sh <commit> [--version X.Y.Z] [--abi <one ABI>]` runs `fdroid
    lint`, `fdroid build` and `fdroid scanner` in F-Droid's buildserver image against a scratch
    copy of that commit (Docker, about an hour per ABI on 4 emulated cores; nothing is pushed).
  - Gradle locks: `android/app/gradle.lockfile`, and `gradle-fdroid.lockfile` for the switch.
    After changing a dependency, rewrite the first with `./gradlew :app:dependencies --write-locks`
    and the second with the `sed` in `docs/mobile/setup.md` ("Dependency locks"; no native build),
    and commit both. `scripts/check-gradle-locks.sh` (CI) checks the first; `scripts/check-fdroid-lock.sh`
    (CI, text only) checks that the second is the first with the two `-src` substitutions.
  - The Gradle wrapper jar is committed: the official one for the version in
    `gradle-wrapper.properties`.
- Release self-tests: `scripts/test-release.sh`, `scripts/check-fastlane.sh` (changelog ≤500 bytes,
  same version codes in all four locales), `scripts/check-permissions.sh`.

## Traps

- See root `AGENTS.md`: money slang, the signing key's alias, secrets (the keystore too). Here
  the slang lives in `lib/capture/parser/`, `lib/capture/engine/`, `lib/money/format.dart` and the ARBs.
- Persistent state on phones: prefs file names, WorkManager unique names (`wambito.widget.refresh`,
  `wambito.widget.midnight`, `wambito.notice.due`, `wambito.notice.guest`), widget receiver classes
  (renaming removes placed widgets), the snapshot key. Changing any needs a migration.
- Never block on a WorkManager future (`.get()`) in code a Worker runs: deadlocks in tests.
- `test/tooling/*` reads Android files; `widget_android_test.dart` there pins Dart = Kotlin.
- `manifest_test` counts `android:host="due"` once (only `wambito://` links).
- About 55 goldens already fail on the founder's Mac: compare with the base first. Regenerated
  parity fixtures change millisecond timestamps: keep only the intended diff.
