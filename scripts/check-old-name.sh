#!/usr/bin/env bash
# Fails on any "Lukitas" (the old app name) or whole-word "Lukas" (the old mascot name) in a tracked
# file, except in the paths listed in the allowlist (default .github/name-allowlist.txt, or
# NAME_ALLOWLIST; one `<git pathspec>  # <reason>[, <reason>] [(note)]` per line). Each reason must
# be one of KNOWN_REASONS; a line with none, or with another, fails. "lukas" as Colombian slang for
# money stays (reason `money`). The patterns are split so this script and the allowlist never
# match themselves. Portable: POSIX ERE, no \b, so it behaves the same with macOS and GNU git grep.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
allowlist="${NAME_ALLOWLIST:-.github/name-allowlist.txt}"
known_reasons=(money history docs-rule key-alias)

trim() {
  local s="$1"
  s="${s%"${s##*[![:space:]]}"}"
  s="${s#"${s%%[![:space:]]*}"}"
  printf '%s' "$s"
}

is_known() {
  local reason
  for reason in "${known_reasons[@]}"; do
    [ "$1" = "$reason" ] && return 0
  done
  return 1
}

bad_lines=0
excludes=(":!${allowlist}" ":!scripts/check-old-name.sh")
while IFS= read -r line || [ -n "$line" ]; do
  spec="$(trim "${line%%#*}")"
  [ -n "$spec" ] || continue
  excludes+=(":!${spec}")

  # Reasons: after the first `#`, before an optional `(note)`, comma-separated.
  reasons=""
  [[ "$line" == *"#"* ]] && reasons="${line#*#}"
  reasons="$(trim "${reasons%%(*}")"
  ok=1
  if [ -z "$reasons" ]; then
    ok=0
  else
    IFS=',' read -r -a parts <<<"$reasons"
    for part in "${parts[@]}"; do
      is_known "$(trim "$part")" || ok=0
    done
  fi
  if [ "$ok" -eq 0 ]; then
    echo "check-old-name: unknown reason in ${allowlist}: ${line}" >&2
    bad_lines=$((bad_lines + 1))
  fi
done <"$allowlist"

if [ "$bad_lines" -ne 0 ]; then
  echo "check-old-name: each line needs reasons from: ${known_reasons[*]}." >&2
  exit 1
fi

pattern='luk''itas|(^|[^[:alnum:]_])luk''as([^[:alnum:]_]|$)'
if git grep -n -I -i -E "$pattern" -- . "${excludes[@]}"; then
  echo "check-old-name: the old name above is not in ${allowlist}. Use Wambito (app) or Wambi (mascot)," >&2
  echo "or, if it is really allowed, add its path there with a reason." >&2
  exit 1
fi
