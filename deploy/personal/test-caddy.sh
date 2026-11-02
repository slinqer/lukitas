#!/usr/bin/env bash
# Tests the personal install's Caddy config against real Caddy, in Docker: a private network with a
# fake upstream (answering as `api` on :3000 and `mcp` on :3001 with the X-Forwarded-For it got),
# the Caddy under test (the deploy's Caddy files at their /etc/caddy/ paths, a tiny /srv) and a curl
# client at a fixed address. Needs Docker; everything it starts is removed on exit.
# Run: ./test-caddy.sh [tunnel|direct|all]   (default all: every set below)
#
# What it checks (tunnel, Caddyfile): the client's address reaches the API and the MCP as the only
# X-Forwarded-For entry, taken from Cf-Connecting-Ip when Cloudflare sent one and from the TCP peer
# otherwise, never from the X-Forwarded-For the client sent; the access log names the same visitor;
# the API schema is not public; the landing's paths redirect to LANDING_URL with path and query.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

# The case sets this script knows, in the order `all` runs them. Each NAME has a cases_NAME below.
sets="tunnel"

mode="${1:-all}"
case "$mode" in
  all) run_sets="$sets" ;;
  *)
    case " $sets " in
      *" $mode "*) run_sets="$mode" ;;
      *) die "usage: $0 [${sets// /|}|all]" ;;
    esac
    ;;
esac

need_docker

CADDY_IMAGE=caddy:2.11-alpine
CURL_IMAGE=curlimages/curl:8.17.0
LANDING_URL=https://wambito.com
# A fixed subnet, so the client's address is known. Not the install's own (NETWORK_PREFIX).
SUBNET=10.233.71.0/24
CLIENT_IP=10.233.71.10

