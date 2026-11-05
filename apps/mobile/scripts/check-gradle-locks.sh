#!/usr/bin/env bash
# Fails when android/app/gradle.lockfile (Gradle dependency locking, which pins every dependency
# version of the app, so F-Droid and CI resolve the same graph) is missing or stale. It resolves
# every configuration of :app again with --write-locks and then requires the committed file to be
# exactly what Gradle wrote. The default graph only: gradle-fdroid.lockfile, the graph with
# -Pwambito.nativeFromSource=true, needs android/third_party/m2 (scripts/build-native-deps.sh),
# which CI does not have; docs/mobile/setup.md has the command that rewrites both.
#
# Usage, from anywhere: apps/mobile/scripts/check-gradle-locks.sh
# Exit codes: 0 the lock is current, 1 it is missing or stale, 2 Gradle failed.
set -euo pipefail

ANDROID="$(cd "$(dirname "${BASH_SOURCE[0]}")/../android" && pwd)"
LOCK="app/gradle.lockfile"
cd "$ANDROID"

if [ ! -f "$LOCK" ]; then
  echo "android/$LOCK is missing: run ./gradlew :app:dependencies --write-locks and commit it." >&2
  exit 1
fi
# Flutter's engine artifacts (io.flutter:*) are left out of both locks: they are pinned by the
# Flutter SDK (the engine hash is their version), and which of them a build resolves depends on its
# --target-platform, so a lock with all of them fails a one-ABI build (F-Droid's, one per ABI).
for lock in "$LOCK" app/gradle-fdroid.lockfile; do
  if [ -f "$lock" ] && grep -q '^io\.flutter:' "$lock"; then
    echo "android/$lock locks Flutter's engine artifacts (io.flutter:*): they must be ignored" \
      "(dependencyLocking.ignoredDependencies in app/build.gradle.kts)." >&2
    exit 1
  fi
done
./gradlew --no-daemon --quiet --console=plain :app:dependencies --write-locks >/dev/null ||
  { echo "Gradle failed." >&2; exit 2; }
# Modified or untracked: the file Gradle just wrote must be what is committed.
if [ -n "$(git status --porcelain -- "$LOCK")" ]; then
  git diff -- "$LOCK" >&2 || true
  echo "android/$LOCK is stale: run ./gradlew :app:dependencies --write-locks and commit it." >&2
  exit 1
fi
echo "android/$LOCK is current."
