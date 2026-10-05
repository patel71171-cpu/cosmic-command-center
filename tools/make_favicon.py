"""Generate a SENTINEL favicon (shield mark) as a multi-size .ico.

The previous public/favicon.ico was the Lovable heart, still cached by
browsers. This draws the same shield glyph the app uses (lucide "shield-check")
in the product's violet, and writes standard 16/32/48/64/128/256 frames so
browsers pick a crisp size instead of downscaling a 256px bitmap.

Usage:
    python tools/make_favicon.py
"""
import io
import os
import struct

from PIL import Image, ImageDraw

OUT_ICO = os.path.join("public", "favicon.ico")
OUT_PNG = os.path.join("public", "favicon-256.png")

# Brand violet, matching --primary in src/styles.css (oklch(.72 .19 305)).
VIOLET = (168, 108, 240, 255)
BG = (18, 16, 28, 0)  # transparent

SIZES = [16, 32, 48, 64, 128, 256]


def draw_shield(size: int) -> Image.Image:
    """Draw the shield-check glyph at `size` px on a transparent canvas."""
    # Render large, then downscale for smoother edges.
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), BG)
    d = ImageDraw.Draw(img)

    # Shield outline, in unit coordinates scaled to the canvas.
    def p(x, y):
        return (x * s, y * s)

    # Shield: flat top, tapering to a rounded point.
    top = 0.14
    shoulder = 0.52
    tip = 0.90
    left = 0.17
    right = 0.83
    mid = 0.5

    shield = [
        p(left, top),
        p(mid, top - 0.06),
        p(right, top),
        p(right, shoulder),
        p(mid, tip),
        p(left, shoulder),
    ]
    d.polygon(shield, fill=VIOLET)

    # Check mark, cut out in the background colour so it reads at 16px.
    stroke = max(2, int(0.085 * s))
    check = [p(0.36, 0.50), p(0.47, 0.62), p(0.66, 0.38)]
    d.line(check, fill=(20, 16, 30, 255), width=stroke, joint="curve")

    # Round the two top corners by drawing a small notch back in bg? Keep it
    # simple: the polygon already reads as a shield at icon sizes.
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    frames = [draw_shield(n) for n in SIZES]

    biggest = frames[-1]
    biggest.save(OUT_PNG, format="PNG")
    print("wrote %s (%dx%d)" % (OUT_PNG, biggest.width, biggest.height))

    # Pillow writes a proper multi-image .ico from a list of sizes.
    frames[0].save(OUT_ICO, format="ICO", sizes=[(n, n) for n in SIZES])
    print("wrote %s with sizes %s" % (OUT_ICO, SIZES))


if __name__ == "__main__":
    main()