id="$(LC_ALL=C tr -dc 'a-z0-9' </dev/urandom | head -c 8 || true)"
net="caddytest-$id"
tmp="$(mktemp -d)"
containers=""
cleanup() {
  local c
  for c in $containers; do docker rm -f "$c" >/dev/null 2>&1 || true; done
  docker network rm "$net" >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
failures=0

ok() { printf 'ok    %s\n' "$1"; }
fail() {
  printf 'FAIL  %s\n' "$1"
  failures=$((failures + 1))
}
# check NAME EXPECTED ACTUAL
check() {
  if [ "$2" = "$3" ]; then ok "$1"; else fail "$1 (expected '$2', got '$3')"; fi
}

# --- The network, the upstream and the client. ------------------------------------------------
docker network create --subnet "$SUBNET" "$net" >/dev/null

mkdir -p "$tmp/upstream" "$tmp/srv"
cat >"$tmp/upstream/Caddyfile" <<'EOF'
{
	auto_https off
	admin off
}
:3000, :3001 {
	respond "{header.X-Forwarded-For}"
}
EOF
printf '<!doctype html><title>index</title>\n' >"$tmp/srv/index.html"
printf '<!doctype html><title>app</title>\n' >"$tmp/srv/__spa-fallback.html"

upstream="caddytest-upstream-$id"
containers="$containers $upstream"
docker run -d --name "$upstream" --network "$net" --network-alias api --network-alias mcp \
  -v "$tmp/upstream:/etc/caddy:ro" "$CADDY_IMAGE" >/dev/null

client="caddytest-client-$id"
containers="$containers $client"
docker run -d --name "$client" --network "$net" --ip "$CLIENT_IP" --entrypoint sleep \
  "$CURL_IMAGE" 3600 >/dev/null

# curl_web ARGS...: curl from the client to the Caddy under test (http://web:80 plus the path).
curl_web() { docker exec "$client" curl -s --max-time 10 "$@"; }

# start_web CONFIG [DOCKER_RUN_ARGS...]: runs the Caddy under test with /etc/caddy/CONFIG, as `web`
# on the network (the one from an earlier set is removed first; extra arguments such as `-e NAME=...`
# go to docker run), and waits until port 80 takes connections, whatever it answers there.
web=""
start_web() {
  local config="$1" f rc
  local mounts=()
  shift
  if [ -n "$web" ]; then docker rm -f "$web" >/dev/null 2>&1 || true; fi
  web="caddytest-web-$(printf '%s' "$config" | tr 'A-Z.' 'a-z-')-$id"
  containers="$containers $web"
  # Every Caddy file of the deploy, at the path the image copies it to.
  for f in "$here"/Caddyfile* "$here"/*.caddy; do
    if [ -f "$f" ]; then mounts+=(-v "$f:/etc/caddy/$(basename "$f"):ro"); fi
  done
  docker run -d --name "$web" --network "$net" --network-alias web "${mounts[@]}" \
    -v "$tmp/srv:/srv:ro" -e LANDING_URL="$LANDING_URL" "$@" "$CADDY_IMAGE" \
    caddy run --config "/etc/caddy/$config" --adapter caddyfile >/dev/null
  for _ in $(seq 1 50); do
    rc=0
    curl_web -o /dev/null http://web:80/ || rc=$?
    # 7: nothing listening yet; 6: the name `web` is not there yet.
    [ "$rc" -ne 7 ] && [ "$rc" -ne 6 ] && return 0
    sleep 0.2
  done
  docker logs "$web" 2>&1 | tail -n 20
  die "Caddy with $config did not start"
}

# web_log_has TEXT: whether the Caddy under test logged TEXT, waiting a little for the log to land.
# The log goes to a file first: `docker logs | grep -q` fails under pipefail when grep stops early.
web_log_has() {
  local _
  for _ in $(seq 1 10); do
    docker logs "$web" >"$tmp/web.log" 2>&1 || true
    grep -qF -- "$1" "$tmp/web.log" && return 0
    sleep 0.2
  done
  return 1
}

# --- tunnel: Caddyfile, behind cloudflared. ---------------------------------------------------
cases_tunnel() {
  start_web Caddyfile
  check "tunnel: Cf-Connecting-Ip becomes X-Forwarded-For" 203.0.113.7 \
    "$(curl_web -H 'Cf-Connecting-Ip: 203.0.113.7' -H 'X-Forwarded-For: 198.51.100.9' http://web:80/api/x)"
  check "tunnel: without Cloudflare, the peer" "$CLIENT_IP" \
    "$(curl_web -H 'X-Forwarded-For: 198.51.100.9' http://web:80/api/x)"
  check "tunnel: MCP, Cf-Connecting-Ip becomes X-Forwarded-For" 203.0.113.7 \
    "$(curl_web -X POST -H 'Content-Type: application/json' -d '{}' \
      -H 'Cf-Connecting-Ip: 203.0.113.7' -H 'X-Forwarded-For: 198.51.100.9' http://web:80/mcp)"
  check "tunnel: MCP, without Cloudflare, the peer" "$CLIENT_IP" \
    "$(curl_web -X POST -H 'Content-Type: application/json' -d '{}' \
      -H 'X-Forwarded-For: 198.51.100.9' http://web:80/mcp)"
  check "tunnel: schema not public" 404 \
    "$(curl_web -o /dev/null -w '%{http_code}' http://web:80/api/openapi.json)"
  check "tunnel: landing redirect" "302 $LANDING_URL/pt?x=1" \
    "$(curl_web -o /dev/null -w '%{http_code} %{redirect_url}' 'http://web:80/pt?x=1')"
  if web_log_has '"visitor_ip":"203.0.113.7"'; then
    ok "tunnel: log has the visitor"
  else
    fail "tunnel: log has the visitor (no \"visitor_ip\":\"203.0.113.7\" in docker logs)"
  fi
}

for s in $run_sets; do "cases_$s"; done

if [ "$failures" -gt 0 ]; then
  printf '\n%s check(s) failed\n' "$failures"
  exit 1
fi
printf '\nall checks passed\n'
