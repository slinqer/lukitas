#!/usr/bin/env bash
# Fails when fdroid/com.wambito.app.yml has drifted from what the repo builds with. Once the recipe
# is merged into fdroiddata, its copy there is the live one and AutoUpdateMode only bumps versions
# and commits, so a change here that the recipe does not follow breaks (or mis-builds) the next
# F-Droid release; docs/mobile/fdroid.md, "Changing the recipe after F-Droid publishes". Checks,
# in every build entry:
#   - the srclib flutter@<version> equals .flutter-version;
#   - each srclib revision (vosk-api, kaldi, openfst, OpenBLAS, clapack) equals the *_REV pinned in
#     scripts/build-native-deps.sh, and jna@<tag> equals JNA_VERSION without "-src";
#   - ndk: is the NDK release build-native-deps.sh names in its NDK_VERSION line's comment (the app's
#     own NDK is flutter.ndkVersion, set by the Flutter SDK and not readable without it).
# Text only, so it runs anywhere in a second. The three files can be named for tests.
#
# Usage, from anywhere: apps/mobile/scripts/check-fdroid-recipe.sh
# Exit codes: 0 they agree, 1 they differ.
set -uo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE="$(cd "$DIR/.." && pwd)"
RECIPE="${RECIPE:-$MOBILE/fdroid/com.wambito.app.yml}"
DEPS="${DEPS:-$DIR/build-native-deps.sh}"
FLUTTER_VERSION_FILE="${FLUTTER_VERSION_FILE:-$MOBILE/.flutter-version}"
failures=0
problem() {
  echo "$1" >&2
  failures=$((failures + 1))
}

entries="$(grep -c '^  - versionName:' "$RECIPE")"
[ "$entries" -gt 0 ] || problem "$RECIPE has no build entries."

# srclib_refs <name>: the ref of every "- <name>@<ref>" line, one per line.
srclib_refs() { sed -n "s/^      - $1@\\([^[:space:]]*\\)\$/\\1/p" "$RECIPE"; }
# expect_srclib <name> <wanted ref> <where the wanted ref comes from>
expect_srclib() {
  local name="$1" want="$2" source="$3" refs count bad
  refs="$(srclib_refs "$name")"
  count="$(grep -c . <<<"$refs")"
  bad="$(grep -vxF -- "$want" <<<"$refs" || true)"
  if [ -z "$want" ]; then
    problem "recipe: could not read $name's pinned revision from $source."
  elif [ "$count" -ne "$entries" ] || [ -n "$bad" ]; then
    problem "recipe: $name@... must be $name@$want ($source) in all $entries build entries; found: $(tr '\n' ' ' <<<"$refs")"
  fi
}
dep_value() { sed -n "s/^$1=\\([^[:space:]]*\\).*/\\1/p" "$DEPS"; }

expect_srclib flutter "$(tr -d '[:space:]' <"$FLUTTER_VERSION_FILE")" ".flutter-version"
expect_srclib vosk-api "$(dep_value VOSK_REV)" "VOSK_REV in build-native-deps.sh"
expect_srclib kaldi "$(dep_value KALDI_REV)" "KALDI_REV in build-native-deps.sh"
expect_srclib openfst "$(dep_value OPENFST_REV)" "OPENFST_REV in build-native-deps.sh"
expect_srclib OpenBLAS "$(dep_value OPENBLAS_REV)" "OPENBLAS_REV in build-native-deps.sh"
expect_srclib clapack "$(dep_value CLAPACK_REV)" "CLAPACK_REV in build-native-deps.sh"
expect_srclib jna "$(dep_value JNA_VERSION | sed 's/-src$//')" "JNA_VERSION in build-native-deps.sh"

# The NDK: "NDK_VERSION=28.2.13676358   # r28c, ..." names the release in its comment.
ndk_release="$(sed -n 's/^NDK_VERSION=[^#]*# *\(r[0-9][0-9a-z]*\).*/\1/p' "$DEPS")"
ndks="$(sed -n 's/^    ndk: \(.*\)$/\1/p' "$RECIPE")"
if [ -z "$ndk_release" ]; then
  problem "recipe: could not read the NDK release from NDK_VERSION's comment in build-native-deps.sh."
elif [ "$(grep -c . <<<"$ndks")" -ne "$entries" ] || [ -n "$(grep -vxF -- "$ndk_release" <<<"$ndks" || true)" ]; then
  problem "recipe: ndk must be $ndk_release (NDK_VERSION in build-native-deps.sh) in all $entries build entries; found: $(tr '\n' ' ' <<<"$ndks")"
fi

if [ "$failures" -gt 0 ]; then
  echo "The F-Droid recipe has drifted from the repo: fix it here, and open the same change as a merge request on fdroiddata before tagging." >&2
  exit 1
fi
echo "The F-Droid recipe agrees with .flutter-version and build-native-deps.sh in all $entries build entries."
