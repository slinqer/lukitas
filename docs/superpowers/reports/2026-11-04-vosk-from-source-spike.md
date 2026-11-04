# Spike: Vosk and JNA from source for F-Droid

Date: 2026-11-04. Gate for the F-Droid work (spec `2026-11-04-store-publishing-design.md` §3.1,
`docs/mobile/fdroid.md`, "Native libraries from Maven that are prebuilt").

## Outcome

**Works, with small patches.** `libvosk.so` (vosk-android 0.3.75) and `libjnidispatch.so` (JNA
5.18.1) build from source for `arm64-v8a` and `armeabi-v7a` with NDK `28.2.13676358` in a Debian
bookworm container. The Vosk libraries come out with the same exported symbols, the same section
list, the same compiler and within 56 bytes of the size of the Maven AAR's. A debug APK carrying the
from-source libraries loads both of them on the arm64 emulator and calls into Vosk's native code.

Limits of what was tested:

- **Speech recognition was not exercised.** No voice model was available on this machine (the
  `voice-models-v1` release does not exist yet, and the spike was limited to the build sources
  below). The emulator test shows that JNA loads, `libvosk.so` registers and Kaldi's model loader
  runs. It does not show a transcription in Spanish or English.
- **No physical phone** was available. Everything ran on the arm64 emulator (API 36, 4 KB pages),
  so `armeabi-v7a` was only checked statically.
- Only the native code was rebuilt. Both AARs' `classes.jar` were the Maven ones (see "What the
  recipe still has to do").

## Source revisions

| Source | Revision | How it was established |
|---|---|---|
| `alphacep/vosk-api` | `625e44c62607a3b48fec6d72a30118448909e83f` (2025-12-08, "Bump JNA requirements to 5.18.1 and update version") | There is no `0.3.75` tag (the newest Android-relevant tag is `v0.3.50`). This commit sets `version = '0.3.75'` in `android/build.gradle`. Maven Central's POM is `Last-Modified: 2025-12-08 20:50 GMT`, three minutes after this commit (20:47 UTC). The next change under `android/` or `src/`, `e81a422` (2026-05-28), adds `SpeechService.getAudioSessionId()`, which the AAR's `classes.jar` lacks (`javap`). The AAR has everything older, such as `Recognizer.setEndpointerMode` (2025-09). Any commit in `625e44c..e81a422^` builds the same Android library. |
| `alphacep/kaldi`, branch `vosk-android` | `8b7fecf92b329b7253d9d1cd97898c8b13f9aef3` (2024-08-23) | `build-vosk.sh` clones the branch head unpinned. The head has not moved since 2024-08, so it is what 0.3.75 used. |
| `alphacep/openfst`, default branch | `18e94e63870ebcf79ebb42b7035cd3cb626ec090` (2024-08-23) | Cloned unpinned too, and unchanged since 2024-08. |
| `xianyi/OpenBLAS` tag `v0.3.20` | `0b678b19dc03f2a999d6e038814c4c50b9640a4e` | Pinned by the script. |
| `alphacep/clapack` tag `v3.2.1` | `f4e1647de96343fb20eea08a9d4f0e0d04c31c51` | Pinned by the script. |
| `java-native-access/jna` tag `5.18.1` | `3c493c1642b1555d541755e0984c968ba6c0f540` | The tag. The build reports native API `7.0.4`, checksum `5fb98531302accd485c534c452dd952a`, the same strings as in Maven's `libjnidispatch.so`. |
| Android NDK | `28.2.13676358` (r28c), through `sdkmanager` | Maven's `libvosk.so` `.comment` reads `Android (13624864, … based on r530567e) clang version 19.0.1 (… 97a699bf48…)`, which is exactly this NDK's clang, so upstream built 0.3.75 with this NDK. Maven's `libjnidispatch.so` was built with `GCC 4.9.x 20150123`, an old NDK (r10e era, as `native/Makefile` assumes). |

## Environment and commands

The host was an Apple Silicon Mac (10 cores, 16 GB). Docker Desktop ran a `linux/amd64` container
under Rosetta, given `--cpus 10 --memory 7g`. The scripts' own `make -j 8` was kept. Sources were
cloned once into a read-only directory and the build trees went to a separate one (3.4 GB for the
two Vosk ABIs).

The image (Debian bookworm):

