#!/usr/bin/env bash
# Installs the daily backup. Run it once, yourself.
#   macOS: a launchd agent for your user, at 03:00 (logs: ~/Library/Logs/wambito-backup.log).
#   Linux: a systemd service and timer, at 08:00 UTC (03:00 in Colombia), run as you (needs sudo;
#          logs: journalctl -u wambito-backup.service).
#
#   ./install-backup.sh            install and load
#   ./install-backup.sh --render   print what it would install, change nothing
#
# Remove it with ./uninstall-backup.sh.
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

label="com.wambito.backup"
target="$HOME/Library/LaunchAgents/$label.plist"
units="wambito-backup.service wambito-backup.timer"

fill() {
  sed -e "s#@REPO_DIR@#$REPO_DIR#g" -e "s#@HOME@#$HOME#g" -e "s#@BASH@#$(command -v bash)#g" \
    -e "s#@USER@#$(id -un)#g" "$1"
}

render() {
  local unit
  case "$(uname)" in
    Darwin) fill "$DIR/$label.plist" ;;
    Linux)
      for unit in $units; do
        printf '# --- %s/%s\n' "$UNIT_DIR" "$unit"
        fill "$DIR/$unit"
      done
      ;;
    *) die "no scheduler for $(uname): run backup.sh daily with cron" ;;
  esac
}

if [ "${1:-}" = "--render" ]; then
  render
  exit 0
fi

need_env_file

if [ "$(uname)" = "Linux" ]; then
  command -v systemctl >/dev/null 2>&1 || die "systemd not found: run backup.sh daily with cron"
  remove_old_units
  for unit in $units; do
    fill "$DIR/$unit" | sudo tee "$UNIT_DIR/$unit" >/dev/null
  done
  sudo systemctl daemon-reload
  sudo systemctl enable --now wambito-backup.timer
  say "Installed $units in $UNIT_DIR"
  echo "Backs up every day at 08:00 UTC (or at boot, if the server was off) into $(cfg BACKUP_DIR '~/Backups/wambito')"
  echo "Try it now:  sudo systemctl start wambito-backup.service   (log: journalctl -u wambito-backup.service)"
  exit 0
fi

[ "$(uname)" = "Darwin" ] || die "no scheduler for $(uname): run backup.sh daily with cron"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
render >"$target"
plutil -lint "$target" >/dev/null || die "the generated plist is not valid: $target"

remove_old_units
# Reload if it was already installed.
launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$target"
launchctl enable "gui/$(id -u)/$label"

say "Installed $target"
echo "Backs up every day at 03:00 (or when the Mac wakes, if it was asleep) into $(cfg BACKUP_DIR '~/Backups/wambito')"
echo "Try it now:  launchctl kickstart gui/$(id -u)/$label   (log: ~/Library/Logs/wambito-backup.log)"
