#!/usr/bin/env bash
# Checks the Gradle switch wambito.nativeFromSource (android/app/build.gradle.kts): with it, the
# app takes Vosk and JNA as built from source by scripts/build-native-deps.sh (versions 0.3.75-src
# and 5.18.1-src, from the local repository android/third_party/m2) instead of Maven Central's
# prebuilt AARs. On a temporary copy of the app, with Gradle resolving for real, it lists the
# release classpath three ways:
#   (a) without the property: Maven's vosk-android 0.3.75 and JNA 5.18.1, nothing -src;
#   (b) with it and no android/third_party: the build stops and says to run build-native-deps.sh;
#   (c) with it and stub -src POMs and AARs written here: 0.3.75-src and 5.18.1-src, and no plain
#       JNA 5.18.1 (the stub Vosk POM asks for it, as Maven's does: the switch must exclude it).
# The copy leaves out android/third_party, so a real one is never touched. It keeps the committed
# lockfiles, so Gradle checks them too: (a) against app/gradle.lockfile, (c) against
# app/gradle-fdroid.lockfile, which the stubs satisfy because they carry the same coordinates and
# dependencies as the real -src build (a stub that drifted from it would fail here on the lock).
#
# Usage, from anywhere: apps/mobile/scripts/test-native-switch.sh
# Exit codes: 0 every check passed, 1 a check failed, 2 the copy could not be set up.
set -euo pipefail

MOBILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# The copy keeps the Gradle wrapper and local.properties when they exist (they are not committed;
# Flutter writes them otherwise) and leaves build outputs behind.
COPY="$WORK/mobile"
rsync -a --exclude /build --exclude /.dart_tool --exclude /android/.gradle \
  --exclude /android/.kotlin --exclude /android/app/build --exclude /android/third_party \
  "$MOBILE/" "$COPY/"
cd "$COPY"
flutter pub get --enforce-lockfile >/dev/null || { echo "flutter pub get failed" >&2; exit 2; }
if [ ! -x android/gradlew ] || [ ! -f android/local.properties ]; then
  flutter build apk --config-only >/dev/null || { echo "flutter build --config-only failed" >&2; exit 2; }
fi
# Gradle runs on the JDK Flutter is configured with, as `flutter build` does; otherwise JAVA_HOME.
jdk_dir="$(flutter config --list 2>/dev/null | sed -n 's/^ *jdk-dir: //p')"
if [ -n "$jdk_dir" ]; then export JAVA_HOME="$jdk_dir"; fi

failures=0
pass() { echo "ok    $1"; }
fail() {
  echo "FAIL  $1"
  sed 's/^/        /' "$WORK/out.txt"
  failures=$((failures + 1))
}

# list [gradle args...]: the release classpath into $WORK/out.txt; returns Gradle's exit status.
list() {
  local status=0
  (cd android && ./gradlew --no-daemon --quiet --console=plain :app:dependencies \
    --configuration releaseRuntimeClasspath "$@") >"$WORK/out.txt" 2>&1 || status=$?
  return "$status"
}
has() { grep -qF -- "$1" "$WORK/out.txt"; }
# A JNA line other than exactly 5.18.1-src (a plain 5.18.1, or a -src that lost to it: "-> 5.18.1").
# The lockfile's own constraints ("{strictly 5.18.1-src} -> 5.18.1-src (c)") are not dependencies.
plain_jna() { grep -F 'net.java.dev.jna:jna:' "$WORK/out.txt" | grep -v ' (c)$' | grep -qvE 'net\.java\.dev\.jna:jna:5\.18\.1-src( \(\*\))?$'; }

# (a) The default: Maven Central's artifacts.
name="(a) without the property, Maven's vosk-android 0.3.75 and jna 5.18.1, nothing -src"
if list && has 'com.alphacephei:vosk-android:0.3.75' && has 'net.java.dev.jna:jna:5.18.1' &&
  ! has '-src'; then pass "$name"; else fail "$name"; fi

# (b) The switch on, nothing built.
name="(b) with the property and no third_party, the build stops and says what to run"
status=0
list -Pwambito.nativeFromSource=true || status=$?
if [ "$status" -ne 0 ] && has 'run apps/mobile/scripts/build-native-deps.sh first'; then
  pass "$name"
else
  fail "$name (exit $status)"
fi

# (c) The switch on, with stub artifacts where build-native-deps.sh writes the real ones.
M2="$COPY/android/third_party/m2"
vosk="$M2/com/alphacephei/vosk-android/0.3.75-src"
jna="$M2/net/java/dev/jna/jna/5.18.1-src"
mkdir -p "$vosk" "$jna"
cat >"$vosk/vosk-android-0.3.75-src.pom" <<'POM'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.alphacephei</groupId>
  <artifactId>vosk-android</artifactId>
  <version>0.3.75-src</version>
  <packaging>aar</packaging>
  <dependencies>
    <dependency>
      <groupId>net.java.dev.jna</groupId>
      <artifactId>jna</artifactId>
      <version>5.18.1</version>
      <type>aar</type>
      <scope>compile</scope>
    </dependency>
  </dependencies>
</project>
POM
cat >"$jna/jna-5.18.1-src.pom" <<'POM'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>net.java.dev.jna</groupId>
  <artifactId>jna</artifactId>
  <version>5.18.1-src</version>
  <packaging>aar</packaging>
</project>
POM
printf 'stub\n' >"$vosk/vosk-android-0.3.75-src.aar"
printf 'stub\n' >"$jna/jna-5.18.1-src.aar"

name="(c) with the property and stub -src artifacts, 0.3.75-src and 5.18.1-src, no plain jna 5.18.1"
if list -Pwambito.nativeFromSource=true && has 'com.alphacephei:vosk-android:0.3.75-src' &&
  has 'net.java.dev.jna:jna:5.18.1-src' && ! plain_jna; then pass "$name"; else fail "$name"; fi

if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed."
  exit 1
fi
echo "The wambito.nativeFromSource switch behaved."