```dockerfile
FROM debian:bookworm
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl unzip git make cmake autoconf automake libtool gcc g++ python3 \
    openjdk-17-jdk-headless ant file binutils xz-utils patch time \
    libltdl-dev texinfo && rm -rf /var/lib/apt/lists/*
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp && \
    curl -fsSLo clt.zip https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip && \
    unzip -q clt.zip -d $ANDROID_HOME/cmdline-tools && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
RUN yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null && \
    $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "ndk;28.2.13676358"
ENV ANDROID_NDK_HOME=/opt/android-sdk/ndk/28.2.13676358
```

(`libltdl-dev` and `texinfo` were added after the first JNA attempts. libffi's `autogen.sh` needs
`LT_SYS_SYMBOL_USCORE` from `ltdl.m4`, and libffi's build runs `makeinfo`.)

Vosk, run once per ABI inside the container (`/src` holds the pinned clones):

```sh
cp -a /src/vosk-api vosk-api && cd vosk-api/android/lib
# build only this ABI
sed -i "s/^for arch in armeabi-v7a arm64-v8a x86_64 x86; do/for arch in $ABI; do/" build-vosk.sh
# pinned, pre-fetched sources instead of the script's git clones
sed -i -e 's#^git clone -b v0.3.20 --single-branch https://github.com/xianyi/OpenBLAS#cp -a /src/OpenBLAS OpenBLAS#' \
       -e 's#^git clone -b v3.2.1  --single-branch https://github.com/alphacep/clapack#cp -a /src/clapack clapack#' \
       -e 's#^git clone https://github.com/alphacep/openfst#cp -a /src/openfst openfst#' \
       -e 's#^git clone -b vosk-android --single-branch https://github.com/alphacep/kaldi#cp -a /src/kaldi kaldi#' build-vosk.sh
# OpenBLAS static only (see Patches)
sed -i -e 's#^make -C OpenBLAS TARGET=\$BLAS_ARCH ONLY_CBLAS=1#make -C OpenBLAS TARGET=$BLAS_ARCH NO_SHARED=1 ONLY_CBLAS=1#' \
       -e 's#^make -C OpenBLAS install PREFIX=#make -C OpenBLAS install NO_SHARED=1 PREFIX=#' build-vosk.sh
mkdir -p src/main/jniLibs/$ABI
bash -e build-vosk.sh        # ANDROID_NDK_HOME set by the image
```

JNA, run once per target (`android-aarch64`, `android-armv7`):

```sh
cp -a /src/jna jna && cd jna
patch -p1 < jna-modern-ndk.patch
NDK=$ANDROID_NDK_HOME ant -Dos.prefix=$TARGET native
# result: build/native-$TARGET/libjnidispatch.so
```

## Wall times

The times are under amd64 emulation (Rosetta) on the Mac, one ABI at a time.

| Step | arm64-v8a | armeabi-v7a |
|---|---|---|
| OpenBLAS 0.3.20 (build + install) | 5 min 21 s | 4 min 35 s |
| CLAPACK | 2 min 36 s | 4 min 48 s |
| OpenFst (autoreconf, configure, build, install) | 2 min 58 s | 3 min 45 s |
| Kaldi (configure, `make depend`, `make online2 rnnlm`) | 17 min 46 s | 10 min 15 s |
| Vosk (`src/`, link `libvosk.so`) | 53 s | 38 s |
| **Vosk total** | **29 min 34 s** | **24 min 2 s** |
| JNA `ant native` (libffi + dispatch) | 1 min 50 s | 1 min 51 s |

So both ABIs of both libraries take about 57 minutes of wall time. One-off costs on top of that were
5 min 7 s to build the image (most of it the NDK download) and about 20 s to clone Kaldi, OpenFst,
OpenBLAS and CLAPACK (vosk-api and JNA were cloned earlier). The app's debug build with the swapped
AARs took 54 s.

## Patches needed

Vosk (`android/lib/build-vosk.sh` at `625e44c`):

1. **ABI list** (recipe choice): build only `arm64-v8a` and `armeabi-v7a`, not the four upstream
   ABIs.
2. **Pinned sources** (needed for F-Droid): the script clones Kaldi's `vosk-android` branch and
   OpenFst's default branch unpinned at build time. The recipe must fetch the commits above as
   srclibs and copy them in place of the `git clone` lines.
3. **`src/main/jniLibs/<abi>` must exist** for the script's last `cp`.
4. **OpenBLAS static only** (`NO_SHARED=1` on its build and install). OpenBLAS 0.3.20's shared-library
   link test (`exports/linktest.c`) calls undeclared functions, a hard error since clang 16. The
   upstream script has no `set -e`, so the failure goes unnoticed there and only the static library
   is linked into `libvosk.so` anyway. With `bash -e`, which a recipe wants so that real failures stop
   the build, the patch is needed. It does not change what is linked.

No source change to Kaldi, OpenFst, CLAPACK or Vosk itself was needed.

JNA (`native/Makefile` at `5.18.1`): the Android section assumes an NDK with GCC and a `platforms/`
directory, which NDK r23 and later no longer have. The patch:

```diff
@@ ifeq ($(ARCH),armv7)
-COPT+= -march=armv7-a -mfloat-abi=softfp -mfpu=vfpv3-d16 -Wl,--fix-cortex-a8
+COPT+= -march=armv7-a -mfloat-abi=softfp -mfpu=vfpv3-d16
+# A linker flag: in COPT clang warns it is unused when compiling, and dispatch.c builds with -Werror.
+LDFLAGS+= -Wl,--fix-cortex-a8
@@
-NDK?=/Developer/Applications/android-ndk-r10e
-NDK_PLATFORM?=$(NDK)/platforms/android-21
-SYSROOT=$(NDK_PLATFORM)/arch-$(AARCH)
-CC=$(PREFIX)gcc --sysroot $(SYSROOT)
-CPP=$(PREFIX)cpp
+NDK_API?=21
+NDK_BIN=$(NDK)/toolchains/llvm/prebuilt/linux-x86_64/bin
+ifeq ($(ARCH),armv7)
+CLANG_TARGET=armv7a-linux-androideabi
+else
+CLANG_TARGET=$(HOST)
+endif
+CC=$(NDK_BIN)/$(CLANG_TARGET)$(NDK_API)-clang
+CPP=$(CC) -E
 LD=$(CC)
-RANLIB=$(PREFIX)ranlib
-STRIP=$(PREFIX)strip -x
+RANLIB=$(NDK_BIN)/llvm-ranlib
+STRIP=$(NDK_BIN)/llvm-strip -x
@@
-CINCLUDES+=-I"$(NDK_PLATFORM)/arch-$(AARCH)/usr/include" # -I/usr/include
-LIBS=-nostdlib -L"$(NDK_PLATFORM)/arch-$(AARCH)$(ALIBDIR)/" -lgcc -lc -ldl -lm
+LIBS=-lc -ldl -lm
```

## The built libraries against the Maven AARs'

| Library | Maven size | Built size | Exports | 16 KB alignment |
|---|---|---|---|---|
| `arm64-v8a/libvosk.so` | 10,042,800 | 10,042,744 | 14,946 dynamic symbols (41 `vosk_*`), identical list | LOAD `0x4000` in both |
| `armeabi-v7a/libvosk.so` | 8,985,628 | 8,985,624 | 14,780 (41 `vosk_*`), identical list | LOAD `0x1000` in both (32-bit, irrelevant to the 16 KB rule) |
| `arm64-v8a/libjnidispatch.so` | 176,520 | 161,680 | 69 `Java_*` + `JNI_OnLoad`, identical list | LOAD `0x4000` in both |
| `armeabi-v7a/libjnidispatch.so` | 126,496 | 110,008 | 69 `Java_*` + `JNI_OnLoad`, identical list | LOAD `0x4000` in both |

All four built libraries have the same `NEEDED` entries as Maven's (`liblog`, `libm`, `libdl`,
`libc` for Vosk; `libc`, `libdl`, `libm` for JNA), and `SONAME libvosk.so` is the same. The
`armeabi-v7a` Vosk build has the same ARM attributes (VFPv3, NEON).

