#!/usr/bin/env bash
# Restores a dump made by backup.sh.
#
#   ./restore.sh --drill FILE   Restore into a scratch database next to the real one, print row
#                               counts, drop it. Nothing live is touched. Do this now and then:
#                               a backup you have never restored is only a hope.
#   ./restore.sh FILE           Replace the live database with the dump (asks first; --yes skips).
#
# The live restore: restores into a new database first (if that fails nothing has changed), then
# stops the API and the tunnel, renames the old database to wambito_before_<time> (kept, so you can
# go back; drop it yourself once you are happy), puts the new one in its place, applies any newer
# migrations, grants the app role and starts everything again. The dump's own grants are skipped,
# so a dump restores whatever the app role was called when it was taken. It also works on a new
# server: bring the stack's database up (docker compose up -d postgres), then run this with the dump.
#
# A restore brings back every account in the dump, including accounts deleted after it was taken
# (with their data; they can sign in again). The live restore says so, lists those accounts (in
# the dump, not in the live database) and how to delete each one again. Do it: the app promised
# them their data was gone.
#
# An encrypted copy works too, local or in R2: it is decrypted into a private temporary folder
# (removed on exit) with the age private key, which never lives on the server:
#
#   ./restore.sh --identity=KEY FILE.dump.age          a local encrypted copy
#   ./restore.sh --from-r2 --identity=KEY NAME.dump.age   downloaded from BACKUP_R2_BUCKET first
#
# KEY is the age private key file (else BACKUP_AGE_IDENTITY from the environment or .env).
#
# Options: --keep (drill: keep the scratch database), --yes, --from-r2, --identity=FILE.
# Settings: ENV_FILE, BACKUP_AGE_IDENTITY, BACKUP_R2_*.
set -euo pipefail
# shellcheck source=lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

drill=0
keep=0
yes=0
from_r2=0
identity=""
file=""
for arg in "$@"; do
  case "$arg" in
    --drill) drill=1 ;;
    --keep) keep=1 ;;
    --yes) yes=1 ;;
    --from-r2) from_r2=1 ;;
    --identity=*) identity="${arg#--identity=}" ;;
    -h | --help)
      sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    -*) die "unknown option: $arg" ;;
    *) [ -z "$file" ] || die "one dump at a time"; file="$arg" ;;
  esac
done
[ -n "$file" ] || die "usage: restore.sh [--drill] [--yes] [--from-r2] [--identity=KEY] DUMP_FILE"

# An encrypted copy (local, or fetched from R2) becomes a plain dump in a private temporary folder.
fetched=""
trap '[ -z "$fetched" ] || rm -rf "$fetched"' EXIT
if [ "$from_r2" = 1 ]; then
  problem="$(r2_problem)"
  [ -z "$problem" ] || die "$problem"
  [ -n "$(cfg BACKUP_R2_BUCKET)" ] || die "--from-r2 needs BACKUP_R2_BUCKET (and the rest of BACKUP_R2_*) in $ENV_FILE"
  case "$file" in */*) die "--from-r2 takes the object's name (wambito-YYYY-MM-DD.dump.age), not a path" ;; esac
fi
case "$file" in
  *.age)
    command -v age >/dev/null 2>&1 || die "'age' is not installed (brew install age, or apt install age)"
    identity="${identity:-$(cfg BACKUP_AGE_IDENTITY)}"
    case "$identity" in "~"*) identity="$HOME${identity#\~}" ;; esac
    [ -n "$identity" ] || die "an encrypted copy needs the age private key: --identity=FILE (or BACKUP_AGE_IDENTITY)"
    [ -f "$identity" ] || die "no such key file: $identity"
    fetched="$(mktemp -d)"
    chmod 700 "$fetched"
    encrypted="$file"
    if [ "$from_r2" = 1 ]; then
      say "Downloading $file from R2 ($(cfg BACKUP_R2_BUCKET))"
      encrypted="$fetched/$file"
      r2_download "$file" "$encrypted" || die "could not download $file from R2"
    fi
    [ -f "$encrypted" ] || die "no such file: $encrypted"
    say "Decrypting ${encrypted##*/}"
    plain="$fetched/$(basename "${file%.age}")"
    age -d -i "$identity" -o "$plain" "$encrypted" || die "age could not decrypt ${encrypted##*/} with $identity"
    file="$plain"
    ;;
  *) [ "$from_r2" = 0 ] || die "R2 holds only encrypted copies: the name ends in .age" ;;
esac
[ -f "$file" ] || die "no such file: $file"

need_env_file
need_docker
ensure_volume
stamp="$(date +%Y%m%d_%H%M%S)"
scratch="wambito_restore_$stamp"

say "Starting the database (it keeps running; the API is not needed for a restore)"
compose up -d --wait postgres

