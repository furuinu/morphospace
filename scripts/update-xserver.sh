#!/bin/sh
# XServer Cron: refresh MORPHOSPACE from canonical main and repair web file permissions.
set -eu
SITE_DIR="${MORPHOSPACE_SITE_DIR:-$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)}"
cd "$SITE_DIR"
if [ ! -d .git ]; then
  echo "ERROR: no Git working tree in $SITE_DIR" >&2
  exit 1
fi
# Checkout-created public files must be readable by the web server.
umask 022
git pull --ff-only origin main
test -f index.html || { echo 'ERROR: index.html missing' >&2; exit 1; }
chmod 644 index.html
MODE=$(stat -c '%a' index.html 2>/dev/null || stat -f '%Lp' index.html)
test "$MODE" = 644 || { echo "ERROR: index.html mode $MODE, expected 644" >&2; exit 1; }
echo "MORPHOSPACE XServer update OK: index.html permission $MODE"
