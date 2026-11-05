#!/usr/bin/env bash
# Builds the two Android libraries of the app that carry native code, Vosk (vosk-android 0.3.75)
# and JNA (5.18.1), from source: their native libraries (libvosk.so: Vosk with Kaldi, OpenFst,
# OpenBLAS and CLAPACK; libjnidispatch.so: JNA with libffi) and their Java classes. F-Droid takes
# no prebuilt binary, and Maven Central's AARs are prebuilt. It writes them to a local Maven
# repository as 0.3.75-src and 5.18.1-src, for arm64-v8a and armeabi-v7a only:
#   <out>/com/alphacephei/vosk-android/0.3.75-src/vosk-android-0.3.75-src.{aar,pom}
#   <out>/net/java/dev/jna/jna/5.18.1-src/jna-5.18.1-src.{aar,pom}
# and the app takes them with `-Pwambito.nativeFromSource=true` (android/app/build.gradle.kts).
# The recipe is the spike's (docs/superpowers/reports/2026-11-04-vosk-from-source-spike.md): the
# pinned revisions below, upstream's android/lib/build-vosk.sh with four edits, and JNA's Ant build
# with its native/Makefile patched for a current NDK. Nothing prebuilt from either source tree is
# used: JNA's lib/native/*.jar (upstream's jnidispatch for every platform) is deleted first.
#
# Usage (Linux x86_64 with the NDK below, cmake, autoconf, automake, libtool, libltdl-dev, texinfo,
# ant, JDK 17, gcc, g++, python3, git; about an hour on 8 cores):
#   apps/mobile/scripts/build-native-deps.sh --vosk-src <dir> --jna-src <dir> --ndk <dir>
#       [--out <dir>]            default: apps/mobile/android/third_party/m2
#       [--kaldi-src <dir>] [--openfst-src <dir>] [--openblas-src <dir>] [--clapack-src <dir>]
#                                Vosk's own dependencies; each one left out is fetched with git
#                                at its pinned revision
#       [--android-jar <file>]   default: the newest platforms/android-*/android.jar of the SDK
#                                ($ANDROID_HOME, or the one the NDK sits in)
#       [--work <dir>]           the build trees (about 4 GB), kept; default: a temporary one
#       [--jobs <n>]             default: the number of processors
# Every source must be a git checkout at its pinned revision, at a path with no spaces.
# Exit codes: 0 built, 1 a build step failed, 2 bad arguments, host, tools or sources.
set -euo pipefail

# Pinned revisions (the spike report's "Source revisions").
VOSK_REV=625e44c62607a3b48fec6d72a30118448909e83f     # vosk-api, version = '0.3.75' (no tag)
KALDI_REV=8b7fecf92b329b7253d9d1cd97898c8b13f9aef3    # alphacep/kaldi, branch vosk-android
OPENFST_REV=18e94e63870ebcf79ebb42b7035cd3cb626ec090  # alphacep/openfst
OPENBLAS_REV=0b678b19dc03f2a999d6e038814c4c50b9640a4e # OpenMathLib/OpenBLAS, tag v0.3.20
CLAPACK_REV=f4e1647de96343fb20eea08a9d4f0e0d04c31c51  # alphacep/clapack, tag v3.2.1
JNA_REV=3c493c1642b1555d541755e0984c968ba6c0f540      # java-native-access/jna, tag 5.18.1
NDK_VERSION=28.2.13676358                             # r28c, the NDK upstream built 0.3.75 with
VOSK_VERSION=0.3.75-src
JNA_VERSION=5.18.1-src
ABIS=(arm64-v8a armeabi-v7a)
# Timestamps inside the archives, so that two builds of the same sources give the same AARs.
ARCHIVE_DATE=1981-01-01T01:01:02Z

MOBILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
vosk_src="" jna_src="" ndk="" out="$MOBILE/android/third_party/m2"
kaldi_src="" openfst_src="" openblas_src="" clapack_src="" android_jar="" work="" jobs=""

