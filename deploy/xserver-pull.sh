#!/bin/sh
# MORPHOSPACE XServer pull deployment. Keep the existing cron command unchanged.
# Pull only the latest successful GitHub Pages release; download both site files
# from that exact, immutable commit. No Git clone, SSH, or Node.js required.
set -eu
umask 077
REPO="furuinu/morphospace"
WORKFLOW="deploy-pages.yml"
TARGET="/home/hakatamasala/masalakitchen.jp/public_html/morphospace.masalakitchen.jp"
API="https://api.github.com/repos/$REPO"
LOG_PREFIX="[morphospace-deploy]"
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
echo "$LOG_PREFIX cron invoked at $(date)"
[ -d "$TARGET" ] && [ -w "$TARGET" ] && [ -x "$TARGET" ] || {
  echo "$LOG_PREFIX document root missing or inaccessible: $TARGET" >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || { echo "$LOG_PREFIX curl required" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "$LOG_PREFIX python3 required" >&2; exit 1; }
TMP="$(mktemp -d)" || exit 1
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

# Preserve the previous release gate: never deploy unvalidated main commits.
curl -fsSL --connect-timeout 10 --max-time 35 \
  -H 'Accept: application/vnd.github+json' \
  -H 'User-Agent: morphospace-xserver-pull-deploy' \
  "$API/actions/workflows/$WORKFLOW/runs?branch=main&status=success&per_page=1" > "$TMP/runs.json"
python3 - "$TMP/runs.json" "$TMP/sha" <<'PY'
import json, re, sys
data = json.load(open(sys.argv[1], encoding='utf-8'))
runs = data.get('workflow_runs', [])
if not runs:
    raise SystemExit('No successful Pages workflow run')
run = runs[0]
sha = run.get('head_sha', '')
if (run.get('head_branch') != 'main' or run.get('conclusion') != 'success'
        or not re.fullmatch(r'[a-f0-9]{40}', sha)):
    raise SystemExit('Invalid successful workflow run')
with open(sys.argv[2], 'w', encoding='ascii') as out:
    out.write(sha)
PY
SHA="$(cat "$TMP/sha")"
CURRENT="$TARGET/.morphospace-deployed-sha"
if [ "$(cat "$CURRENT" 2>/dev/null || true)" = "$SHA" ] \
   && [ -s "$TARGET/index.html" ] && [ -r "$TARGET/index.html" ] \
   && [ -s "$TARGET/about-i18n.js" ] && [ -r "$TARGET/about-i18n.js" ] \
   && grep -q "MorphospaceAboutI18n" "$TARGET/about-i18n.js"; then
  echo "$LOG_PREFIX up to date: $SHA (both files present)"
  exit 0
fi

# Fetch both files from the SAME successful commit, not from moving main.
for file in about-i18n.js index.html; do
  curl -fsSL --connect-timeout 10 --max-time 60 \
    -H 'User-Agent: morphospace-xserver-pull-deploy' \
    "https://raw.githubusercontent.com/$REPO/$SHA/$file" > "$TMP/$file"
done

# Validate the complete release before writing anything into public_html.
python3 - "$TMP/index.html" "$TMP/about-i18n.js" <<'PY'
from html.parser import HTMLParser
from pathlib import Path
import sys
html = Path(sys.argv[1]).read_bytes()
js = Path(sys.argv[2]).read_bytes()
if len(html) < 100000 or b'MORPHOSPACE' not in html or b'<html' not in html.lower():
    raise SystemExit('Downloaded HTML failed validation')
if b'data-bundled="surface-reaction.js"' not in html:
    raise SystemExit('Embedded surface module is missing')
if b'<script data-bundled="voice-styles.js"' in html:
    raise SystemExit('Experimental voice preset code must not execute')
if len(js) < 5000 or b'MorphospaceAboutI18n' not in js or b'DICTIONARY' not in js:
    raise SystemExit('About translation JavaScript failed validation')
class ScriptSources(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            src = dict(attrs).get('src')
            if src is not None:
                self.sources.append(src)
parser = ScriptSources()
parser.feed(html.decode('utf-8'))
if parser.sources != ['about-i18n.js']:
    raise SystemExit(f'Unexpected external JavaScript: {parser.sources!r}')
PY

# Stage BOTH files first. A failed download/validation never changes the site.
# Write the JS before the HTML so a newly published HTML never lacks its dependency.
cp "$TMP/about-i18n.js" "$TARGET/.morphospace-i18n-next.js"
cp "$TMP/index.html" "$TARGET/.morphospace-index-next.html"
chmod 644 "$TARGET/.morphospace-i18n-next.js" "$TARGET/.morphospace-index-next.html"
# Retain one backup of each previous version (if present).
[ ! -f "$TARGET/index.html" ] || cp -p "$TARGET/index.html" "$TARGET/.morphospace-index-backup.html"
[ ! -f "$TARGET/about-i18n.js" ] || cp -p "$TARGET/about-i18n.js" "$TARGET/.morphospace-i18n-backup.js"
mv -f "$TARGET/.morphospace-i18n-next.js" "$TARGET/about-i18n.js"
mv -f "$TARGET/.morphospace-index-next.html" "$TARGET/index.html"
# Mark success only after both files have been placed and are web-server readable.
printf '%s\n' "$SHA" > "$TMP/deployed-sha"
cp "$TMP/deployed-sha" "$CURRENT"
chmod 644 "$CURRENT"
echo "$LOG_PREFIX deployed $SHA (index.html + about-i18n.js; permissions 644)"
