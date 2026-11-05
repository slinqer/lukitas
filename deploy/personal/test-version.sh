#!/usr/bin/env bash
# Tests server_version (lib.sh): the version up.sh gives the API to report on /health and that the
# app's Settings shows. It is the root package.json's "version" plus the commit, with -dirty for
# uncommitted changes to tracked files. Runs on throwaway repositories in a temporary folder: no
# Docker, no .env. Run: ./test-version.sh
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failures=0

# repo NAME PACKAGE_JSON: a git repository with one commit holding PACKAGE_JSON as package.json.
repo() {
  local dir="$tmp/$1"
  mkdir "$dir"
  printf '%s\n' "$2" >"$dir/package.json"
  git -C "$dir" init -q
  git -C "$dir" add package.json
  git -C "$dir" -c user.name=t -c user.email=t@example.invalid commit -q -m init
  printf '%s' "$dir"
}

# check NAME WANT GOT
check() {
  if [ "$2" = "$3" ]; then
    printf 'ok   %s\n' "$1"
  else
    printf 'FAIL %s\n  expected: %s\n  got:      %s\n' "$1" "$2" "$3" >&2
    failures=$((failures + 1))
  fi
}

clean="$(repo clean '{
  "name": "wambito",
  "version": "1.0.0",
  "private": true
}')"
sha="$(git -C "$clean" rev-parse --short=7 HEAD)"
check "version and commit" "1.0.0+$sha" "$(server_version "$clean")"

# An uncommitted change to a tracked file marks the build; an untracked file does not.
: >"$clean/notes.txt"
check "untracked file ignored" "1.0.0+$sha" "$(server_version "$clean")"
printf '\n' >>"$clean/package.json"
check "dirty tree" "1.0.0+$sha-dirty" "$(server_version "$clean")"

# A dependency's "version" further down is not the app's.
nested="$(repo nested '{
  "name": "wambito",
  "version": "2.3.4",
  "devDependencies": { "x": { "version": "9.9.9" } }
}')"
check "first, top-level version" "2.3.4+$(git -C "$nested" rev-parse --short=7 HEAD)" "$(server_version "$nested")"

# No version, or one that is not X.Y.Z: refused, so a deploy never reports a made-up number.
for case in 'missing|{ "name": "wambito" }' 'not semver|{ "name": "wambito", "version": "latest" }'; do
  name="${case%%|*}"
  bad="$(repo "${name// /-}" "${case#*|}")"
  if out="$(server_version "$bad" 2>&1)"; then
    check "$name refused" "an error" "$out"
  else
    case "$out" in
      *package.json*) check "$name refused" ok ok ;;
      *) check "$name refused, naming package.json" "a message naming package.json" "$out" ;;
    esac
  fi
done

[ "$failures" -eq 0 ] || {
  printf '%d failed\n' "$failures" >&2
  exit 1
}
echo "all ok"
