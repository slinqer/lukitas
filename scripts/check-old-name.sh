#!/usr/bin/env bash
# Fails on any "Lukitas" (the old app name) or whole-word "Lukas" (the old mascot name) in a tracked
# file, except in the paths listed in .github/name-allowlist.txt (one `<git pathspec>  # <reason>`
# per line). "lukas" as Colombian slang for money stays (reason `money`). The patterns are split
# so this script and the allowlist never match themselves. Portable: POSIX ERE, no \b, so it
# behaves the same with macOS and GNU git grep.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
allowlist=.github/name-allowlist.txt

excludes=(":!${allowlist}" ":!scripts/check-old-name.sh")
while IFS= read -r line; do
  spec="${line%%#*}"
  spec="${spec%"${spec##*[![:space:]]}"}"
  spec="${spec#"${spec%%[![:space:]]*}"}"
  [ -n "$spec" ] || continue
  excludes+=(":!${spec}")
done <"$allowlist"

pattern='luk''itas|(^|[^[:alnum:]_])luk''as([^[:alnum:]_]|$)'
if git grep -n -I -i -E "$pattern" -- . "${excludes[@]}"; then
  echo "check-old-name: the old name above is not in ${allowlist}. Use Wambito (app) or Wambi (mascot)," >&2
  echo "or, if it is really allowed, add its path there with a reason." >&2
  exit 1
fi
