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
