#!/usr/bin/env bash
# Tests scripts/check-old-name.sh: each allowlist line must name only known reasons. Runs the guard
# against a temporary allowlist (NAME_ALLOWLIST) in a throwaway git repo holding one file with the
# old name. The name is split ('luk''itas') so this script never matches the guard itself.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
guard="${root}/scripts/check-old-name.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git -C "$work" init -q
mkdir -p "$work/scripts" "$work/.github"
cp "$guard" "$work/scripts/check-old-name.sh"
printf 'the old name: %s\n' 'Luk''itas' >"$work/foo.txt"
: >"$work/.github/name-allowlist.txt"
git -C "$work" add -A

failures=0

# expect <pass|fail> <allowlist line> [text the output must contain]
expect() {
  local want="$1" line="$2" needle="${3:-}" out status
  printf '%s\n' "$line" >"$work/allow.txt"
  set +e
  out="$(cd "$work" && NAME_ALLOWLIST=allow.txt bash scripts/check-old-name.sh 2>&1)"
  status=$?
  set -e
  if [ "$want" = pass ] && [ "$status" -ne 0 ]; then
    echo "FAIL: '${line}' should pass, exited ${status}: ${out}"
    failures=$((failures + 1))
  elif [ "$want" = fail ] && [ "$status" -eq 0 ]; then
    echo "FAIL: '${line}' should fail, exited 0"
    failures=$((failures + 1))
  elif [ -n "$needle" ] && [[ "$out" != *"$needle"* ]]; then
    echo "FAIL: '${line}' output lacks '${needle}': ${out}"
    failures=$((failures + 1))
  else
    echo "ok: ${want} '${line}'"
  fi
}

expect pass 'foo.txt  # money'
expect pass 'foo.txt  # money, key-alias'
expect fail 'foo.txt  # 2b: remove' 'unknown reason'
expect fail 'foo.txt  # 2b' 'unknown reason' # 2b is no longer a reason
expect fail 'foo.txt' 'unknown reason'
expect fail 'foo.txt  # money, nonsense' 'unknown reason'
expect fail '' 'Luk''itas'

if [ "$failures" -ne 0 ]; then
  echo "test-check-old-name: ${failures} failure(s)" >&2
  exit 1
fi
echo "test-check-old-name: all passed"
