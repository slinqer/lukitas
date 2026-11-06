#!/usr/bin/env bash
# Packages a precise voice model as the zip the app downloads from our voice-models-v2 GitHub
# release (apps/mobile/lib/capture/models_download.dart). Two models, both CC-BY-4.0 (NVIDIA;
# sherpa-onnx's int8 conversion):
#   canary   (default) Canary 180M Flash, en/es/de/fr: encoder, decoder, tokens.txt;
#   parakeet Parakeet TDT 0.6B v3, 25 European languages (the app uses it for it/pt): encoder,
#            decoder, joiner, tokens.txt (the joiner is how the app tells the two apart).
# The source is sherpa-onnx's `asr-models` release asset, checked against the pinned SHA-256; only
# those files are kept, inside one folder named after the model (ModelStore expects exactly that). Fixed timestamps, order and `zip -X` make the zip reproducible.
#
# Publish the zip from one run and pin that hash; --check proves reproducibility on one machine
# only (the bytes can differ with another zip build).
#
# Nothing is published and the zip is not committed: it goes to the output folder (default
# ${TMPDIR:-/tmp}/wambito-<model>), and its size, unzipped size and SHA-256 are printed, for
# `preciseModels` in the app.
#
# Usage: apps/mobile/scripts/package-canary.sh [--model canary|parakeet] [--check] [--out <dir>] [--from <tar.bz2>]
#   --model <name> which model (default canary)
#   --check        build twice and fail if the two SHA-256 differ
#   --out <dir>    the output folder
#   --from <file>  use this local copy of the source archive instead of downloading (still checked)
# Exit codes: 0 done, 1 the source does not match or the two builds differ, 2 a tool or download failed.
set -euo pipefail

model=canary
check=0
out=""
from=""
while [ $# -gt 0 ]; do
  case "$1" in
    --model) model="${2:?--model needs canary or parakeet}"; shift ;;
    --check) check=1 ;;
    --out) out="${2:?--out needs a folder}"; shift ;;
    --from) from="${2:?--from needs a file}"; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

case "$model" in
  canary)
    NAME=sherpa-onnx-nemo-canary-180m-flash-en-es-de-fr-int8
    SRC_SHA256=7a38ed8b13f014ad632b09ff8d22e0c6f1359dd046af9235d281dfae841b9ab9
    SRC_SIZE=153692328
    FILES=(encoder.int8.onnx decoder.int8.onnx tokens.txt)
    ;;
  parakeet)
    NAME=sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8
    SRC_SHA256=5793d0fd397c5778d2cf2126994d58e9d56b1be7c04d13c7a15bb1b4eafb16bf
    SRC_SIZE=487170055
    FILES=(encoder.int8.onnx decoder.int8.onnx joiner.int8.onnx tokens.txt)
    ;;
  *) echo "unknown model: $model (canary or parakeet)" >&2; exit 2 ;;
esac
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$NAME.tar.bz2"
out="${out:-${TMPDIR:-/tmp}/wambito-$model}"

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}
size() { wc -c <"$1" | tr -d ' '; }

mkdir -p "$out"
out="$(cd "$out" && pwd)"
if [ -n "$from" ]; then from="$(cd "$(dirname "$from")" && pwd)/$(basename "$from")"; fi
for tool in tar bzip2 zip curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing tool: $tool" >&2; exit 2; }
done
src="${from:-$out/$NAME.tar.bz2}"
if [ -z "$from" ] && { [ ! -f "$src" ] || [ "$(sha256 "$src")" != "$SRC_SHA256" ]; }; then
  curl -fL --retry 3 -o "$src" "$URL" || { echo "download failed: $URL" >&2; exit 2; }
fi
if [ "$(size "$src")" != "$SRC_SIZE" ] || [ "$(sha256 "$src")" != "$SRC_SHA256" ]; then
  echo "source archive does not match the pinned size/SHA-256: $src" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar -xjf "$src" -C "$work"

build() { # build <zip path>
  local zip="$1" stage
  stage="$(mktemp -d "$work/stage.XXXXXX")"
  mkdir "$stage/$NAME"
  for f in "${FILES[@]}"; do
    cp "$work/$NAME/$f" "$stage/$NAME/$f"
    TZ=UTC touch -t 202601010000 "$stage/$NAME/$f"
  done
  rm -f "$zip"
  (cd "$stage" && TZ=UTC zip -X -D -q "$zip" "${FILES[@]/#/$NAME/}")
}

zip_path="$out/$NAME.zip"
build "$zip_path"
sha="$(sha256 "$zip_path")"
if [ "$check" = 1 ]; then
  build "$work/second.zip"
  sha2="$(sha256 "$work/second.zip")"
  if [ "$sha" != "$sha2" ]; then
    echo "not reproducible: $sha != $sha2" >&2
    exit 1
  fi
  echo "reproducible: two builds, same SHA-256"
fi

unzipped=0
for f in "${FILES[@]}"; do unzipped=$((unzipped + $(size "$work/$NAME/$f"))); done
echo "zip:           $zip_path"
echo "bytes:         $(size "$zip_path")"
echo "unzippedBytes: $unzipped"
echo "sha256:        $sha"
