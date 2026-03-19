"""
Generate all Driftwave icon formats from docs/icon.svg.
Outputs to:
  docs/icon-*.png          (reference sizes)
  frontend/src-tauri/icons/ (Tauri required formats)

Usage:
  python3 scripts/generate_icons.py
"""
import os
import sys
from pathlib import Path

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("Missing deps. Run: pip3 install cairosvg Pillow --break-system-packages")
    sys.exit(1)

ROOT     = Path(__file__).parent.parent
SVG_PATH = ROOT / "docs" / "icon.svg"
TAURI    = ROOT / "frontend" / "src-tauri" / "icons"
DOCS     = ROOT / "docs"

TAURI.mkdir(parents=True, exist_ok=True)

svg_data = SVG_PATH.read_bytes()


def render_png(size: int) -> bytes:
    return cairosvg.svg2png(bytestring=svg_data, output_width=size, output_height=size)


def save_png(data: bytes, path: Path):
    path.write_bytes(data)
    print(f"  ✓ {path.relative_to(ROOT)}")


def make_ico(sizes=(256, 128, 64, 48, 32, 16)) -> bytes:
    images = []
    for s in sizes:
        png = render_png(s)
        img = Image.open(io.BytesIO(png)).convert("RGBA")
        images.append(img)
    buf = io.BytesIO()
    # largest first as base, rest appended — PIL handles multi-res ICO this way
    images[0].save(buf, format="ICO", append_images=images[1:])
    return buf.getvalue()


def make_icns() -> bytes:
    """Build a minimal ICNS with ic07 (128px) and ic08 (256px)."""
    ICNS_MAGIC = b"icns"

    def icns_entry(ostype: bytes, png_data: bytes) -> bytes:
        length = 8 + len(png_data)
        return ostype + length.to_bytes(4, "big") + png_data

    entries = b""
    entries += icns_entry(b"ic07", render_png(128))
    entries += icns_entry(b"ic08", render_png(256))
    entries += icns_entry(b"ic09", render_png(512))

    total = 8 + len(entries)
    return ICNS_MAGIC + total.to_bytes(4, "big") + entries


print("Generating Driftwave icons from docs/icon.svg...\n")

# ── Tauri required files ──────────────────────────────
save_png(render_png(32),  TAURI / "32x32.png")
save_png(render_png(128), TAURI / "128x128.png")
save_png(render_png(256), TAURI / "128x128@2x.png")

ico = make_ico()
(TAURI / "icon.ico").write_bytes(ico)
print(f"  ✓ frontend/src-tauri/icons/icon.ico")

icns = make_icns()
(TAURI / "icon.icns").write_bytes(icns)
print(f"  ✓ frontend/src-tauri/icons/icon.icns")

# ── Docs reference sizes ─────────────────────────────
print()
for size in (16, 32, 64, 128, 256, 512):
    save_png(render_png(size), DOCS / f"icon-{size}.png")

print("\nDone.")