- **Vosk is not byte-identical, but it is close.** The section lists match, `.text` differs by
  32 bytes and `.rodata` by 48. The differences come from the build path that `__FILE__` embeds
  (assertion messages): upstream's CI home directory in Maven's library, `/work/<abi>/…` in ours.
  Building in a directory of the same length, or with `-ffile-prefix-map`, might make the output
  reproducible. That was not tried.
- **JNA is smaller and different:** clang 19 with LLVM's strip, against upstream's GCC 4.9.
  The JNI surface and the native API version are the same.

## What was tested in the app

The test ran in the `feat/fdroid` worktree, with throwaway changes reverted afterwards and nothing
committed. `implementation("com.alphacephei:vosk-android:0.3.75")` was replaced by
`implementation(files(<vosk-android-0.3.75-src.aar>, <jna-5.18.1-src.aar>))`. These are copies of the
Maven AARs with `jni/` reduced to the two ARM ABIs and replaced by the built libraries.

- `flutter build apk --debug --target-platform android-arm64` built. The APK's `lib/arm64-v8a` and
  `lib/armeabi-v7a` held the built libraries (AGP-stripped: 10,042,736 and 8,985,596 bytes for
  Vosk). Checks confirmed they were ours: the clang `.comment` in `libjnidispatch.so` and the
  `/work/…` paths in `libvosk.so`.
