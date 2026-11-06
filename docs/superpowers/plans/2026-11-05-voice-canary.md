# Voice capture: Vosk live, Canary on release — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the person lets go of 🎤, NVIDIA Canary-180M flash re-transcribes the whole recording on the phone and its text, not Vosk's, goes to the rules parser.

**Architecture:** Kotlin keeps the recording's PCM in memory, and after Vosk's final results runs Canary (sherpa-onnx's Kotlin API over its published AAR) and sends `refining` / `refined` / `refine_failed` before `done`. Dart's `VoskEngine` closes its transcript stream with Canary's text, or with Vosk's after 3 s. A second `ModelStore` downloads Canary from a new release, offered together with Vosk on phones that qualify.

**Tech Stack:** Flutter 3.47 / Dart, Riverpod 3, Kotlin (Android, JDK 17, Gradle 9.3), sherpa-onnx 2.0.1 AAR (onnxruntime inside), Vosk 0.3.75.

**Spec:** `docs/superpowers/specs/2026-11-05-voice-canary-design.md`

## Global Constraints

- Canary only for locales `es` and `en`; `it` and `pt` stay Vosk-only (spec §1, §3).
- A phone gets Canary only when it is arm64, `totalMem` ≥ 3 GB (3 × 1024³ bytes) and not `isLowRamDevice` (spec §3).
- Refine limit: **3 s** after Vosk's final results; past it Vosk's text is used and Canary's answer ignored (spec §4.1).
- Audio stays in memory for one recording only: never written, sent or logged (spec §4.2).
- Canary model: sherpa-onnx's `sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8` export, files `encoder.int8.onnx`, `decoder.int8.onnx`, `tokens.txt`; config `srcLang` = `tgtLang` = capture locale, `usePnc = true` (spec §4.2, §4.4).
- Models are re-published unchanged as zips on this repo's release `voice-models-v2`, verified by SHA-256 before unzip (spec §4.4).
- sherpa-onnx AAR: `https://github.com/k2-fsa/sherpa-onnx/releases/download/v2.0.1/sherpa-onnx-2.0.1.aar`, 49441341 bytes, SHA-256 `a8d09d1d32f3eb8520482c6d3d43fae674681c5b050385967c70a3c2c9bf0ee7`. Not in the F-Droid build (`-Pwambito.nativeFromSource=true`): there the precise model is unavailable (spec §6, option 1).
- Copy: "Refinando…" (es), "Refining…" (en); the Settings switch "Mejorar la precisión (+N MB)". All four ARBs get every key (es is the template).
- Repo rules: failing test first; everything in English; Conventional Commits `feat(mobile): …`; stage by path; never a `Co-Authored-By` line; no real voice recordings in the repo; money in integer cents.

## Review Focus

1. **Letting go before Canary has loaded** (first use, cold process: load ≈ 1.3 s): the refine waits for the load inside the same 3 s limit; past it, Vosk's text, no hang. Pinned in Task 3 (`refine waits for a loading model`) and Task 6 (`falls back after 3 s`).
2. **Nothing heard / a very short recording**: no refine is run on empty audio; the sheet takes the "nothing heard" path as today. Pinned in Task 3 (`no refine when no audio was read`).
3. **The sheet closed while refining** (cancel): no event reaches a cancelled sink, the buffer is freed, the next listen starts clean. Pinned in Task 3 (`cancel during refine sends nothing`).
4. **Language changed between listens** (es → en with Canary loaded for es): the recognizer used matches the listen's locale. Pinned in Task 3 (`recognizer is keyed by path and language`).
5. **Models deleted or memory pressure while a refine runs**: the recognizer is closed only after the refine lets go (the existing `ModelCache` lease rule), no crash, Vosk's text if it fails. Pinned in Task 3 (`drop during refine closes after release`).

---

### Task 1: Parser reads "uno cincuenta" as 1,50 €

**Files:**
- Modify: `packages/core/quick-capture/cases.json` (append cases)
- Modify: `apps/mobile/lib/capture/parser/amounts.dart` (near the English "twelve fifty" rule, ~line 499)
- Test: `apps/mobile/test/capture/parser_cases_test.dart` (runs the shared cases; no change expected)

**Interfaces:**
- Consumes: nothing new.
- Produces: no API change; parser behaviour only.

- [ ] **Step 1: Add failing shared cases** to `cases.json` (same shape as `spike-s01`, `currency: "EUR"`, `locale: "es"`, `timeZone: "Europe/Madrid"`, `today: "2026-11-05"`, one category `Transporte`), ids `canary-c01`…`canary-c06`:
  - "Metro uno cincuenta." → one draft, amount `150`, name `metro`;
  - "almuerzo en el trabajo nueve cincuenta" → `950`, name `almuerzo trabajo`;
  - "taxi doce noventa y nueve" → `1299`;
  - "Dos euros en café." → `200` (Canary's capitals and full stop);
  - "Parking, cuatro euros, dentista ciento veinte" → two drafts, `400` and `12000`;
  - COP control, `currency: "COP"`, "almuerzo quince mil" → `1500000` (unchanged behaviour).
- [ ] **Step 2: Run, expect the first three to fail**
  Run: `cd apps/mobile && flutter test test/capture/parser_cases_test.dart`
  Expected: FAIL on `canary-c01`, `canary-c02`, `canary-c03` (today two drafts: 100 + 5000, 900 + 5000, 1200 + 9900).
- [ ] **Step 3: Implement the Spanish units-and-cents rule in `amounts.dart`**: in Spanish, when no scale word was seen (`lastScale == _bigScale`), the first number is an integer 1–99 and the next word number is 10–99 and not followed by a scale word or "cientos", the second is cents, as the English rule does. Only for currencies with cents in daily use (`EUR`, `USD`); COP keeps today's reading. If the amount reader has no access to the currency, pass `ParseContext.currency` down to it.
- [ ] **Step 4: Run the shared cases and the whole capture suite**
  Run: `cd apps/mobile && flutter test --exclude-tags golden test/capture && flutter analyze` and `pnpm --filter @wambito/core test` (the cases' schema test).
  Expected: all PASS, analyze "No issues found!".
- [ ] **Step 5: Commit** — `fix(mobile): read "uno cincuenta" as one amount in euros and dollars`. Own PR.

### Task 2: sherpa-onnx in the app (Play and GitHub builds only)

**Files:**
- Create: `apps/mobile/scripts/fetch-sherpa-onnx.sh` — downloads the AAR (URL, size and SHA-256 from Global Constraints), checks the SHA-256, installs it into the local Maven repo `apps/mobile/android/third_party/m2` as `com.k2fsa.sherpa.onnx:sherpa-onnx:2.0.1` (an `.aar` plus a minimal `.pom`); idempotent; refuses a mismatching file.
- Create: `apps/mobile/scripts/test-fetch-sherpa-onnx.sh` — runs the script against a local file server or a `--from <file>` option with a wrong hash and checks it refuses.
- Modify: `apps/mobile/android/app/build.gradle.kts` — the `third_party/m2` repository is used in both modes; `implementation("com.k2fsa.sherpa.onnx:sherpa-onnx:2.0.1")` only when `nativeFromSource` is false.
- Modify: `apps/mobile/android/app/gradle.lockfile` (regenerate, `docs/mobile/setup.md` "Dependency locks"); `apps/mobile/scripts/check-fdroid-lock.sh` (the F-Droid lockfile also lacks the sherpa-onnx line); `.github/workflows/ci.yml` (`mobile` / `mobile-build` run `fetch-sherpa-onnx.sh` before Gradle, and its test).
- Modify: `apps/mobile/AGENTS.md`, `docs/mobile/setup.md` (new step), `docs/mobile/fdroid.md` ("Open": no Canary on F-Droid yet).

**Interfaces:**
- Produces: the Kotlin classes `com.k2fsa.sherpa.onnx.OfflineRecognizer`, `OfflineRecognizerConfig`, `OfflineModelConfig`, `OfflineCanaryModelConfig(encoder, decoder, srcLang, tgtLang, usePnc)`, `OfflineStream.acceptWaveform(FloatArray, Int)` on the default classpath.

- [ ] **Step 1: Write `test-fetch-sherpa-onnx.sh`** — a wrong-hash file must make `fetch-sherpa-onnx.sh` exit non-zero and leave nothing in `third_party/m2`; the right file installs `sherpa-onnx-2.0.1.aar` and `.pom`.
- [ ] **Step 2: Run it** — Expected: FAIL (script missing).
- [ ] **Step 3: Write `fetch-sherpa-onnx.sh`**, wire Gradle, regenerate the default lockfile, adjust `check-fdroid-lock.sh` to expect the missing sherpa-onnx line in the F-Droid one.
- [ ] **Step 4: Verify** — `bash scripts/test-fetch-sherpa-onnx.sh`, `bash scripts/check-fdroid-lock.sh`, `bash scripts/check-no-google.sh`, `env 'ORG_GRADLE_PROJECT_wambito.nativeFromSource=true' scripts/check-no-google.sh`, `bash scripts/test-native-switch.sh`, and `flutter build apk --debug`; all PASS. Note the arm64 APK size before and after in the commit body.
- [ ] **Step 5: Commit** — `build(mobile): sherpa-onnx 2.0.1 for the precise voice model, not in the f-droid build`.

### Task 3: Kotlin — recording buffer and Canary refine

**Files:**
- Create: `apps/mobile/android/app/src/main/kotlin/com/wambito/app/voice/PcmBuffer.kt` — appends `ShortArray` chunks up to 30 s at 16 kHz; `toFloats(): FloatArray` (samples / 32768f); `isEmpty`; `clear()`.
- Create: `.../voice/PreciseModels.kt` — `interface PreciseRecognizer : AutoCloseable { fun transcribe(samples: FloatArray, sampleRate: Int): String }`; `CanaryRecognizer(path: String, language: String, threads: Int = 4)` implementing it over sherpa-onnx; `object PreciseModels { val cache: ModelCache<PreciseRecognizer>; fun key(path: String, language: String) = "$path#$language"; val available: Boolean }` (`available` = the sherpa-onnx class loads and the device qualifies, Global Constraints); registered for memory pressure like `VoiceModels`.
- Create: `.../voice/Refine.kt` — `class Refine(private val cache: ModelCache<PreciseRecognizer>, private val limitMs: Long = 3000) { fun run(key: String, buffer: PcmBuffer, cancelled: () -> Boolean): RefineResult }`, `sealed class RefineResult { data class Text(val text: String); data class Failed(val code: String); object Skipped }`. Waits for a loading model within `limitMs`, holds a lease while transcribing, returns `Skipped` for an empty buffer or when cancelled.
- Modify: `.../voice/VoiceChannel.kt` — `record(id, path, grammar, precise: String?, language: String?, sink)`: every chunk read also goes into a `PcmBuffer`; after `endUnheard`'s Vosk finals and before `done`, when `precise != null`: send `{type: refining}`, run `Refine`, send `{type: refined, text}` or `{type: refine_failed, code}`; nothing for `Skipped`. Channel methods: `start` args gain `precisePath`/`language`; `warmUp({modelPath, precisePath?, language?})`, `isWarm` (both loaded when `precisePath` is given), `releaseModels` (drops both caches); new `deviceQualifies` → Boolean.
- Test: `apps/mobile/android/app/src/test/kotlin/com/wambito/app/voice/PcmBufferTest.kt`, `RefineTest.kt` (a fake `PreciseRecognizer`, no native library).

**Interfaces:**
- Consumes: `ModelCache<T>` (`warm`, `acquire`, `drop`, `Lease.close`) as it is.
- Produces (channel, read by Task 6): events `{type: "refining"}`, `{type: "refined", text: String}`, `{type: "refine_failed", code: String}` (codes `timeout`, `failed`), sent after the Vosk `result`s and before `done`; methods `deviceQualifies() -> Boolean`, `warmUp({modelPath, precisePath, language})`, `isWarm({modelPath, precisePath, language})`; `start` stream args `{modelPath, grammar, precisePath, language}` (the last two optional).

- [ ] **Step 1: Write the failing tests**
  - `PcmBufferTest`: two chunks of 640 samples give 1280 floats with `Short.MAX_VALUE` → `32767/32768f`; more than 30 s of chunks keeps the first 480 000 samples; `clear()` empties it.
  - `RefineTest`:
    - `refine returns the recognizer's text` (fake returns "Dos euros en café.");
    - `no refine when no audio was read` → `Skipped`, fake never called;
    - `refine waits for a loading model` (load finishes at 1 s, limit 3 s) → `Text`;
    - `refine gives up after the limit` (load 4 s) → `Failed("timeout")`;
    - `recognizer is keyed by path and language` (warm `p#es`, run `p#en` → opens a second one);
    - `drop during refine closes after release` (fake's `close()` called only after `transcribe` returns);
    - `cancel during refine sends nothing` (`cancelled()` true after transcribe → `Skipped`);
    - `a recognizer that throws gives Failed("failed")`.
- [ ] **Step 2: Run** — `cd apps/mobile/android && JAVA_HOME=<JDK 17> ./gradlew :app:testDebugUnitTest --tests '*PcmBufferTest' --tests '*RefineTest' --console=plain` — Expected: FAIL (classes missing).
- [ ] **Step 3: Implement** `PcmBuffer`, `PreciseModels`, `Refine`, then the `VoiceChannel` changes; update `VoiceChannel`'s header comment with the new events and methods.
- [ ] **Step 4: Run** the same command plus the whole `:app:testDebugUnitTest` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(android): keep the recording and re-transcribe it with canary on release`.

### Task 4: Package the Canary model

**Files:**
- Create: `apps/mobile/scripts/package-canary.sh` — from sherpa-onnx's `asr-models` release asset `sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8.tar.bz2` (153692328 bytes, SHA-256 checked against the release's digest), writes `sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8.zip` containing that folder with only `encoder.int8.onnx`, `decoder.int8.onnx`, `tokens.txt` (fixed timestamps, `zip -X`, so it is reproducible), and prints its size, unzipped size and SHA-256; with `--check` it builds twice and fails if the two SHA-256 differ.

**Interfaces:**
- Produces: the zip's `bytes`, `unzippedBytes` and `sha256`, which Task 5 writes into `preciseModels`.

- [ ] **Step 1:** Run `bash scripts/package-canary.sh --check`; Expected: exit 0 and the size, unzipped size and SHA-256 printed.
- [ ] **Step 2: Commit** — `build(mobile): package the canary model for the voice-models-v2 release` (the script only; the zip is not committed).

### Task 5: The precise model store and who gets it

**Files:**
- Modify: `apps/mobile/lib/capture/models_download.dart` — `const preciseModelsReleaseUrl` (`…/releases/download/voice-models-v2`); `const preciseModels = {'es': canary, 'en': canary}` where `canary` is a `VoiceModel(locale: 'es', name: 'sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8', bytes: <zip size>, unzippedBytes: <sum>, sha256: <zip sha>)` (values from Task 4); `ModelStore.deleteModel(String locale)` (releases and deletes one model's folder, `.ready` and `.part`); `final preciseModelStoreProvider`; `final preciseEligibleProvider = FutureProvider<bool>` = `deviceQualifies()` and the locale is `es` or `en`.
- Test: `apps/mobile/test/capture/models_download_test.dart`.

**Interfaces:**
- Produces: `preciseModelStoreProvider: Provider<ModelStore>`, `preciseEligibleProvider`, `ModelStore.deleteModel(String locale)`; one installed Canary folder serves `es` and `en` (same `name`).

- [ ] **Step 1: Failing tests**: `en and es share one precise download` (download `es`, `installedPath('en')` non-null); `deleteModel removes only that model` (Vosk's folder stays); `no precise model for it or pt` (`hasModel('it')` false); `preciseEligible is false when the device does not qualify`.
- [ ] **Step 2: Run** `flutter test test/capture/models_download_test.dart` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the capture suite and analyze — PASS.
- [ ] **Step 5: Commit** — `feat(mobile): a store for the precise voice model, on phones that qualify`.

### Task 6: Dart engine — refining, refined text, 3 s fallback

**Files:**
- Modify: `apps/mobile/lib/capture/engine/voice_channel.dart` — `VoiceEvent.refining()`, `.refined(String text)`, `.refineFailed(String code)` and their `fromMap` cases; `VoicePlatform.start({modelPath, grammar, String? precisePath, String? language})`, `warmUp(String modelPath, {String? precisePath, String? language})`, `isWarm(...)` likewise, `Future<bool> deviceQualifies()`.
- Modify: `apps/mobile/lib/capture/engine/speech_engine.dart` — `SpeechEngine` gains `Stream<bool> get refining` (true from `refining` until the stream closes, then false).
- Modify: `apps/mobile/lib/capture/engine/vosk_engine.dart` — `VoskEngine({required channel, required models, required precise})` where `precise` is the precise `ModelStore` (Task 5); `listen` passes `precisePath` (installed path for the locale, or null) and `language`; on `VoiceRefined` keep its text; on `done` close with the refined text if any, else `_merged`/`_partial` as today; a 3 s timer from the `refining` event closes with Vosk's text and ignores later events.
- Modify: `apps/mobile/lib/capture/prewarm.dart` — `warm()` also loads Canary when it is installed for the locale (`warmUp(locale:)` passes `precisePath`/`language`).
- Test: `apps/mobile/test/capture/vosk_engine_test.dart`, `apps/mobile/test/capture/voice_channel_test.dart`, `apps/mobile/test/capture/prewarm_test.dart`.

**Interfaces:**
- Consumes: Task 3's events and methods; Task 5's `preciseModelStoreProvider` and `ModelStore.installedPath`.
- Produces: `SpeechEngine.refining` (read by Task 7); the final transcript is Canary's when it came.

- [ ] **Step 1: Write the failing tests** in `vosk_engine_test.dart` (the fake channel gets `send(VoiceEvent.refining())` etc.):
  - `the refined text is the last transcript`: partials, Vosk finals, `refining`, `refined("Dos euros en café.")`, `done` → last event `"Dos euros en café."`;
  - `refine_failed keeps Vosk's text`;
  - `falls back after 3 s` (`fakeAsync`: `refining`, then nothing for 3 s → stream closes with Vosk's merged text; a `refined` after that is ignored);
  - `no precise model: start gets no precisePath` and the stream behaves as today;
  - `refining reports true then false`.
  `warmUp loads canary too when installed` (fake channel records `precisePath`) and, in `prewarm_test.dart`, `prewarm passes the precise path`.
  In `voice_channel_test.dart`: `fromMap` reads `refining`, `refined` (text), `refine_failed` (code).
- [ ] **Step 2: Run** — `cd apps/mobile && flutter test test/capture/vosk_engine_test.dart test/capture/voice_channel_test.dart` — Expected: FAIL.
- [ ] **Step 3: Implement** the event types, the platform signatures and the engine changes; update `speechEngineProvider` to pass `precise`.
- [ ] **Step 4: Run** `flutter test --exclude-tags golden test/capture && flutter analyze` — Expected: PASS, no issues.
- [ ] **Step 5: Commit** — `feat(mobile): the voice engine closes with canary's text, or vosk's after 3 s`.

### Task 7: The sheet's "Refinando…" state

**Files:**
- Modify: `apps/mobile/lib/capture/capture_listening.dart` — while `refining` is true, the heard text is dimmed (`inkMuted`) with a small "Refinando…" label under it; the mic level stops.
- Modify: `apps/mobile/lib/capture/capture_session.dart` — listens to `engine.refining` during a listen and exposes `bool refining` to the listening body.
- Modify: `apps/mobile/lib/l10n/app_{es,en,it,pt}.arb` — key `captureRefining`: es "Refinando…", en "Refining…", it "Perfeziono…", pt "A refinar…".
- Test: `apps/mobile/test/capture/capture_sheet_test.dart`, `apps/mobile/test/capture/capture_golden_test.dart` (one golden, day and night).

**Interfaces:**
- Consumes: `SpeechEngine.refining` (Task 6).

- [ ] **Step 1: Failing tests**: `refining shows the label over the heard text` (fake engine emits refining true); `the preview follows the refined text` (fake closes with "Dos euros en café." → preview amount 2,00 €); golden `capture_refining_{day,night}`.
- [ ] **Step 2: Run** `flutter test test/capture/capture_sheet_test.dart` and `flutter test --tags golden test/capture/capture_golden_test.dart` — FAIL.
- [ ] **Step 3: Implement**; `flutter pub get` regenerates l10n.
- [ ] **Step 4: Run** both again (`--update-goldens` once for the new golden, then without) and `flutter analyze` — PASS.
- [ ] **Step 5: Commit** — `feat(mobile): the capture sheet says it is refining while canary works`.

### Task 8: Download — joint opt-in, one-time offer, Settings → Voz

**Files:**
- Modify: `apps/mobile/lib/capture/capture_download.dart` and `capture_session.dart` (`downloadModel`): on an eligible phone the offer shows the sum of Vosk's and Canary's `bytes` and downloads Vosk then Canary into one progress bar; a Canary failure after Vosk landed still lets the person listen (Vosk only) and is retried at the next offer.
- Create: `apps/mobile/lib/capture/precise_offer.dart` — `class PreciseOffer` with `Future<bool> shouldOffer()` (eligible, Vosk installed, Canary not, not answered) and `Future<void> answer({required bool accepted})`; stored in secure-storage settings under `wambito.voice.preciseOffer`.
- Modify: `capture_session.dart` — the one-time offer shows in the sheet before listening when `shouldOffer()`; "Mejorar" downloads Canary, "Ahora no" records the answer and listens.
- Modify: `apps/mobile/lib/settings/settings_screen.dart` — in the voice section, an eligible phone shows the switch "Mejorar la precisión (+N MB)" (on = installed): on downloads, off calls `deleteModel(locale)`; "delete the voice models" also deletes Canary.
- Modify: the four ARBs: `captureOfferPrecise`, `captureOfferPreciseAccept`, `settingsVoicePrecise(int megabytes)`.
- Test: `apps/mobile/test/capture/capture_sheet_test.dart`, `apps/mobile/test/capture/precise_offer_test.dart`, `apps/mobile/test/settings/settings_screen_test.dart` (or the file that tests the voice section).

**Interfaces:**
- Consumes: `preciseModelStoreProvider`, `preciseEligibleProvider`, `ModelStore.deleteModel` (Task 5).
- Produces: `PreciseOffer` (`preciseOfferProvider`).

- [ ] **Step 1: Failing tests**: `eligible offer shows the joint size` (Vosk 39,8 MB + Canary from Task 4 → rounded MB in the button); `vosk lands first and listening works if canary fails`; `one-time offer shows once` (answered → not again); `ineligible phone sees today's offer`; Settings: `switch downloads and deletes only canary`.
- [ ] **Step 2: Run** the three test files — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `flutter test --exclude-tags golden` (whole app) and `flutter analyze` — PASS.
- [ ] **Step 5: Commit** — `feat(mobile): offer the precise voice model with vosk, once to vosk users, and in settings`.

### Task 9: Licences

**Files:**
- Create: `apps/mobile/assets/licenses/cc-by-4.0.txt` (the licence's legal code), `onnxruntime-mit.txt` (onnxruntime 1.x LICENSE as published in the AAR's version), and sherpa-onnx's Apache-2.0 reuses `apache-2.0.txt`.
- Modify: `apps/mobile/lib/settings/licenses.dart` — entries: "Canary-180M flash, NVIDIA" (CC-BY-4.0, with the attribution line "Canary-180M flash by NVIDIA, CC BY 4.0, converted to ONNX by the sherpa-onnx project"), "sherpa-onnx 2.0.1" (Apache-2.0), "onnxruntime" (MIT), plus any third-party notice the AAR's native libraries carry (list them from the AAR's `jni/arm64-v8a/*.so` and sherpa-onnx's `cmake/` at v2.0.1).
- Modify: `apps/mobile/scripts/check-licenses.sh` if it needs to know about the AAR; the ARB notices.
- Test: the licences test next to `licenses.dart` (pins the versions: sherpa-onnx `2.0.1`).

- [ ] **Step 1: Failing test**: the licence page lists the three new entries; a test pins sherpa-onnx `2.0.1` like Vosk's `0.3.75`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** the test, `bash scripts/check-licenses.sh` — PASS.
- [ ] **Step 5: Commit** — `feat(mobile): credit canary, sherpa-onnx and onnxruntime in about`.

### Task 10: The founder's trial

- [ ] **Step 0: Founder:** create the release `voice-models-v2` and upload Task 4's zip (`gh release create voice-models-v2 <zip> --repo slinqer/wambito`). This publishes a file: the agent asks before running it.
- [ ] **Step 1:** Build a release APK as in `docs/mobile/release.md` (arm64) and install it on the founder's phone.
- [ ] **Step 2:** The founder uses voice capture for a few days in Spanish; anything wrong becomes an issue with the phrase as typed (no recording).
- [ ] **Step 3:** Only after this: the F-Droid spike of spec §6 (a separate plan).
