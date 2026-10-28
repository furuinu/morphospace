#!/bin/sh
# MORPHOSPACE XServer pull deployment. Run by cron on the XServer host.
set -eu
umask 077
REPO="furuinu/morphospace"
WORKFLOW="deploy-pages.yml"
TARGET="/home/hakatamasala/masalakitchen.jp/public_html/morphospace.masalakitchen.jp"
API="https://api.github.com/repos/$REPO"
LOG_PREFIX="[morphospace-deploy]"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
[ -d "$TARGET" ] || { echo "$LOG_PREFIX document root missing" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || exit 1
command -v python3 >/dev/null 2>&1 || { echo "$LOG_PREFIX python3 required" >&2; exit 1; }
TMP="$(mktemp -d)" || exit 1
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
# Fetch only the most recent successful main-branch Pages workflow run.
curl -fsSL --connect-timeout 10 --max-time 35 \
  -H 'Accept: application/vnd.github+json' \
  -H 'User-Agent: morphospace-xserver-pull-deploy' \
  "$API/actions/workflows/$WORKFLOW/runs?branch=main&status=success&per_page=1" > "$TMP/runs.json"
python3 - "$TMP/runs.json" "$TMP/sha" <<'PY'
import json, re, sys
data=json.load(open(sys.argv[1]))
runs=data.get("workflow_runs", [])
if not runs: raise SystemExit("No successful Pages workflow run")
run=runs[0]
sha=run.get("head_sha", "")
if run.get("head_branch")!="main" or run.get("conclusion")!="success" or not re.fullmatch(r"[a-f0-9]{40}",sha):
    raise SystemExit("Invalid successful workflow run")
open(sys.argv[2],"w").write(sha)
PY
SHA="$(cat "$TMP/sha")"
CURRENT="$TARGET/.morphospace-deployed-sha"
[ "$(cat "$CURRENT" 2>/dev/null || true)" = "$SHA" ] && exit 0
# Download the exact immutable revision validated by Actions.
curl -fsSL --connect-timeout 10 --max-time 60 \
  -H 'User-Agent: morphospace-xserver-pull-deploy' \
  "https://raw.githubusercontent.com/$REPO/$SHA/index.html" > "$TMP/index.html"
python3 - "$TMP/index.html" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
b=p.read_bytes()
if len(b)<100000 or b"MORPHOSPACE" not in b or b"<html" not in b.lower():
    raise SystemExit("Downloaded HTML failed validation")
if b'data-bundled="voice-styles.js"' not in b or b'data-bundled="surface-reaction.js"' not in b:
    raise SystemExit("Standalone deployment missing embedded voice or surface modules")
if b'<script src=' in b or b'<script type="module" src=' in b:
    raise SystemExit("Standalone deployment references non-synced external scripts")
PY
# Preserve existing index on failure; no deletion of other site files.
cp -p "$TARGET/index.html" "$TARGET/.morphospace-index-backup.html" 2>/dev/null || true
cp "$TMP/index.html" "$TARGET/.morphospace-index-next.html"
chmod 644 "$TARGET/.morphospace-index-next.html"
mv -f "$TARGET/.morphospace-index-next.html" "$TARGET/index.html"
printf '%s\n' "$SHA" > "$TMP/deployed-sha"
cp "$TMP/deployed-sha" "$TARGET/.morphospace-deployed-sha"
chmod 644 "$TARGET/.morphospace-deployed-sha"
echo "$LOG_PREFIX deployed $SHA"
