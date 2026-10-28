#!/usr/bin/env bash
# MORPHOSPACE XServer sync helper — use ONLY for a separately hosted XServer copy.
# Configure these paths in your server-side cron/task runner; no privileged user required.
set -euo pipefail
umask 022

: "${MORPHOSPACE_REPO_DIR:?Set MORPHOSPACE_REPO_DIR to the server-side git clone directory}"
: "${MORPHOSPACE_DOCROOT:?Set MORPHOSPACE_DOCROOT to the web document root}"
repo="$(cd "$MORPHOSPACE_REPO_DIR" && pwd -P)"
docroot="$(cd "$MORPHOSPACE_DOCROOT" && pwd -P)"

if [[ ! -d "$repo/.git" ]]; then
  echo "Not a git clone: $repo" >&2; exit 1
fi
if [[ ! -d "$docroot" || ! -x "$docroot" ]]; then
  echo "Missing or inaccessible web document root: $docroot" >&2; exit 1
fi
if [[ "$(git -C "$repo" remote get-url origin)" != *furuinu/morphospace* ]]; then
  echo "Unexpected origin. Refusing to pull another repository." >&2; exit 1
fi
if [[ "$(git -C "$repo" branch --show-current)" != "main" ]]; then
  echo "Expected main branch. Refusing to change an unknown checkout." >&2; exit 1
fi
git -C "$repo" pull --ff-only origin main

for file in index.html about-i18n.js; do
  if [[ ! -s "$repo/$file" ]]; then
    echo "Missing expected deployment file: $file" >&2; exit 1
  fi
done
if [[ "$repo" != "$docroot" ]]; then
  if [[ ! -w "$docroot" ]]; then
    echo "Document root is not writable by the deployment user: $docroot" >&2; exit 1
  fi
  # Copy the dependency before the referencing HTML; use 0644 (web-server readable).
  for file in about-i18n.js index.html; do
    temp="$(mktemp "$docroot/.morphospace.XXXXXXXX")"
    trap 'rm -f "${temp:-}"' EXIT
    install -m 0644 "$repo/$file" "$temp"
    mv -f "$temp" "$docroot/$file"
    trap - EXIT
  done
else
  # If the document root IS the git clone, the pull above already updated both.
  chmod 0644 "$docroot/index.html" "$docroot/about-i18n.js"
fi
if [[ ! -r "$docroot/index.html" || ! -r "$docroot/about-i18n.js" ]]; then
  echo "The site files must be readable by the web server." >&2; exit 1
fi
echo "MORPHOSPACE sync complete: $(git -C "$repo" rev-parse --short HEAD)"
