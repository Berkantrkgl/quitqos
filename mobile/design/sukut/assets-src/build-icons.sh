#!/usr/bin/env bash
# ============================================================================
# QuitQOS — brand asset build. Rasterizes the canonical "Twin Rings" SVGs into
# every PNG the Expo config needs, for Android + iOS + web.
# Source of truth: the *.svg in this folder. Re-run after editing any master.
#   Usage: bash build-icons.sh
#
# NB: uses rsvg-convert (librsvg), NOT ImageMagick's SVG delegate. The mark uses
# linearGradient strokes + an feGaussianBlur amber glow; ImageMagick's MSVG
# delegate silently drops both (renders grayscale/empty). librsvg renders them
# correctly. Install with `brew install librsvg`. ImageMagick (`magick`) is still
# used for the final flatten/compose steps.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

SRC="$(pwd)"
OUT="../../../assets/images"   # mobile/assets/images

render () {  # render <src.svg> <px> <out.png> — transparent, square
  rsvg-convert -w "$2" -h "$2" "$SRC/$1" -o "$OUT/$3"
  echo "  ✓ $3  (${2}px)"
}
render_bg () { # render_bg <src.svg> <px> <out.png> <hexbg> — flatten onto a solid bg
  rsvg-convert -w "$2" -h "$2" "$SRC/$1" -o "$OUT/.tmp.png"
  magick "$OUT/.tmp.png" -background "$4" -flatten "$OUT/$3"
  rm -f "$OUT/.tmp.png"
  echo "  ✓ $3  (${2}px, bg $4)"
}

echo "iOS / general icon (light teal-tint bg, full bleed):"
render icon-full-light.svg 1024 icon.png

echo "Android adaptive icon:"
render adaptive-foreground.svg 1024 android-icon-foreground.png
render adaptive-background.svg 1024 android-icon-background.png
render monochrome.svg          1024 android-icon-monochrome.png

echo "Splash mark (transparent, Expo composites over bg color):"
render splash-mark.svg      512 splash-icon.png
render splash-mark-dark.svg 512 splash-icon-dark.png

echo "Web favicon (icon already carries its light bg):"
render icon-full-light.svg 96 favicon.png

echo "Done."
