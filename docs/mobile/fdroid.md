# How Wambito is built on F-Droid

Wambito is built for F-Droid from source on F-Droid's own build server, from the recipe in this repo, and signed with F-Droid's key. This page is how that works and what is still open. The merge request text for `fdroiddata` is `apps/mobile/fdroid/MERGE_REQUEST.md`.

## What F-Droid sees

- **No Google, no trackers.** `scripts/check-no-google.sh` (CI) fails on Play Services, Firebase, ML Kit, Play Core or any other proprietary artifact in any variant's resolved classpath. No analytics, no crash reporter. Permissions are an allowlist (`scripts/check-permissions.sh`).
- **Licences.** AGPL-3.0-only (the recipe's `License:`); every Dart and Android dependency has a licence entry in About (`scripts/check-licenses.sh`). Voice models and sounds are listed too.
- **Metadata in the repo:** `apps/mobile/fastlane/metadata/android/{es-ES,en-US}` (titles, descriptions, six screenshots each, a changelog per version code). `scripts/check-fastlane.sh` checks F-Droid's limits. There is no `icon.png`: F-Droid takes the launcher icon from the APK. F-Droid finds the folder under the recipe's `subdir: apps/mobile`.
- **Package name** `com.wambito.app` (`docs/superpowers/specs/2026-11-02-wambito-urls-design.md` §3.2): it cannot change once published.

## Decided

- Official F-Droid repository (not our own).
- F-Droid signs with its own key. Its APK is not the one we sign for Play and GitHub, so someone who switches between F-Droid and a Play or GitHub build has to uninstall and reinstall.
- ABIs: `arm64-v8a` and `armeabi-v7a` only (the from-source natives are not built for x86).
- Licence: AGPL-3.0-only.
- Versions: `mobile-vX.Y.Z` tags; `versionCode = (X*10000 + Y*100 + Z) * 10 + ABI digit`, 1 for `armeabi-v7a`, 2 for `arm64-v8a` (`release.md`).

## Open

- After F-Droid publishes the first build, its signing-key fingerprint goes into `ANDROID_CERT_SHA256` next to ours, or App Links and passkeys do not work for F-Droid users (`release.md`; plan Task 10).
- Not exercised at runtime on a from-source build: live speech recognition and anything on `armeabi-v7a` (installs, signs in and loads a model on an arm64 emulator only; the emulator's microphone hung). Check on a real phone before the first release.
- F-Droid's build timeout is unverified: the recipe asks for `timeout: 10800`.

## How the build works

### The switch and the script

The prebuilt native code in the APK comes from two Maven artifacts: `com.alphacephei:vosk-android:0.3.75` (`libvosk.so`) and `net.java.dev.jna:jna:5.18.1` (`libjnidispatch.so`). F-Droid wants native code built from source, so:

- `apps/mobile/scripts/build-native-deps.sh` builds both, native code and Java classes, from pinned sources, and writes them to a local Maven repository, `apps/mobile/android/third_party/m2` (git-ignored), as `vosk-android:0.3.75-src` and `jna:5.18.1-src`. The pinned revisions and the patches are in `docs/superpowers/reports/2026-11-04-vosk-from-source-spike.md`.
  - Options: `--vosk-src`, `--jna-src`, `--ndk` (28.2.13676358), `--abi arm64-v8a|armeabi-v7a` (one ABI; default both), `--work <dir>` (the native build trees), and `--kaldi-src`, `--openfst-src`, `--openblas-src`, `--clapack-src` (otherwise fetched with git at pinned revisions).
  - Linux x86_64 only (upstream's scripts use the NDK's `linux-x86_64` toolchain), so a `linux/amd64` container on a Mac. Needs `cmake autoconf automake libtool libltdl-dev texinfo ant`, JDK 17, an SDK platform and the NDK.
  - Nothing prebuilt from either tree is used: JNA's `lib/native/*.jar` are deleted first. JNA is dual-licensed (Apache-2.0 or LGPL-2.1); About says so, and the `com.sun.jna.**` ProGuard keeps stay.
  - The recipe passes a fixed `--work /tmp/wambito-native-deps`, so `libvosk.so` embeds the same paths on every build.
- The Gradle property `-Pwambito.nativeFromSource=true` (`android/app/build.gradle.kts`) makes the app take those `-src` artifacts. It is off by default, so CI's x86_64 emulator keeps voice. With it set, `check-no-google.sh` resolves the from-source classpath and `check-licenses.sh` reads the licences from the local POMs. `scripts/test-native-switch.sh` tests the switch in CI.

### The two lockfiles

`android/app/gradle.lockfile` (default) and `android/app/gradle-fdroid.lockfile` (with the switch) pin every Gradle dependency. They differ only in the two `-src` lines. Flutter's own `io.flutter:*` artifacts are left out of both: they depend on the ABI, and a one-ABI build would not resolve. How to regenerate them: `setup.md`, "Dependency locks". CI checks the default one.

### The Gradle wrapper jar

`android/gradle/wrapper/gradle-wrapper.jar` is committed: the official jar for the version in `gradle-wrapper.properties` (Gradle 9.3.1, SHA-256 `b3a875ddc1f044746e1b1a55f645584505f4a10438c1afea9f15e92a7c42ec13`, equal to `https://services.gradle.org/distributions/gradle-9.3.1-wrapper.jar.sha256`). F-Droid checks it against its list of known checksums. Flutter writes a jar only when none exists. When the Gradle version changes, regenerate it (`gradle wrapper --gradle-version <new>` in a throwaway project) and compare its SHA-256 with the published one.

### The recipe

`apps/mobile/fdroid/com.wambito.app.yml` is the source of truth; it is copied to `fdroiddata` when submitting.

- One build per ABI (`versionCode` 100001 and 100002 for 1.0.0), `commit: mobile-v1.0.0`, `subdir: apps/mobile`, `ndk: r28c`, `timeout: 10800`.
- Source libraries (`srclibs`): `flutter@3.47.7` (in `fdroiddata`), and ours in `apps/mobile/fdroid/srclibs/*.yml`: `vosk-api`, `jna`, `kaldi`, `openfst`, `OpenBLAS`, `clapack`. All pinned by commit except `jna@5.18.1` and `flutter@3.47.7`, which are tags.
- `sudo:` installs the build tools the script needs. `prebuild:` trims JNA's tree (deletes jars its build does not use, links Debian's `ant.jar` and `asm.jar`), runs `flutter pub get --enforce-lockfile` with an in-tree `PUB_CACHE` (removed from the scan by `scandelete:`), installs the SDK platform, and lowers Gradle's heap from `-Xmx8G` to `-Xmx4G` (8 GB killed the daemon in a 6 GB container).
- **`build:`, not `prebuild:`, runs `build-native-deps.sh`.** F-Droid scans the source between the two, and the AARs the script writes to `android/third_party/m2` would fail that scan. They come from sources that were scanned clean, so the intent holds. Then `flutter build apk --release --split-per-abi` with the switch, `--build-name $$VERSION$$` and `--build-number $(($$VERCODE$$ / 10))`.
- Auto update: `UpdateCheckMode: Tags ^mobile-v`; `VercodeOperation` `%c * 10 + 1` and `%c * 10 + 2`.
- **The pubspec version at release tags.** `UpdateCheckData` reads `apps/mobile/pubspec.yaml`. The tagged commit, and only it, carries `version: X.Y.Z+<base code>`; `main` keeps `0.0.0-dev+1`, which the pattern skips. `release.sh` refuses a tag whose pubspec differs (`release.md`).

### Building it locally

`apps/mobile/scripts/fdroid-build-local.sh <commit> [--version X.Y.Z] [--abi <one ABI>] [--out] [--cpus 4] [--memory 7g] [--keep]` runs, in F-Droid's `buildserver` image under Docker, `fdroid lint`, `fdroid build` of each entry and `fdroid scanner` on the APKs and the source, against a scratch copy of that commit (a scratch repo and a test tag; nothing is pushed). Measured on a Mac with 4 emulated cores: about 70 minutes for one `arm64-v8a` entry (natives 30 minutes, Gradle and Flutter the rest). A full run of both entries took 93 minutes in an earlier run. F-Droid's server should be faster.

## Reproducibility, measured

`scripts/check-reproducible.sh` builds the unsigned release APKs twice from clean (`flutter clean` and a fresh `pub get` between them) and compares them byte for byte; with `--also-at <new dir>` it adds a third build from a fresh clone of HEAD at another path, which is the case that matters (F-Droid never builds where the founder did). Measured on the founder's Mac (Apple Silicon, Flutter 3.47.7, JDK 17.0.21, AGP 9.1.0), on the tree of the commit that added these scripts and again at `d6ac945`:

| Comparison | arm64-v8a | armeabi-v7a |
|---|---|---|
| Two clean builds, same checkout path (also across days: the same hashes came out again) | identical | identical |
| The same commit built in a second checkout path | **differs** | **differs** |

The APKs themselves are normalised by AGP (entry timestamps fixed, no signature, nothing from the clock), so the container is stable. Across checkout paths exactly two files differ, in both ABIs:

- `lib/<abi>/libapp.so`, the Dart AOT snapshot: it contains the absolute `file:///…/.dart_tool/flutter_build/dart_plugin_registrant.dart` of the build tree and a name hash derived from it (`_PluginRegistrant@<hash>`), and everything after it shifts. This is also a privacy leak: **the founder's published APK carries his home directory and user name** (`/Users/<name>/projects/<checkout>/…`). Building in a container or VM at a neutral fixed path fixes the leak and the F-Droid mismatch together, and is the first thing to try.
- `lib/<abi>/libdartjni.so`, built by CMake from the `jni` plugin: 19 bytes differ (probably the build id, or path-derived data; not investigated).

What this means for F-Droid: F-Droid builds at its own fixed path (under `build/<applicationId>` of its build server) and signs the result with its own key, so its APK is not the founder's. For F-Droid's reproducible-build verification (publishing the developer's signature on F-Droid's build, `Binaries:` in the recipe) the founder's build has to be made at the same absolute path, which means a container that mounts the checkout there. Without that, the founder's APK and F-Droid's are two different, individually reproducible builds, F-Droid ships its own, users who switch between them have to reinstall, and `ANDROID_CERT_SHA256` lists both fingerprints (`release.md`).

Not tried, in case path independence is wanted instead of a fixed-path container:

- Dart front-end `--filesystem-root` / `--filesystem-scheme`, which Flutter only exposes through the hidden `--extra-front-end-options`, to map the build tree to a neutral root;
- `-ffile-prefix-map`, `-fdebug-prefix-map` and `-Wl,--build-id=none` in the CMake flags of `libdartjni.so` (the `jni` plugin's build, which the app does not control, so likely a patch in the recipe);
- `--split-debug-info` is about symbols, not paths: it is not a fix for this.

Not yet measured: a different machine or Linux, which is what F-Droid runs. The Dart `gen_snapshot` and the NDK toolchain differ between macOS and Linux hosts, so even a same-path build on the Mac may not match F-Droid's bytes; the only real answer is a build on a Linux host (a container) at F-Droid's path. The builds depend on a warm Gradle cache for speed only, not for the bytes.

## Other native code in the APK

| Library | Where it comes from |
|---|---|
| `libflutter.so` | the Flutter engine, from the `flutter@3.47.7` srclib |
| `libapp.so` | our Dart code, AOT-compiled in the build |
| `libdartjni.so` | the `jni` pub package (via `flutter_secure_storage`), built by CMake in the build |

## Voice models and the server

- The voice models are not in the APK. They are downloaded on first use, after an opt-in that shows the size: Vosk small models for Spanish, English, Italian and Portuguese (30 to 50 MB each; Apache-2.0), SHA-256 checked before they are unzipped (`lib/capture/models_download.dart`). They are data, not code. They come from the `voice-models-v1` GitHub release of this repository.
- By default the app talks to `https://app.wambito.com`, the author's install of the AGPL server in this repo (`deploy/personal`). Settings changes it. No anti-features are declared (see `apps/mobile/fdroid/MERGE_REQUEST.md`).
