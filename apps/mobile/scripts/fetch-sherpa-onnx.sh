#!/usr/bin/env bash
# Downloads sherpa-onnx's Android AAR (Apache-2.0, k2-fsa's GitHub release; it is not on Maven
# Central) and installs it in the local Maven repository android/third_party/m2 (git-ignored) as
# com.k2fsa.sherpa.onnx:sherpa-onnx:2.0.1, an .aar and a minimal .pom (declaring Apache-2.0, for About's
# licence list: scripts/gen-android-licenses.dart), where android/app/build.gradle.kts
# looks for it. The AAR carries the Kotlin API and the native libraries (onnxruntime inside) of the
# precise voice model (Canary). The F-Droid build does not take it (docs/mobile/fdroid.md).
#
# The file is checked against the pinned SHA-256 and size before anything is installed; a file that
# does not match is refused and nothing is written. Idempotent: an installed AAR that matches is left
# alone, one that does not is replaced.
#
# Usage, from anywhere: apps/mobile/scripts/fetch-sherpa-onnx.sh [--from <file>] [--m2 <dir>]
#   --from <file>  use this local file instead of downloading (still checked)
#   --m2 <dir>     the repository to install into (default android/third_party/m2)
# SHERPA_ONNX_SHA256 and SHERPA_ONNX_SIZE override the pinned values (for tests only).
# Exit codes: 0 installed (or already), 1 the file does not match, 2 the download or install failed.
set -euo pipefail

VERSION=2.0.1
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v$VERSION/sherpa-onnx-$VERSION.aar"
SIZE="${SHERPA_ONNX_SIZE:-49441341}"
SHA256="${SHERPA_ONNX_SHA256:-a8d09d1d32f3eb8520482c6d3d43fae674681c5b050385967c70a3c2c9bf0ee7}"

MOBILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
M2="$MOBILE/android/third_party/m2"
FROM=""
while [ $# -gt 0 ]; do
  case "$1" in
    --from) FROM="${2:?--from needs a file}"; shift 2 ;;
    --m2) M2="${2:?--m2 needs a directory}"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

DEST="$M2/com/k2fsa/sherpa/onnx/sherpa-onnx/$VERSION"
AAR="$DEST/sherpa-onnx-$VERSION.aar"
POM="$DEST/sherpa-onnx-$VERSION.pom"

sha256_of() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
size_of() { wc -c <"$1" | tr -d ' '; }
matches() { [ "$(size_of "$1")" = "$SIZE" ] && [ "$(sha256_of "$1")" = "$SHA256" ]; }

if [ -f "$AAR" ] && [ -s "$POM" ] && grep -q '<license>' "$POM" && matches "$AAR"; then
  echo "sherpa-onnx $VERSION is already in $M2."
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
if [ -n "$FROM" ]; then
  cp "$FROM" "$TMP/sherpa.aar" || { echo "cannot read $FROM" >&2; exit 2; }
else
  curl --fail --location --silent --show-error --retry 3 -o "$TMP/sherpa.aar" "$URL" ||
    { echo "download of $URL failed" >&2; exit 2; }
fi
if ! matches "$TMP/sherpa.aar"; then
  echo "sherpa-onnx AAR refused: SHA-256 $(sha256_of "$TMP/sherpa.aar") ($(size_of "$TMP/sherpa.aar") bytes)," \
    "wanted $SHA256 ($SIZE bytes). Nothing was installed." >&2
  exit 1
fi

mkdir -p "$DEST"
# Temporary names in the same directory, then mv: an interrupted run never leaves half an AAR.
cp "$TMP/sherpa.aar" "$AAR.part"
cat >"$POM.part" <<POMXML
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.k2fsa.sherpa.onnx</groupId>
  <artifactId>sherpa-onnx</artifactId>
  <version>$VERSION</version>
  <packaging>aar</packaging>
  <licenses>
    <license>
      <name>Apache License, Version 2.0</name>
      <url>https://www.apache.org/licenses/LICENSE-2.0.txt</url>
    </license>
  </licenses>
</project>
POMXML
mv "$AAR.part" "$AAR"
mv "$POM.part" "$POM"
echo "Installed sherpa-onnx $VERSION into $M2."