usage() {
  sed -n '/^# Usage/,/^# Exit codes/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2
  exit 2
}
die() {
  echo "build-native-deps: $1" >&2
  exit "${2:-2}"
}
while [ $# -gt 0 ]; do
  [ $# -ge 2 ] || usage
  case "$1" in
    --vosk-src) vosk_src="$2" ;;
    --jna-src) jna_src="$2" ;;
    --ndk) ndk="$2" ;;
    --out) out="$2" ;;
    --kaldi-src) kaldi_src="$2" ;;
    --openfst-src) openfst_src="$2" ;;
    --openblas-src) openblas_src="$2" ;;
    --clapack-src) clapack_src="$2" ;;
    --android-jar) android_jar="$2" ;;
    --work) work="$2" ;;
    --jobs) jobs="$2" ;;
    *) usage ;;
  esac
  shift 2
done
[ -n "$vosk_src" ] && [ -n "$jna_src" ] && [ -n "$ndk" ] || usage

# The host and the tools. Upstream's build-vosk.sh and the JNA patch both use the NDK's
# linux-x86_64 toolchain (on a Mac, run this in a linux/amd64 container).
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] ||
  die "needs Linux x86_64 (this is $(uname -s) $(uname -m)): run it in a linux/amd64 container."
for tool in git make cmake autoreconf libtoolize makeinfo ant javac jar gcc g++ python3 patch; do
  command -v "$tool" >/dev/null || die "$tool is missing."
done
ndk="$(cd "$ndk" 2>/dev/null && pwd)" || die "no NDK directory at $ndk"
ndk_have="$(sed -n 's/^Pkg\.Revision *= *//p' "$ndk/source.properties" 2>/dev/null || true)"
[ "$ndk_have" = "$NDK_VERSION" ] || die "the NDK at $ndk is '${ndk_have:-unknown}', not $NDK_VERSION."
ndk_bin="$ndk/toolchains/llvm/prebuilt/linux-x86_64/bin"
[ -x "$ndk_bin/clang" ] || die "the NDK at $ndk has no linux-x86_64 toolchain."
if [ -z "$android_jar" ]; then
  for sdk in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$(dirname "$(dirname "$ndk")")"; do
    [ -n "$sdk" ] && [ -d "$sdk/platforms" ] || continue
    android_jar="$(find "$sdk/platforms" -maxdepth 2 -name android.jar | sort -V | tail -n 1)"
    [ -n "$android_jar" ] && break
  done
fi
[ -f "$android_jar" ] || die "no android.jar: install an SDK platform or pass --android-jar."
jobs="${jobs:-$(nproc)}"
[[ "$jobs" =~ ^[1-9][0-9]*$ ]] || die "--jobs must be a positive number."

if [ -z "$work" ]; then
  work="$(mktemp -d)"
  # A temporary build tree goes when done; after a failure only its logs stay, for reading.
  trap 'status=$?
    if [ "$status" -eq 0 ]; then rm -rf "$work"
    else
      find "$work" -mindepth 1 -maxdepth 1 ! -name logs -exec rm -rf {} +
      echo "build-native-deps: the logs are kept in $work/logs" >&2
    fi' EXIT
fi
mkdir -p "$work"
work="$(cd "$work" && pwd)"
mkdir -p "$work/src" "$work/logs"

# source <name> <dir or empty> <revision> <git url>: the absolute directory of a source, checked
# against its revision when it is a git checkout, or fetched at that revision when not given.
source_dir() {
  local name="$1" dir="$2" rev="$3" url="$4" have
  if [ -z "$dir" ]; then
    dir="$work/src/$name"
    if [ ! -d "$dir/.git" ]; then
      echo "Fetching $name at $rev" >&2
      rm -rf "$dir" && mkdir -p "$dir"
      git -C "$dir" init --quiet
      git -C "$dir" fetch --quiet --depth 1 "$url" "$rev" || die "could not fetch $name from $url."
      git -C "$dir" checkout --quiet FETCH_HEAD
    fi
  fi
  dir="$(cd "$dir" 2>/dev/null && pwd)" || die "no $name source at $dir"
  # The path goes unquoted into sed and into the edited build-vosk.sh.
  case "$dir" in *'#'* | *'&'* | *\\* | *[[:space:]]*)
    die "the path of $name may not hold #, &, \\ or spaces: $dir" ;;
  esac
  # Every source must be a git checkout at its pinned revision: nothing unchecked is built.
  [ -e "$dir/.git" ] ||
    die "$name at $dir is not a git checkout, so its revision cannot be checked against $rev."
  have="$(git -c safe.directory='*' -C "$dir" rev-parse HEAD 2>/dev/null || true)"
  [ "$have" = "$rev" ] || die "$name at $dir is at '${have:-unknown}', not the pinned $rev."
  echo "$dir"
}
vosk_src="$(source_dir vosk "$vosk_src" "$VOSK_REV" https://github.com/alphacep/vosk-api)"
jna_src="$(source_dir jna "$jna_src" "$JNA_REV" https://github.com/java-native-access/jna)"
kaldi_src="$(source_dir kaldi "$kaldi_src" "$KALDI_REV" https://github.com/alphacep/kaldi)"
openfst_src="$(source_dir openfst "$openfst_src" "$OPENFST_REV" https://github.com/alphacep/openfst)"
openblas_src="$(source_dir openblas "$openblas_src" "$OPENBLAS_REV" https://github.com/OpenMathLib/OpenBLAS)"
clapack_src="$(source_dir clapack "$clapack_src" "$CLAPACK_REV" https://github.com/alphacep/clapack)"
[ -f "$vosk_src/android/lib/build-vosk.sh" ] || die "$vosk_src is not vosk-api (no android/lib/build-vosk.sh)."
[ -f "$jna_src/native/Makefile" ] || die "$jna_src is not JNA (no native/Makefile)."

