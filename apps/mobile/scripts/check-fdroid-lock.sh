#!/usr/bin/env bash
# Fails when android/app/gradle-fdroid.lockfile (the graph with -Pwambito.nativeFromSource=true) is
# not android/app/gradle.lockfile with exactly two substitutions: vosk-android 0.3.75 -> 0.3.75-src
# and jna 5.18.1 -> 5.18.1-src. A text check, no Gradle and no third_party/m2, so CI can run it and a
# dependency change that updates one lock and not the other is caught. To rewrite the F-Droid lock
# after regenerating the default one:
#   sed -e 's/^\(com\.alphacephei:vosk-android:0\.3\.75\)=/\1-src=/' \
#       -e 's/^\(net\.java\.dev\.jna:jna:5\.18\.1\)=/\1-src=/' app/gradle.lockfile > app/gradle-fdroid.lockfile
# (from apps/mobile/android). The two files can be named for tests.
#
# Usage, from anywhere: apps/mobile/scripts/check-fdroid-lock.sh
# Exit codes: 0 the F-Droid lock is the default one with the two substitutions, 1 it is not.
set -uo pipefail

ANDROID="$(cd "$(dirname "${BASH_SOURCE[0]}")/../android" && pwd)"
LOCK="${LOCK:-$ANDROID/app/gradle.lockfile}"
FDROID_LOCK="${FDROID_LOCK:-$ANDROID/app/gradle-fdroid.lockfile}"

expected="$(sed -e 's/^\(com\.alphacephei:vosk-android:0\.3\.75\)=/\1-src=/' \
  -e 's/^\(net\.java\.dev\.jna:jna:5\.18\.1\)=/\1-src=/' "$LOCK")" || exit 1
if ! diff <(printf '%s\n' "$expected") "$FDROID_LOCK" >&2; then
  echo "gradle-fdroid.lockfile is not gradle.lockfile with the two -src substitutions" \
    "(vosk-android 0.3.75-src, jna 5.18.1-src); regenerate it with the sed in $(basename "$0")." >&2
  exit 1
fi
if [ "$(grep -c -e '-src=' "$FDROID_LOCK")" -ne 2 ]; then
  echo "gradle-fdroid.lockfile must hold exactly two -src entries." >&2
  exit 1
fi
echo "gradle-fdroid.lockfile equals gradle.lockfile with the two -src substitutions."
