#!/usr/bin/env bash
# Tests fetch-sherpa-onnx.sh without the network, with --from <file> and --m2 <dir>:
#   - a file with the wrong SHA-256 is refused (exit 1) and leaves nothing in the repository dir;
#   - a file with the right SHA-256 installs sherpa-onnx-2.0.1.aar and .pom, and a second run
#     changes nothing (idempotent).
# The script's pinned hash is overridden with SHERPA_ONNX_SHA256 / SHERPA_ONNX_SIZE for the good file.
#
# Usage, from anywhere: apps/mobile/scripts/test-fetch-sherpa-onnx.sh
# Exit codes: 0 every check passed, 1 a check failed.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FETCH="$DIR/fetch-sherpa-onnx.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
failures=0
pass() { echo "ok    $1"; }
fail() {
  echo "FAIL  $1" >&2
  failures=$((failures + 1))
}

printf 'not the real aar\n' >"$WORK/bad.aar"
printf 'a stand-in aar\n' >"$WORK/good.aar"
good_sha="$(shasum -a 256 "$WORK/good.aar" | cut -d' ' -f1)"
good_size="$(wc -c <"$WORK/good.aar" | tr -d ' ')"
M2="$WORK/m2"
ART="$M2/com/k2fsa/sherpa/onnx/sherpa-onnx/2.0.1"

# 1. The wrong file (the pinned hash is the real AAR's): refused, nothing installed.
out="$("$FETCH" --from "$WORK/bad.aar" --m2 "$M2" 2>&1)"
code=$?
if [ "$code" -eq 1 ] && grep -qi 'sha-256' <<<"$out" && [ ! -e "$ART" ] && [ -z "$(find "$M2" -type f 2>/dev/null)" ]; then
  pass "a file with the wrong SHA-256 is refused and nothing is installed"
else
  fail "wrong file: exit $code, output: $out"
fi

# 2. The right file (hash and size given for the stand-in): installed.
export SHERPA_ONNX_SHA256="$good_sha" SHERPA_ONNX_SIZE="$good_size"
if "$FETCH" --from "$WORK/good.aar" --m2 "$M2" >/dev/null 2>&1 &&
  cmp -s "$WORK/good.aar" "$ART/sherpa-onnx-2.0.1.aar" && [ -s "$ART/sherpa-onnx-2.0.1.pom" ] &&
  grep -q '<groupId>com.k2fsa.sherpa.onnx</groupId>' "$ART/sherpa-onnx-2.0.1.pom" &&
  grep -q '<packaging>aar</packaging>' "$ART/sherpa-onnx-2.0.1.pom"; then
  pass "the right file installs sherpa-onnx-2.0.1.aar and .pom"
else
  fail "right file was not installed"
fi

# 2b. The POM declares the licence (Apache-2.0), as the library's own POMs do, so
# scripts/gen-android-licenses.dart can list it.
if grep -q '<license>' "$ART/sherpa-onnx-2.0.1.pom" &&
  grep -q '<name>Apache License, Version 2.0</name>' "$ART/sherpa-onnx-2.0.1.pom"; then
  pass "the POM declares the Apache-2.0 licence"
else
  fail "the POM names no licence"
fi

# 2c. A POM installed before it declared a licence is rewritten, not trusted.
sed -i.bak '/<licenses>/,/<\/licenses>/d' "$ART/sherpa-onnx-2.0.1.pom"
rm -f "$ART/sherpa-onnx-2.0.1.pom.bak"
if "$FETCH" --from "$WORK/good.aar" --m2 "$M2" >/dev/null 2>&1 && grep -q '<license>' "$ART/sherpa-onnx-2.0.1.pom"; then
  pass "a POM without a licence is rewritten"
else
  fail "licence-less POM kept"
fi

# 3. Idempotent: a second run leaves the files alone.
before="$(shasum -a 256 "$ART"/* | shasum -a 256)"
if "$FETCH" --from "$WORK/good.aar" --m2 "$M2" >/dev/null 2>&1 && [ "$before" = "$(shasum -a 256 "$ART"/* | shasum -a 256)" ]; then
  pass "a second run changes nothing"
else
  fail "second run changed or failed"
fi

# 4. An installed file that no longer matches is replaced, not trusted.
printf 'corrupt\n' >"$ART/sherpa-onnx-2.0.1.aar"
if "$FETCH" --from "$WORK/good.aar" --m2 "$M2" >/dev/null 2>&1 && cmp -s "$WORK/good.aar" "$ART/sherpa-onnx-2.0.1.aar"; then
  pass "a corrupt installed AAR is replaced"
else
  fail "corrupt installed AAR kept"
fi

if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed." >&2
  exit 1
fi
echo "fetch-sherpa-onnx.sh behaved."