# step <name> <command...>: runs a long build step into its own log, with `set -e` (a plain
# command, not an `if` condition, where bash would ignore it), and on failure shows the step, the
# end of its log and where the whole log is.
step() {
  local name="$1" log="$work/logs/$1.log" start=$SECONDS status
  shift
  echo "$(date -u +%H:%M:%S) $name..." >&2
  set +e
  (
    set -e
    "$@"
  ) >"$log" 2>&1
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    echo "build-native-deps: step $name failed (exit $status); the end of its log:" >&2
    tail -n 40 "$log" | sed 's/^/  | /' >&2
    die "step $name failed; the whole log is $log" 1
  fi
  echo "$(date -u +%H:%M:%S) $name done in $((SECONDS - start)) s" >&2
}
# elf_machine <so>: the machine an ELF file is built for ("AArch64", "ARM").
elf_machine() { "$ndk_bin/llvm-readelf" -h "$1" | sed -n 's/^ *Machine: *//p'; }
expect_machine() {
  local so="$1" abi="$2" want have
  case "$abi" in arm64-v8a) want=AArch64 ;; armeabi-v7a) want=ARM ;; esac
  have="$(elf_machine "$so")"
  [ "$have" = "$want" ] || die "$so is built for '$have', not $want ($abi)." 1
}

stage="$work/stage"
rm -rf "$stage"
mkdir -p "$stage/vosk/jni" "$stage/jna/jni"

