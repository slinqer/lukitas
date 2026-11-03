#!/usr/bin/env bash
# Stops the daily backup: the launchd agent on macOS, the systemd timer and service on Linux.
# Existing backups stay where they are.
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if [ "$(uname)" = "Linux" ]; then
  sudo systemctl disable --now wambito-backup.timer >/dev/null 2>&1 || true
  sudo rm -f "$UNIT_DIR/wambito-backup.timer" "$UNIT_DIR/wambito-backup.service"
  sudo systemctl daemon-reload
  echo "==> Removed wambito-backup.timer and wambito-backup.service. Backups already made are untouched."
  exit 0
fi

label="com.wambito.backup"
target="$HOME/Library/LaunchAgents/$label.plist"

launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || true
rm -f "$target"
echo "==> Removed $label. Backups already made are untouched."
