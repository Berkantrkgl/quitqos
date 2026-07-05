#!/usr/bin/env bash
# ============================================================================
# QuitQOS — brand asset build. Rasterizes the canonical "Orbit Q" (N2) SVGs
# into every PNG the Expo config needs, for Android + iOS + web.
# Source of truth: the *.svg in this folder. Re-run after editing any master.
#   Usage: bash build-icons.sh
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

SRC="$(pwd)"
OUT="../../../assets/images"   # mobile/assets/images
DENSITY=1200                    # high supersample so arcs/strokes stay crisp

render () {  # render <src.svg> <WxH> <out.png>
  convert -background none -density "$DENSITY" "$SRC/$1" -resize "$2" -unsharp 0x0.5 "$OUT/$3"
  echo "  ✓ $3  ($2)"
}
render_bg () { # render_bg <src.svg> <WxH> <out.png> <hexbg> — flatten onto a solid bg
  convert -background "$4" -density "$DENSITY" "$SRC/$1" -resize "$2" -flatten "$OUT/$3"
  echo "  ✓ $3  ($2, bg $4)"
}

echo "iOS / general icon (white bg, full bleed):"
render icon-full-light.svg 1024x1024 icon.png

echo "Android adaptive icon:"
render adaptive-foreground.svg 1024x1024 android-icon-foreground.png
render adaptive-background.svg 1024x1024 android-icon-background.png
render monochrome.svg          1024x1024 android-icon-monochrome.png

echo "Splash mark (transparent, Expo composites over bg color):"
render splash-mark.svg 512x512 splash-icon.png

echo "Web favicon (white bg for browser tabs):"
render_bg icon-full-light.svg 96x96 favicon.png "#FBFDFC"

echo "Done."
