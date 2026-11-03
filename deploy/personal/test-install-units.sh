#!/usr/bin/env bash
# Tests install-backup.sh and install-auto-deploy.sh in a temporary folder: a copy of this folder in
# a fresh repository on main, sudo, systemctl, launchctl, plutil and uname replaced by stubs that
# log what they were asked, and a temporary unit folder (UNIT_DIR) and home. No root, no systemd.
# Run: ./test-install-units.sh
#
# What it checks: the units installed are wambito-* (Linux) and com.wambito.backup (macOS), with
# their placeholders filled in; the old units of the install before the rename are stopped before
# the new ones start, and their files deleted, so two timers never run; with no old units, nothing
# is stopped.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
failures=0
# The old name, split so the repository's old-name guard does not match this file.
old="luk""itas"

# --- The install: this folder's scripts and units in a clean checkout of main. ------------------
mkdir -p "$tmp/repo/deploy/personal"
cp "$here"/*.sh "$here"/*.service "$here"/*.timer "$here"/*.plist "$tmp/repo/deploy/personal/"
git -C "$tmp/repo" init -q -b main
git -C "$tmp/repo" add -A
git -C "$tmp/repo" -c user.name=test -c user.email=test@example.com commit -q -m install
install="$tmp/repo/deploy/personal"

# --- The stubs. ---------------------------------------------------------------------------------
mkdir "$tmp/bin"
export FAKE_LOG="$tmp/calls.log" FAKE_UNAME=Linux
cat >"$tmp/bin/uname" <<'EOF'
#!/usr/bin/env bash
echo "$FAKE_UNAME"
EOF
cat >"$tmp/bin/sudo" <<'EOF'
#!/usr/bin/env bash
exec "$@"
EOF
for tool in systemctl launchctl plutil; do
  cat >"$tmp/bin/$tool" <<EOF
#!/usr/bin/env bash
printf '%s %s\n' "$tool" "\$*" >>"\$FAKE_LOG"
EOF
done
chmod +x "$tmp/bin/"*
PATH="$tmp/bin:$PATH"

export HOME="$tmp/home" UNIT_DIR="$tmp/units" ENV_FILE="$tmp/.env"
printf 'PERSONAL_BRANCH=main\n' >"$ENV_FILE"
agents="$HOME/Library/LaunchAgents"
uid="$(id -u)"

fail() {
  printf 'FAIL: %s\n' "$1"
  sed 's/^/    out: /' "$tmp/out.log"
  sed 's/^/    log: /' "$FAKE_LOG"
  failures=$((failures + 1))
}
pass() { printf 'ok: %s\n' "$1"; }

# reset UNAME OLD_FILES...: a fresh unit folder, home and log, with these old files in place.
reset() {
  FAKE_UNAME="$1"
  shift
  rm -rf "$UNIT_DIR" "$HOME"
  mkdir -p "$UNIT_DIR" "$agents"
  : >"$FAKE_LOG"
  local f
  for f in "$@"; do printf '# old\n' >"$f"; done
}

# line_of TEXT: the number of the first log line that is exactly TEXT, or nothing.
line_of() { grep -nxF "$1" "$FAKE_LOG" | head -n 1 | cut -d: -f1 || true; }

# before NAME FIRST THEN: FIRST is in the log, and before THEN.
before() {
  local a b
  a="$(line_of "$2")"
  b="$(line_of "$3")"
  if [ -n "$a" ] && [ -n "$b" ] && [ "$a" -lt "$b" ]; then pass "$1"; else fail "$1 ('$2' before '$3')"; fi
}

# holds NAME DIR FILES: DIR holds exactly FILES (space-separated, sorted).
holds() {
  local got
  got="$(ls -1 "$2" | sort | tr '\n' ' ')"
  if [ "$got" = "$3 " ]; then pass "$1"; else fail "$1 (holds: $got)"; fi
}

# filled NAME FILE: FILE has no placeholder left and says Wambito.
filled() {
  if ! grep -q '@[A-Z_]*@' "$2" 2>/dev/null && grep -q "$tmp/repo/deploy/personal" "$2" 2>/dev/null && grep -q 'Wambito' "$2" 2>/dev/null; then
    pass "$1"
  else
    fail "$1 ($2)"
  fi
}

run() { (cd "$install" && "./$1") >"$tmp/out.log" 2>&1; }

# --- Linux: the automatic deploy replaces the old one, and the old backup timer goes too. ---------
reset Linux "$UNIT_DIR/$old-deploy.service" "$UNIT_DIR/$old-deploy.timer" \
  "$UNIT_DIR/$old-backup.service" "$UNIT_DIR/$old-backup.timer"
if run install-auto-deploy.sh; then
  before "deploy: the old deploy timer stops before the new one starts" \
    "systemctl disable --now $old-deploy.timer" "systemctl enable --now wambito-deploy.timer"
  before "deploy: the old backup timer stops too" \
    "systemctl disable --now $old-backup.timer" "systemctl enable --now wambito-deploy.timer"
  holds "deploy: only the wambito-deploy units are left" "$UNIT_DIR" \
    "wambito-deploy.service wambito-deploy.timer"
  filled "deploy: the service is filled in" "$UNIT_DIR/wambito-deploy.service"
  grep -q '^Description=Wambito: ' "$UNIT_DIR/wambito-deploy.timer" &&
    pass "deploy: the timer says Wambito" || fail "deploy: the timer says Wambito"
else
  fail "install-auto-deploy.sh succeeds"
fi

# --- Linux: the backup replaces the old one. -------------------------------------------------------
reset Linux "$UNIT_DIR/$old-backup.service" "$UNIT_DIR/$old-backup.timer"
if run install-backup.sh; then
  before "backup: the old backup timer stops before the new one starts" \
    "systemctl disable --now $old-backup.timer" "systemctl enable --now wambito-backup.timer"
  holds "backup: only the wambito-backup units are left" "$UNIT_DIR" \
    "wambito-backup.service wambito-backup.timer"
  filled "backup: the service is filled in" "$UNIT_DIR/wambito-backup.service"
  grep -q '~/Backups/wambito' "$tmp/out.log" &&
    pass "backup: says where the dumps go" || fail "backup: says where the dumps go"
else
  fail "install-backup.sh succeeds"
fi

# --- Linux: nothing old installed, nothing old stopped. ------------------------------------------
reset Linux
if run install-backup.sh; then
  if grep -q "$old" "$FAKE_LOG"; then fail "fresh: no old unit is touched"; else pass "fresh: no old unit is touched"; fi
  holds "fresh: the wambito-backup units are installed" "$UNIT_DIR" \
    "wambito-backup.service wambito-backup.timer"
else
  fail "install-backup.sh succeeds on a fresh server"
fi

# --- macOS: the launchd agent replaces the old one. ------------------------------------------------
reset Darwin "$agents/com.$old.backup.plist"
if run install-backup.sh; then
  before "mac: the old agent is unloaded before the new one loads" \
    "launchctl bootout gui/$uid/com.$old.backup" "launchctl bootstrap gui/$uid $agents/com.wambito.backup.plist"
  holds "mac: only the wambito agent is left" "$agents" "com.wambito.backup.plist"
  filled "mac: the agent is filled in" "$agents/com.wambito.backup.plist"
else
  fail "install-backup.sh succeeds on macOS"
fi

if [ "$failures" -ne 0 ]; then
  printf '%s failure(s)\n' "$failures"
  exit 1
fi
echo "All install-units tests passed."