say "Checking the dump"
compose exec -T postgres pg_restore -l <"$file" >/dev/null || die "pg_restore cannot read $file"

say "Making sure the app role exists (the bootstrap grants it the restored tables)"
compose run --rm migrate node dist/bootstrap.js --role-only

# The scratch database goes away on any exit, unless it became the live one or --keep says to keep it.
keep_scratch=$keep
drop_scratch() {
  psql_db postgres -qc "drop database if exists $scratch with (force)" >/dev/null 2>&1 || true
}
trap '[ "$keep_scratch" = 1 ] || drop_scratch; [ -z "$fetched" ] || rm -rf "$fetched"' EXIT

say "Restoring into $scratch"
psql_db postgres -qc "create database $scratch" >/dev/null
# No owner and no grants from the dump (they name the roles of the server it came from); the
# bootstrap grants the app role below. Same flags as backup.sh and RESTORE_FLAGS in
# packages/db/src/testing.ts.
compose exec -T postgres pg_restore -U wambito -d "$scratch" --no-owner --no-acl --exit-on-error --single-transaction <"$file" ||
  die "the restore failed; the live database was not touched"

say "Rows in the restored copy"
table_counts "$scratch" | awk '{ printf "%-18s %8s\n", $1, $2 }'

if [ "$drill" = 1 ]; then
  say "Granting the app role on $scratch"
  compose run --rm migrate node dist/bootstrap.js --grant-only "$scratch" ||
    die "could not grant the app role on $scratch"
  if [ "$keep" = 1 ]; then
    say "Drill done. Kept database $scratch (psql -U wambito -d $scratch inside the postgres container)"
  else
    say "Drill done. The dump restores. Scratch database dropped."
  fi
  exit 0
fi

# accounts DATABASE: "id email" for each account in DATABASE (none if it has no user table yet).
accounts() { psql_db "$1" -At -F ' ' -c 'select id, email from "user"' 2>/dev/null || true; }
# Accounts in the dump that the live database does not have: deleted after the dump was taken. Only
# when the live database has accounts to compare with (not on a new server, or after losing it).
live_accounts="$(accounts wambito)"
deleted_since=""
if [ -n "$live_accounts" ]; then
  deleted_since="$(accounts "$scratch" | awk 'NR == FNR { live[$1] = 1; next } !($1 in live)' <(printf '%s\n' "$live_accounts") -)"
fi

# deleted_warning: what the restore brings back that people deleted, and how to delete it again.
deleted_warning() {
  echo
  echo "WARNING: a restore brings back every account in the dump, including accounts deleted after"
  echo "it was taken, with all their data (and they can sign in again). Delete each one again."
  if [ -n "$deleted_since" ]; then
    echo "In the dump but not in the live database, so deleted since the dump (delete each again;"
    echo "its data goes with it):"
    printf '%s\n' "$deleted_since" | while read -r id email; do
      printf '  %s\n    %s exec postgres psql -U wambito -d wambito -c "delete from \\"user\\" where id = %s"\n' \
        "$email" "$(compose_command)" "'$id'"
    done
  elif [ -z "$live_accounts" ]; then
    echo "The live database has no accounts to compare with: delete again anyone who deleted their"
    echo "account after the dump was taken."
  fi
}

deleted_warning

if [ "$yes" != 1 ]; then
  echo
  echo "This will make the dump above the live database. The current one is renamed and kept."
  printf 'Type "restore" to continue: '
  read -r answer
  if [ "$answer" != "restore" ]; then
    die "cancelled; nothing was changed"
  fi
fi

before="wambito_before_$stamp"
say "Stopping the API and the tunnel"
compose stop cloudflared web api 2>/dev/null || true

say "Swapping databases (old one kept as $before)"
psql_db postgres -qc "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('wambito', '$scratch') and pid <> pg_backend_pid()" >/dev/null
psql_db postgres -qc "alter database wambito rename to $before" >/dev/null
psql_db postgres -qc "alter database $scratch rename to wambito" >/dev/null
keep_scratch=1 # it is the live database now

# The tunnel again if this install has one; never in the direct way (lib.sh, up_services).
with_tunnel=0
[ -n "$(cfg TUNNEL_ID)" ] && with_tunnel=1
services="$(up_services "$with_tunnel")"

say "Applying migrations the dump may not have yet, and granting the app role"
if ! compose run --rm migrate node dist/bootstrap.js; then
  say "The migrations or the grants failed on the restored database. The app is stopped."
  restore_go_back "$before" "$scratch" "$services"
  die "the restore is not finished; the previous database is $before"
fi

say "Starting the app again"
# shellcheck disable=SC2086
compose up -d --wait $services

say "Restored from $file"
deleted_warning
echo "The previous database is still there as $before. When you are sure, drop it:"
echo "  $(compose_command) exec postgres psql -U wambito -d postgres -c 'drop database $before'"
