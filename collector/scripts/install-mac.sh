#!/bin/bash
# ── DASH Collector macOS Install ──────────────────────────────
# Removes quarantine attribute and ad-hoc signs the app so
# macOS Gatekeeper stops reporting it as "damaged".
#
# Usage:
#   1. Drag "DASH Collector.app" to /Applications (or anywhere)
#   2. Open Terminal, run:
#        bash /Volumes/DASH\ Collector/install-mac.sh
#   3. Launch DASH Collector normally
# ──────────────────────────────────────────────────────────────

set -euo pipefail

APP_NAME="DASH Collector.app"
APP_PATHS=(
  "/Applications/$APP_NAME"
  "$HOME/Applications/$APP_NAME"
  "$HOME/Desktop/$APP_NAME"
  "$HOME/Downloads/$APP_NAME"
)

# ── Locate app ────────────────────────────────────────────────
APP_PATH=""
for candidate in "${APP_PATHS[@]}"; do
  if [ -d "$candidate" ]; then
    APP_PATH="$candidate"
    break
  fi
done

if [ -z "$APP_PATH" ]; then
  echo ""
  echo "  DASH Collector not found in common locations."
  echo ""
  echo "  Please drag DASH Collector.app to /Applications first,"
  echo "  then re-run this script."
  echo ""
  echo "  Or specify the path manually:"
  echo "    bash install-mac.sh /path/to/DASH Collector.app"
  echo ""
  exit 1
fi

# Allow manual path override
if [ "${1:-}" != "" ] && [ -d "$1" ]; then
  APP_PATH="$1"
fi

echo ""
echo "  ── DASH Collector Installer ──"
echo ""
echo "  Found: $APP_PATH"
echo ""

# ── Step 1: Remove quarantine ─────────────────────────────────
echo "  [1/2] Removing quarantine attribute..."
xattr -cr "$APP_PATH" 2>/dev/null || true
echo "        Done."

# ── Step 2: Ad-hoc codesign ──────────────────────────────────
echo "  [2/2] Signing app (ad-hoc)..."
codesign --force --deep --sign - "$APP_PATH" 2>/dev/null
if [ $? -eq 0 ]; then
  echo "        Done."
else
  echo "        Warning: codesign failed. App may still work after quarantine removal."
fi

echo ""
echo "  DASH Collector is ready. Launch it from Applications."
echo ""