# --- Vosk's native library, one ABI at a time (upstream's build-vosk.sh, edited) ---------------
build_vosk() {
  local abi="$1" dir="$work/vosk-$1" script
  rm -rf "$dir" && mkdir -p "$dir"
  cp -a "$vosk_src" "$dir/vosk-api"
  script="$dir/vosk-api/android/lib/build-vosk.sh"
  # 1. Only this ABI (upstream loops over four).
  sed -i "s/^for arch in armeabi-v7a arm64-v8a x86_64 x86; do/for arch in $abi; do/" "$script"
  # 2. The pinned sources instead of the script's clones (two of them of a moving branch).
  sed -i -e "s#^git clone -b v0.3.20 --single-branch https://github.com/xianyi/OpenBLAS#cp -a $openblas_src OpenBLAS#" \
    -e "s#^git clone -b v3.2.1  --single-branch https://github.com/alphacep/clapack#cp -a $clapack_src clapack#" \
    -e "s#^git clone https://github.com/alphacep/openfst#cp -a $openfst_src openfst#" \
    -e "s#^git clone -b vosk-android --single-branch https://github.com/alphacep/kaldi#cp -a $kaldi_src kaldi#" \
    "$script"
  # 3. OpenBLAS static only: its shared-library link test calls undeclared functions, an error
  #    since clang 16, which upstream's script (no `set -e`) never notices. Only the static
  #    library is linked into libvosk.so either way. ($BLAS_ARCH is the script's own variable.)
  # shellcheck disable=SC2016
  sed -i -e 's#^make -C OpenBLAS TARGET=\$BLAS_ARCH ONLY_CBLAS=1#make -C OpenBLAS TARGET=$BLAS_ARCH NO_SHARED=1 ONLY_CBLAS=1#' \
    -e 's#^make -C OpenBLAS install PREFIX=#make -C OpenBLAS install NO_SHARED=1 PREFIX=#' "$script"
  # 4. This machine's processors instead of upstream's fixed eight.
  sed -i "s/ -j 8/ -j $jobs/" "$script"
  grep -q "^for arch in $abi; do" "$script" || die "build-vosk.sh: the ABI edit did not apply."
  [ "$(grep -c 'NO_SHARED=1' "$script")" -eq 2 ] || die "build-vosk.sh: the OpenBLAS edit did not apply."
  [ "$(grep -c '^cp -a .* \(OpenBLAS\|clapack\|openfst\|kaldi\)$' "$script")" -eq 4 ] ||
    die "build-vosk.sh: the source edit did not apply."
  ! grep -q 'git clone' "$script" || die "build-vosk.sh still clones something."
  # The script's last step copies into this directory, which a fresh checkout does not have.
  mkdir -p "$dir/vosk-api/android/lib/src/main/jniLibs/$abi"
  (cd "$dir/vosk-api/android/lib" && ANDROID_NDK_HOME="$ndk" bash -e build-vosk.sh)
}
for abi in "${ABIS[@]}"; do
  step "vosk-$abi" build_vosk "$abi"
  so="$work/vosk-$abi/vosk-api/android/lib/src/main/jniLibs/$abi/libvosk.so"
  [ -f "$so" ] || die "no libvosk.so for $abi" 1
  expect_machine "$so" "$abi"
  mkdir -p "$stage/vosk/jni/$abi" && cp "$so" "$stage/vosk/jni/$abi/"
done