- A throwaway integration test (`flutter test … -d emulator-5554`, arm64-v8a AVD, API 36) passed:
  - `VoiceChannel.supported()` returned `true`. That means JNA loaded our `libjnidispatch.so`
    (`nativeloader: Load …/lib/arm64-v8a/libjnidispatch.so … ok`), registered `libvosk.so` and
    called `vosk_set_log_level`.
  - `warmUp` on a folder with no model ran Kaldi's model loader. It logged through `liblog`
    (`VoskAPI: Model():model.cc:132) Folder '…/no-such-model' does not contain model files`) and
    failed cleanly with `PlatformException(failed, Failed to create a model)`.
- **Not tested:** recognition with real Spanish or English models, a phone, and `armeabi-v7a` at
  runtime.

## Recommendation for the F-Droid recipe

Go ahead with Tasks 6 to 10: Vosk and JNA from source are feasible. For the recipe:

- **srclibs:** `vosk-api@625e44c6…`, `kaldi@8b7fecf9…` (alphacep fork), `openfst@18e94e63…`
  (alphacep fork), `OpenBLAS@v0.3.20`, `clapack@v3.2.1` (alphacep), `jna@5.18.1`. Use the NDK
  `28.2.13676358` through the recipe's `ndk:` field. In `prebuild` or `build`, apply the four
  `build-vosk.sh` edits above (with `sed` or a patch file kept in the app repo) and the JNA
  `native/Makefile` patch. Then run `bash -e build-vosk.sh` and
  `ant -Dos.prefix=android-{aarch64,armv7} native`.
- **Build server packages:** the recipe needs `sudo apt-get install` for `cmake autoconf automake
  libtool libltdl-dev texinfo ant` (F-Droid's buildserver is Debian; check what is preinstalled).
- **Gradle side (§3.2 switch):** replace the Maven dependencies with a local Maven repository or
  `flatDir` holding an AAR assembled from the built `.so` files and **Java classes built from the
  same sources**. The spike reused Maven's `classes.jar` for both. Building `vosk-api/android/lib`
  as a Gradle module, and `ant jar` for JNA, are small steps but still to be done.
- **Debug x86_64:** the from-source AARs carry only the ARM ABIs, so a debug build with the switch on
  has no Vosk on the CI's x86_64 emulator. Keep the switch off for the integration tests, or add
  `x86_64` to the from-source build (about 25 to 30 more minutes).
- **Build time on F-Droid's x86_64 server:** here it took about 57 minutes for both ABIs of both
  libraries under Rosetta, with `-j 8` on 10 cores. Natively on x86_64 the same work should be
  roughly 1.2 to 1.5 times faster per core. But the build server probably has fewer cores than this
  Mac, and the scripts hard-code `-j 8`. Expected: **about 40 to 60 minutes on 8 or more cores, and
  1.5 to 2.5 hours on 2 to 4 cores**, plus the Flutter and Gradle build of the app (several more
  minutes). Kaldi is the long pole (10 to 18 minutes per ABI here). This is within reach of
  F-Droid's build timeout, which I understand to be 2 hours by default and raisable per app with the
  `timeout:` field (to be confirmed against the current fdroidserver). The recipe should set
  `timeout:` explicitly, for example 10800 s. The 3.4 GB of build trees fit the server's disk.
- **Before submitting:** run voice recognition on a phone in Spanish and English with the real
  models and the from-source libraries. This spike could not do that, and it is the remaining risk.
