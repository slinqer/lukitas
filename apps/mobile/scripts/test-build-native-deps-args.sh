#!/usr/bin/env bash
# Checks the arguments of scripts/build-native-deps.sh that are read before it needs a Linux host,
# its tools or the sources, so it runs anywhere in a second:
#   (a) --abi takes arm64-v8a or armeabi-v7a, and nothing else (exit 2, with a message saying so);
#   (b) --abi arm64-v8a and --abi armeabi-v7a get past the arguments: the script then stops at the
#       next check, the host, a tool or the NDK, with that check's own message;
#   (c) --abi with no value prints the usage, which lists --abi.
# The build itself (that an --abi build holds only that ABI's libraries) is checked by the script's
# own last step on a real build, and by scripts/fdroid-build-local.sh.
#
# Usage, from anywhere: apps/mobile/scripts/test-build-native-deps-args.sh
# Exit codes: 0 every check passed, 1 a check failed.
set -uo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/build-native-deps.sh"
failures=0
pass() { echo "ok    $1"; }
fail() {
  echo "FAIL  $1" >&2
  failures=$((failures + 1))
}
# run <args...>: the script's exit code in $code and its stderr in $out. The NDK does not exist, so
# the script never gets as far as building anything.
run() {
  out="$("$SCRIPT" --vosk-src /nonexistent --jna-src /nonexistent --ndk /nonexistent "$@" 2>&1 >/dev/null)"
  code=$?
}

run --abi x86_64
if [ "$code" -eq 2 ] && grep -q -- '--abi must be arm64-v8a or armeabi-v7a' <<<"$out"; then
  pass "(a) --abi x86_64 is refused"
else
  fail "(a) --abi x86_64: exit $code, said: $out"
fi

for abi in arm64-v8a armeabi-v7a; do
  run --abi "$abi"
  # Past the arguments, the script's next stops are the host, a missing tool and the NDK, each
  # with its own message (exit 2); anything else means it stopped somewhere it should not.
  if [ "$code" -eq 2 ] && ! grep -q -- '--abi' <<<"$out" &&
    grep -q -E '^build-native-deps: (needs Linux x86_64 |[a-z0-9+]+ is missing\.$|no NDK directory at )' <<<"$out"; then
    pass "(b) --abi $abi is taken (then: ${out%%$'\n'*})"
  else
    fail "(b) --abi $abi: exit $code, said: $out"
  fi
done

out="$("$SCRIPT" --abi 2>&1 >/dev/null)"
code=$?
if [ "$code" -eq 2 ] && grep -q '^Usage' <<<"$out" && grep -q -- '\[--abi ' <<<"$out"; then
  pass "(c) --abi without a value prints the usage, which lists --abi"
else
  fail "(c) --abi without a value: exit $code, said: $out"
fi

if [ "$failures" -gt 0 ]; then
  echo "$failures check(s) of build-native-deps.sh's arguments failed." >&2
  exit 1
fi
echo "build-native-deps.sh's arguments behaved."