# --- JNA: libjnidispatch.so for both ABIs, then its Java classes -------------------------------
jna_dir="$work/jna"
rm -rf "$jna_dir" && cp -a "$jna_src" "$jna_dir"
# Upstream's prebuilt jnidispatch for every platform: nothing here may use them.
rm -f "$jna_dir"/lib/native/*.jar
# native/Makefile's Android section assumes an NDK with GCC and platforms/ (r10e); r23 and later
# have one clang per target and API level and LLVM's binutils.
patch -s -p1 -d "$jna_dir" <<'PATCH'
--- a/native/Makefile
+++ b/native/Makefile
@@ -127,7 +127,9 @@
 else
 ifeq ($(ARCH),armv7)
 PREFIX=arm-linux-androideabi-
-COPT+= -march=armv7-a -mfloat-abi=softfp -mfpu=vfpv3-d16 -Wl,--fix-cortex-a8
+COPT+= -march=armv7-a -mfloat-abi=softfp -mfpu=vfpv3-d16
+# A linker flag: in COPT clang warns it is unused when compiling, and dispatch.c builds with -Werror.
+LDFLAGS+= -Wl,--fix-cortex-a8
 HOST=arm-linux-eabi
 AARCH=arm
 else
@@ -168,19 +170,24 @@
 endif
 endif
 endif
-NDK?=/Developer/Applications/android-ndk-r10e
-NDK_PLATFORM?=$(NDK)/platforms/android-21
-SYSROOT=$(NDK_PLATFORM)/arch-$(AARCH)
-CC=$(PREFIX)gcc --sysroot $(SYSROOT)
-CPP=$(PREFIX)cpp
+# Modern NDK (r23+): one clang per target triple and API level, LLVM binutils, no GCC,
+# no platforms/ directory. NDK must point at the NDK root.
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
 CDEFINES=-DFFI_STATIC_BUILD -DNO_JAWT -DNO_WEAK_GLOBALS -DFFI_MMAP_EXEC_WRIT=1 -DFFI_MMAP_EXEC_SELINUX=0 -Dmalloc_getpagesize='getpagesize()'
 COPT+=-fpic -ffunction-sections -funwind-tables -fno-short-enums
 JAVA_INCLUDES=
-CINCLUDES+=-I"$(NDK_PLATFORM)/arch-$(AARCH)/usr/include" # -I/usr/include
-LIBS=-nostdlib -L"$(NDK_PLATFORM)/arch-$(AARCH)$(ALIBDIR)/" -lgcc -lc -ldl -lm
+LIBS=-lc -ldl -lm
 LDFLAGS+=-Wl,-shared,-Bsymbolic -Wl,--build-id=sha1 -Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384
 FFI_ENV=CPP="$(CPP)" CC="$(CC)" CFLAGS="$(COPT) $(CDEBUG) $(CINCLUDES)" CPPFLAGS="$(CDEFINES) $(CINCLUDES)" LIBS="$(LIBS)" RANLIB="$(RANLIB)"
 FFI_CONFIG=--enable-static --disable-shared --with-pic=yes --host=$(HOST)
PATCH
# -Drelease: the release's version, 5.18.1, not upstream's working 5.18.1-SNAPSHOT (Version.java,
# which JNA reports at run time and checks against the native library's).
jna_native() { (cd "$jna_dir" && NDK="$ndk" ant -Drelease=true -Dos.prefix="$1" native); }
for abi in "${ABIS[@]}"; do
  case "$abi" in arm64-v8a) prefix=android-aarch64 ;; armeabi-v7a) prefix=android-armv7 ;; esac
  step "jna-$abi" jna_native "$prefix"
  so="$jna_dir/build/native-$prefix/libjnidispatch.so"
  [ -f "$so" ] || die "no libjnidispatch.so for $abi" 1
  expect_machine "$so" "$abi"
  mkdir -p "$stage/jna/jni/$abi" && cp "$so" "$stage/jna/jni/$abi/"
done
# The Java classes, as JNA's own `compile` target builds them (it writes the version into
# Version.java), without the native libraries its jars bundle.
jna_classes() { (cd "$jna_dir" && ant -Drelease=true compile); }
step jna-classes jna_classes
grep -q 'VERSION = "5.18.1";' "$jna_dir/build/jna-src/com/sun/jna/Version.java" ||
  die "JNA's classes do not say version 5.18.1." 1
mkdir -p "$stage/jna-classes/META-INF"
(cd "$jna_dir/build/classes" && find com/sun/jna -name '*.class' -print0 |
  xargs -0 -I{} cp --parents {} "$stage/jna-classes/")
cp "$jna_dir/LICENSE" "$jna_dir/LGPL2.1" "$jna_dir/AL2.0" "$stage/jna-classes/META-INF/"

# --- Vosk's Java classes, against Android's API and the JNA classes just built -----------------
vosk_classes() {
  mkdir -p "$stage/vosk-classes"
  find "$vosk_src/android/lib/src/main/java" -name '*.java' | LC_ALL=C sort >"$work/vosk-sources.txt"
  # Java 8, as upstream's compileOptions: the JDK's Java 8 API (lambdas need its
  # LambdaMetafactory, which android.jar does not have), and Android's own classes from android.jar.
  javac --release 8 -classpath "$android_jar:$stage/jna-classes" \
    -encoding UTF-8 -nowarn -d "$stage/vosk-classes" @"$work/vosk-sources.txt"
}
step vosk-classes vosk_classes

# --- The two AARs and their POMs -----------------------------------------------------------------
# archive <file> <dir> [--no-manifest]: a zip of <dir>'s files in a fixed order and with fixed
# timestamps.
archive() {
  local file="$1" dir="$2" list
  shift 2
  list="$(mktemp)"
  (cd "$dir" && find . -type f | sed 's#^\./##' | LC_ALL=C sort) >"$list"
  (cd "$dir" && jar --create --file "$file" --date="$ARCHIVE_DATE" "$@" @"$list")
  rm -f "$list"
}
archive "$stage/vosk/classes.jar" "$stage/vosk-classes"
archive "$stage/jna/classes.jar" "$stage/jna-classes"

cat >"$stage/vosk/AndroidManifest.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="org.vosk" >

    <uses-sdk android:minSdkVersion="21" />

</manifest>
XML
: >"$stage/vosk/R.txt"
mkdir -p "$stage/vosk/META-INF/com/android/build/gradle"
cat >"$stage/vosk/META-INF/com/android/build/gradle/aar-metadata.properties" <<'PROPERTIES'
aarFormatVersion=1.0
aarMetadataVersion=1.0
minCompileSdk=1
minCompileSdkExtension=0
minAndroidGradlePluginVersion=1.0.0
coreLibraryDesugaringEnabled=false
PROPERTIES

# JNA's own AAR layout (build.xml, target `aar`); 5180199 is the versionCode its CalcAndroidVersion
# gives 5.18.1.
cat >"$stage/jna/AndroidManifest.xml" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.sun.jna"
    android:versionCode="5180199"
    android:versionName="5.18.1" >

    <uses-sdk android:targetSdkVersion="25" />
</manifest>
XML
printf 'int string jna_library_appname 0x7f050021\n' >"$stage/jna/R.txt"
mkdir -p "$stage/jna/res/values"
cat >"$stage/jna/res/values/values.xml" <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<resources>
    <string name="jna_library_appname">JNA bindings</string>
</resources>
XML

vosk_out="$stage/m2/com/alphacephei/vosk-android/$VOSK_VERSION"
jna_out="$stage/m2/net/java/dev/jna/jna/$JNA_VERSION"
mkdir -p "$vosk_out" "$jna_out"
archive "$vosk_out/vosk-android-$VOSK_VERSION.aar" "$stage/vosk" --no-manifest
archive "$jna_out/jna-$JNA_VERSION.aar" "$stage/jna" --no-manifest

# The licences as the Maven POMs declare them (scripts/gen-android-licenses.dart reads them).
cat >"$vosk_out/vosk-android-$VOSK_VERSION.pom" <<POM
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.alphacephei</groupId>
  <artifactId>vosk-android</artifactId>
  <version>$VOSK_VERSION</version>
  <packaging>aar</packaging>
  <name>Vosk Android</name>
  <description>vosk-android 0.3.75 built from source (vosk-api $VOSK_REV, kaldi $KALDI_REV, openfst $OPENFST_REV, OpenBLAS $OPENBLAS_REV, clapack $CLAPACK_REV) for ${ABIS[*]}</description>
  <licenses>
    <license>
      <name>The Apache License, Version 2.0</name>
      <url>http://www.apache.org/licenses/LICENSE-2.0.txt</url>
    </license>
  </licenses>
  <scm>
    <url>https://github.com/alphacep/vosk-api/</url>
  </scm>
  <dependencies>
    <dependency>
      <groupId>net.java.dev.jna</groupId>
      <artifactId>jna</artifactId>
      <version>$JNA_VERSION</version>
      <type>aar</type>
      <scope>compile</scope>
    </dependency>
  </dependencies>
</project>
POM
cat >"$jna_out/jna-$JNA_VERSION.pom" <<POM
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>net.java.dev.jna</groupId>
  <artifactId>jna</artifactId>
  <version>$JNA_VERSION</version>
  <packaging>aar</packaging>
  <name>Java Native Access</name>
  <description>JNA 5.18.1 built from source (jna $JNA_REV) for ${ABIS[*]}</description>
  <licenses>
    <license>
      <name>LGPL-2.1-or-later</name>
      <url>https://www.gnu.org/licenses/old-licenses/lgpl-2.1</url>
    </license>
    <license>
      <name>Apache-2.0</name>
      <url>https://www.apache.org/licenses/LICENSE-2.0.txt</url>
    </license>
  </licenses>
  <scm>
    <url>https://github.com/java-native-access/jna</url>
  </scm>
</project>
POM

# Exactly the two ABIs' libraries in each AAR.
for aar in "$vosk_out/vosk-android-$VOSK_VERSION.aar" "$jna_out/jna-$JNA_VERSION.aar"; do
  jni="$(jar --list --file "$aar" | grep '^jni/.' | grep -v '/$' | LC_ALL=C sort | tr '\n' ' ')"
  case "$aar" in
    *vosk*) want="jni/arm64-v8a/libvosk.so jni/armeabi-v7a/libvosk.so " ;;
    *) want="jni/arm64-v8a/libjnidispatch.so jni/armeabi-v7a/libjnidispatch.so " ;;
  esac
  [ "$jni" = "$want" ] || die "$(basename "$aar") holds '$jni', not '$want'." 1
done

# Into place, replacing what an earlier run wrote there.
mkdir -p "$out"
for path in com/alphacephei/vosk-android/$VOSK_VERSION net/java/dev/jna/jna/$JNA_VERSION; do
  rm -rf "${out:?}/$path"
  mkdir -p "$(dirname "$out/$path")"
  cp -R "$stage/m2/$path" "$out/$path"
done
echo "Wrote vosk-android $VOSK_VERSION and jna $JNA_VERSION (${ABIS[*]}) to $out" >&2
